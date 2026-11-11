-- Registry extract optional at business sign-up (owner decision, 2026-11-11).
-- STATUS: written 2026-11-11; to be applied by the owner in the SQL editor.
--
-- Not every business has the Public Registry extract at hand, and the admin
-- can check the company by its ID code on enreg.reestri.gov.ge instead.
--  - submit_business_application accepts a null extract path. A path that is
--    given must still be in the caller's own folder and exist in storage. A
--    resubmission without a file keeps the extract uploaded before.
--  - guard_business_approval no longer requires an extract. Name, verified
--    phone, payout IBAN and the IBAN-holder check are still required.

begin;

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

  if not private.is_valid_georgian_iban(clean_iban) then
    raise exception 'Enter a valid Georgian IBAN';
  end if;

  -- The extract is optional; a given path must be the caller's own upload.
  if nullif(btrim(coalesce(p_registry_extract_path, '')), '') is not null and (
    split_part(p_registry_extract_path, '/', 1) <> current_user_id::text
    or not exists (
      select 1
      from storage.objects
      where bucket_id = 'business-documents'
        and name = p_registry_extract_path
    )
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
    nullif(btrim(coalesce(p_registry_extract_path, '')), '')
  )
  on conflict (business_id) do update set
    legal_name = excluded.legal_name,
    id_code = excluded.id_code,
    legal_form = excluded.legal_form,
    owner_full_name = excluded.owner_full_name,
    verified_phone = excluded.verified_phone,
    registry_extract_path = coalesce(
      excluded.registry_extract_path,
      public.business_verifications.registry_extract_path
    ),
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

create or replace function private.guard_business_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  verification public.business_verifications%rowtype;
begin
  if (select auth.uid()) is null or new.approved is not true then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.approved is true then
    return new;
  end if;

  if new.is_review_demo or exists (
    select 1
    from private.business_verification_exempt
    where business_id = new.id
  ) then
    return new;
  end if;

  select * into verification
  from public.business_verifications
  where business_id = new.id;

  if not found
    or verification.owner_full_name is null
    or verification.verified_phone is null
  then
    raise exception 'Business verification is incomplete';
  end if;

  if not exists (
    select 1
    from public.business_payout_accounts
    where business_id = new.id
  ) then
    raise exception 'Business verification is incomplete';
  end if;

  if verification.iban_holder_confirmed_at is null then
    raise exception 'Confirm that the IBAN holder matches the legal name first';
  end if;

  return new;
end;
$$;

commit;
