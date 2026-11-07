-- Audit fixes (2026-11-06), from ~/Desktop/argadaagdo-audit/REPORT.md.
-- STATUS: applied to production (Frankfurt) on 2026-11-06 with the owner's OK.
--
-- 1. #3  submit_business_application: the local variable "phone" shadowed the
--        businesses.phone column, so a rejected business could never resubmit
--        ("column reference phone is ambiguous"). Renamed to v_phone.
-- 2. #8  Staff PIN lockout counted per caller-chosen device string, so a new
--        p_device on every try bypassed it. Failures now also count per IP
--        (10 per 15 min) and per department (30 per hour); unknown or
--        unapproved departments return 'pin_invalid' without touching the
--        attempts table (the FK error used to leak).
-- 3. #42 Leftover default write grants removed (RLS blocked them already).
-- 4. #38 Businesses see a customer's profile (email) only for reservations
--        from the last 30 days, not forever.
-- 5. #43 offer-images uploads are limited to the uploader's own
--        business-<id>/ folder.
-- 6. #23 private.sms_send_log + public.note_sms_send(): per-number,
--        per-account and daily caps for the Send-SMS hook (service role only).
-- Payments are untouched.

begin;

-- 1. Business application resubmit ---------------------------------------------
create or replace function public.submit_business_application(
  p_name text,
  p_business_type text,
  p_address text,
  p_legal_name text,
  p_id_code text,
  p_legal_form text,
  p_owner_full_name text,
  p_iban text,
  p_registry_extract_path text,
  p_bag_title text default null,
  p_bag_category text default null,
  p_bag_size text default null,
  p_bag_price numeric default null,
  p_bag_old_price numeric default null,
  p_bag_daily_quantity integer default null,
  p_bag_pickup_start text default null,
  p_bag_pickup_end text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  v_phone text;
  target_business public.businesses%rowtype;
  target_business_id bigint;
  default_department_id bigint;
  clean_iban text := upper(regexp_replace(coalesce(p_iban, ''), '\s', '', 'g'));
  clean_id_code text := btrim(coalesce(p_id_code, ''));
begin
  if current_user_id is null then
    raise exception 'Not logged in';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = current_user_id
      and role = 'business'
  ) then
    raise exception 'Only business accounts can register a business';
  end if;

  v_phone := private.verified_phone(current_user_id);

  if v_phone is null then
    raise exception 'Verify your phone number first';
  end if;

  if length(btrim(coalesce(p_name, ''))) not between 2 and 80
    or length(btrim(coalesce(p_business_type, ''))) not between 2 and 60
    or length(btrim(coalesce(p_address, ''))) not between 5 and 160
    or length(btrim(coalesce(p_legal_name, ''))) not between 2 and 160
    or length(btrim(coalesce(p_owner_full_name, ''))) not between 3 and 120
  then
    raise exception 'Please complete all company details';
  end if;

  if clean_id_code !~ '^([0-9]{9}|[0-9]{11})$' then
    raise exception 'Identification code must have 9 or 11 digits';
  end if;

  if not private.is_valid_tbc_iban(clean_iban) then
    raise exception 'Enter a valid TBC IBAN';
  end if;

  if split_part(coalesce(p_registry_extract_path, ''), '/', 1) <> current_user_id::text
    or not exists (
      select 1
      from storage.objects
      where bucket_id = 'business-documents'
        and name = p_registry_extract_path
    )
  then
    raise exception 'Upload the Public Registry extract first';
  end if;

  -- A rejected application is corrected and sent again, not filed twice.
  select *
  into target_business
  from public.businesses
  where owner_id = current_user_id
    and approved is not true
  order by rejected_at nulls first, id
  limit 1
  for update;

  if found and target_business.rejected_at is null then
    raise exception 'You already have a business application waiting for admin approval';
  end if;

  if found then
    target_business_id := target_business.id;

    update public.businesses
    set
      name = btrim(p_name),
      business_type = btrim(p_business_type),
      address = btrim(p_address),
      phone = '+' || v_phone,
      rejected_at = null,
      rejection_reason = null
    where id = target_business_id;
  else
    insert into public.businesses (owner_id, name, business_type, address, phone, approved)
    values (
      current_user_id,
      btrim(p_name),
      btrim(p_business_type),
      btrim(p_address),
      '+' || v_phone,
      false
    )
    returning id into target_business_id;
  end if;

  insert into public.business_verifications (
    business_id,
    legal_name,
    id_code,
    legal_form,
    owner_full_name,
    verified_phone,
    registry_extract_path
  )
  values (
    target_business_id,
    btrim(p_legal_name),
    clean_id_code,
    p_legal_form,
    btrim(p_owner_full_name),
    v_phone,
    p_registry_extract_path
  )
  on conflict (business_id) do update set
    legal_name = excluded.legal_name,
    id_code = excluded.id_code,
    legal_form = excluded.legal_form,
    owner_full_name = excluded.owner_full_name,
    verified_phone = excluded.verified_phone,
    registry_extract_path = excluded.registry_extract_path,
    submitted_at = timezone('utc'::text, now()),
    -- Changed details must be checked again.
    iban_holder_confirmed_at = null,
    iban_holder_confirmed_by = null;

  insert into public.business_payout_accounts (business_id, iban)
  values (target_business_id, clean_iban)
  on conflict (business_id) do update set
    iban = excluded.iban,
    updated_at = timezone('utc'::text, now());

  select id into default_department_id
  from public.departments
  where business_id = target_business_id and is_default
  limit 1;

  if default_department_id is null then
    insert into public.departments (business_id, name, is_default)
    values (target_business_id, 'Main', true)
    returning id into default_department_id;
  end if;

  -- First bag template. It stays inert until approval, because publishing
  -- requires an approved business.
  if not exists (
    select 1 from public.bag_templates where business_id = target_business_id
  ) then
    if p_bag_title is null then
      raise exception 'Please add your first bag';
    end if;

    insert into public.bag_templates (
      business_id,
      department_id,
      title,
      category,
      size,
      price,
      old_price,
      daily_quantity,
      pickup_start,
      pickup_end
    )
    values (
      target_business_id,
      default_department_id,
      btrim(p_bag_title),
      p_bag_category,
      p_bag_size,
      p_bag_price,
      p_bag_old_price,
      p_bag_daily_quantity,
      p_bag_pickup_start,
      p_bag_pickup_end
    );
  end if;

  return target_business_id;
end;
$$;

-- 2. Staff PIN lockout ---------------------------------------------------------
create or replace function private.bump_staff_counter(
  p_department_id bigint,
  p_key text,
  p_max integer,
  p_window interval
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempts integer;
begin
  insert into private.staff_pin_attempts (department_id, device_key, failed_attempts, last_attempt_at)
  values (p_department_id, p_key, 1, timezone('utc'::text, now()))
  on conflict (department_id, device_key) do update
    set failed_attempts = case
          -- Old failures expire, so a counter can't stay high forever.
          when private.staff_pin_attempts.last_attempt_at < timezone('utc'::text, now()) - p_window
            then 1
          else private.staff_pin_attempts.failed_attempts + 1
        end,
        last_attempt_at = excluded.last_attempt_at,
        locked_until = case
          when private.staff_pin_attempts.last_attempt_at >= timezone('utc'::text, now()) - p_window
            and private.staff_pin_attempts.failed_attempts + 1 >= p_max
            then timezone('utc'::text, now()) + interval '15 minutes'
          else private.staff_pin_attempts.locked_until
        end
  returning failed_attempts into attempts;

  return attempts >= p_max;
end;
$$;

revoke all on function private.bump_staff_counter(bigint, text, integer, interval) from public, anon, authenticated;

-- Counts one failure for the device, its IP and the whole department.
create or replace function private.note_staff_failure(p_department_id bigint, p_device_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked_device boolean;
  locked_ip boolean;
  locked_department boolean;
begin
  locked_device := private.bump_staff_counter(p_department_id, p_device_key, 5, interval '15 minutes');
  locked_ip := private.bump_staff_counter(
    p_department_id, 'ip|' || split_part(p_device_key, '|', 1), 10, interval '15 minutes'
  );
  locked_department := private.bump_staff_counter(p_department_id, 'department', 30, interval '1 hour');

  return locked_device or locked_ip or locked_department;
end;
$$;

-- Returns 'ok', 'pin_invalid', 'pin_locked' or 'rate_limited'. Never raises.
create or replace function private.check_staff_pin(p_department_id bigint, p_pin text, p_device text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pin_row record;
  attempt_row record;
  v_device_key text := private.staff_device_key(p_device);
  v_ip_key text := 'ip|' || split_part(private.staff_device_key(p_device), '|', 1);
begin
  -- Unknown or unapproved department: nothing to unlock, nothing to record.
  if not exists (
    select 1
    from public.departments
    join public.businesses on businesses.id = departments.business_id
    where departments.id = p_department_id
      and businesses.approved = true
  ) then
    return 'pin_invalid';
  end if;

  if exists (
    select 1
    from private.staff_pin_attempts
    where department_id = p_department_id
      and device_key in (v_device_key, v_ip_key, 'department')
      and locked_until is not null
      and locked_until > timezone('utc'::text, now())
  ) then
    return 'pin_locked';
  end if;

  select * into attempt_row
  from private.staff_pin_attempts
  where department_id = p_department_id and device_key = v_device_key
  for update;

  if found and attempt_row.last_attempt_at > timezone('utc'::text, now()) - interval '1 second' then
    update private.staff_pin_attempts
    set last_attempt_at = timezone('utc'::text, now())
    where department_id = p_department_id and device_key = v_device_key;
    return 'rate_limited';
  end if;

  select * into pin_row
  from private.department_staff_pins
  where department_id = p_department_id;

  if not found or pin_row.pin_hash <> extensions.crypt(coalesce(p_pin, ''), pin_row.pin_hash) then
    if private.note_staff_failure(p_department_id, v_device_key) then
      return 'pin_locked';
    end if;
    return 'pin_invalid';
  end if;

  -- A correct PIN clears this device's and this IP's counters, never the
  -- department-wide one (that only expires with time).
  delete from private.staff_pin_attempts
  where department_id = p_department_id
    and device_key in (v_device_key, v_ip_key);

  return 'ok';
end;
$$;

revoke all on function private.note_staff_failure(bigint, text) from public, anon, authenticated;
revoke all on function private.check_staff_pin(bigint, text, text) from public, anon, authenticated;

-- 3. Leftover default write grants ---------------------------------------------
revoke insert, update, delete on public.bag_templates from anon;
revoke insert, update, delete on public.departments from anon;
revoke update on public.orders from authenticated;

-- 4. Businesses see customers only for recent reservations ----------------------
create or replace function private.business_can_view_customer(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders
    join public.offers on offers.id = orders.offer_id
    join public.businesses on businesses.id = offers.business_id
    join public.profiles owner_profiles on owner_profiles.id = businesses.owner_id
    where orders.user_id = p_profile_id
      and orders.pickup_code is not null
      and (
        orders.status = 'reserved'
        or orders.created_at > timezone('utc'::text, now()) - interval '30 days'
      )
      and businesses.owner_id = (select auth.uid())
      and businesses.approved = true
      and owner_profiles.role = 'business'
  );
$$;

-- 5. offer-images: own business folder only --------------------------------------
drop policy if exists "Approved business owners can upload offer images" on storage.objects;

create policy "Approved business owners can upload offer images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'offer-images'
  and exists (
    select 1
    from public.businesses
    where 'business-' || businesses.id::text = (storage.foldername(name))[1]
      and businesses.owner_id = (select auth.uid())
      and businesses.approved = true
  )
);

-- 6. SMS caps for the Send-SMS hook ------------------------------------------------
create table if not exists private.sms_send_log (
  id bigint generated always as identity primary key,
  phone_hash text not null,
  account_hash text not null,
  sent_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists sms_send_log_phone_idx on private.sms_send_log (phone_hash, sent_at);
create index if not exists sms_send_log_account_idx on private.sms_send_log (account_hash, sent_at);
create index if not exists sms_send_log_sent_idx on private.sms_send_log (sent_at);

alter table private.sms_send_log enable row level security;
revoke all on table private.sms_send_log from public, anon, authenticated;

-- Records the send and returns 'ok', or why it is refused. Hashes only, so no
-- phone numbers or emails are stored. Caps: 5 per number and 8 per account per
-- 24 h, 300 per 24 h overall. Rows older than 7 days are dropped.
create or replace function public.note_sms_send(p_phone_hash text, p_account_hash text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  since timestamp with time zone := timezone('utc'::text, now()) - interval '24 hours';
begin
  delete from private.sms_send_log where sent_at < timezone('utc'::text, now()) - interval '7 days';

  if (select count(*) from private.sms_send_log where phone_hash = p_phone_hash and sent_at > since) >= 5 then
    return 'phone_limit';
  end if;

  if (select count(*) from private.sms_send_log where account_hash = p_account_hash and sent_at > since) >= 8 then
    return 'account_limit';
  end if;

  if (select count(*) from private.sms_send_log where sent_at > since) >= 300 then
    return 'daily_limit';
  end if;

  insert into private.sms_send_log (phone_hash, account_hash) values (p_phone_hash, p_account_hash);
  return 'ok';
end;
$$;

revoke all on function public.note_sms_send(text, text) from public, anon, authenticated;
grant execute on function public.note_sms_send(text, text) to service_role;

commit;

-- Down (manual): restore private.check_staff_pin / note_staff_failure from
-- 20261101113914_staff_pin_status.sql and business_can_view_customer from
-- 20261016101117_audit_fixes.sql; drop private.bump_staff_counter,
-- public.note_sms_send and private.sms_send_log; re-create the old
-- offer-images insert policy; re-grant the revoked privileges.
