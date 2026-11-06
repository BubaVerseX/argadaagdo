-- Business verification and phone verification, part 1 of 2 (2026-11-05).
-- STATUS: NOT applied to production. Ask the founder first.
--
-- Additive and safe to apply before the app code: nobody is blocked from
-- ordering by this file. public.phone_verification_required() returns false
-- here. Part 2 (20261105120100_enforce_phone_verification.sql) turns on the
-- customer requirement, once SMS delivery works in production.
--
-- What this adds:
--  - business_verifications: legal details for each application. A separate
--    table because every column of an approved row in public.businesses is
--    publicly readable.
--  - A private business-documents bucket for the Public Registry extract.
--    Owners can upload but not read; only admins can read.
--  - submit_business_application: the only way to apply. Saves the business,
--    legal details, IBAN and first bag template in one transaction.
--  - An approval guard: a business can't be approved until its details are
--    complete and an admin has confirmed the IBAN holder matches the legal
--    name. Businesses approved before this migration are exempt.
--
-- New businesses get the default platform_fee_rate from the column default;
-- submit_business_application never sets it, and approval has no fee step.

begin;

-- 1. Validation helpers ---------------------------------------------------------
-- Georgian IBAN at TBC Bank: 22 characters, GEkkTB + 16 digits, mod-97 checksum.
create or replace function private.is_valid_tbc_iban(p_iban text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  rearranged text;
  remainder integer := 0;
  character_value text;
  index_position integer;
  digit_position integer;
begin
  if p_iban is null or p_iban !~ '^GE[0-9]{2}TB[0-9]{16}$' then
    return false;
  end if;

  rearranged := substr(p_iban, 5) || substr(p_iban, 1, 4);

  for index_position in 1..length(rearranged) loop
    character_value := substr(rearranged, index_position, 1);

    if character_value ~ '[A-Z]' then
      character_value := (ascii(character_value) - 55)::text;
    end if;

    for digit_position in 1..length(character_value) loop
      remainder :=
        (remainder * 10 + substr(character_value, digit_position, 1)::integer) % 97;
    end loop;
  end loop;

  return remainder = 1;
end;
$$;

revoke all on function private.is_valid_tbc_iban(text) from public, anon, authenticated;

-- The user's confirmed phone, or null. auth.users.phone is unique, which is
-- what enforces one account per phone number.
create or replace function private.verified_phone(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select users.phone::text
  from auth.users as users
  where users.id = p_user_id
    and users.phone is not null
    and users.phone <> ''
    and users.phone_confirmed_at is not null;
$$;

revoke all on function private.verified_phone(uuid) from public, anon, authenticated;

-- Off until part 2 replaces it. Checkout and the profile ask this function, so
-- the customer interface and the database rule switch on together.
create or replace function public.phone_verification_required()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select false;
$$;

revoke all on function public.phone_verification_required() from public, anon;
grant execute on function public.phone_verification_required() to authenticated;

-- 2. Legal details ---------------------------------------------------------------
create table if not exists public.business_verifications (
  business_id bigint primary key references public.businesses (id) on delete cascade,
  -- Nullable: account deletion removes the personal fields and keeps the
  -- company's legal name and code for payout records.
  legal_name text not null check (length(btrim(legal_name)) between 2 and 160),
  id_code text not null check (id_code ~ '^([0-9]{9}|[0-9]{11})$'),
  legal_form text not null
    check (legal_form in ('ie', 'llc', 'jsc', 'gp', 'lp', 'cooperative', 'nnle', 'other')),
  owner_full_name text check (owner_full_name is null or length(btrim(owner_full_name)) between 3 and 120),
  verified_phone text,
  registry_extract_path text,
  submitted_at timestamp with time zone not null default timezone('utc'::text, now()),
  iban_holder_confirmed_at timestamp with time zone,
  iban_holder_confirmed_by uuid references auth.users (id) on delete set null
);

alter table public.business_verifications enable row level security;
revoke all on table public.business_verifications from public, anon, authenticated;
grant select on table public.business_verifications to authenticated;
grant select, insert, update, delete on table public.business_verifications to service_role;

drop policy if exists "Owners can view own verification" on public.business_verifications;
create policy "Owners can view own verification"
on public.business_verifications
for select
to authenticated
using (
  exists (
    select 1
    from public.businesses
    where businesses.id = business_verifications.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

drop policy if exists "Admins can view verifications" on public.business_verifications;
create policy "Admins can view verifications"
on public.business_verifications
for select
to authenticated
using ((select private.is_admin()));

-- Businesses approved before verification existed, and the App Review demo.
create table if not exists private.business_verification_exempt (
  business_id bigint primary key references public.businesses (id) on delete cascade,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table private.business_verification_exempt enable row level security;
revoke all on table private.business_verification_exempt from public, anon, authenticated;

insert into private.business_verification_exempt (business_id)
select id
from public.businesses
where approved is true or is_review_demo
on conflict do nothing;

-- 3. Registry extracts ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-documents',
  'business-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Files live under <owner user id>/. No update or delete policy: a resubmission
-- uploads a new file.
drop policy if exists "Business accounts can upload own documents" on storage.objects;
create policy "Business accounts can upload own documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'business-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'business'
  )
);

drop policy if exists "Admins can read business documents" on storage.objects;
create policy "Admins can read business documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'business-documents'
  and (select private.is_admin())
);

-- 4. Applying --------------------------------------------------------------------
-- Replaces the browser's direct insert, so an application is complete or absent.
drop policy if exists "Owners can register pending businesses" on public.businesses;
drop policy if exists "Business owners can insert businesses" on public.businesses;

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
  phone text;
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

  phone := private.verified_phone(current_user_id);

  if phone is null then
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
      phone = '+' || phone,
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
      '+' || phone,
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
    phone,
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

revoke all on function public.submit_business_application(
  text, text, text, text, text, text, text, text, text,
  text, text, text, numeric, numeric, integer, text, text
) from public, anon;
grant execute on function public.submit_business_application(
  text, text, text, text, text, text, text, text, text,
  text, text, text, numeric, numeric, integer, text, text
) to authenticated;

-- 5. Admin review -----------------------------------------------------------------
-- The IBAN table is service-role only, so admins read it through this function.
create or replace function public.admin_list_business_verifications()
returns table (
  business_id bigint,
  legal_name text,
  id_code text,
  legal_form text,
  owner_full_name text,
  verified_phone text,
  phone_still_verified boolean,
  iban text,
  registry_extract_path text,
  submitted_at timestamp with time zone,
  iban_holder_confirmed_at timestamp with time zone,
  is_exempt boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Only admins can review business verification';
  end if;

  return query
  select
    businesses.id,
    verifications.legal_name,
    verifications.id_code,
    verifications.legal_form,
    verifications.owner_full_name,
    verifications.verified_phone,
    private.verified_phone(businesses.owner_id) is not null,
    payouts.iban,
    verifications.registry_extract_path,
    verifications.submitted_at,
    verifications.iban_holder_confirmed_at,
    exempt.business_id is not null
  from public.businesses
  left join public.business_verifications as verifications
    on verifications.business_id = businesses.id
  left join public.business_payout_accounts as payouts
    on payouts.business_id = businesses.id
  left join private.business_verification_exempt as exempt
    on exempt.business_id = businesses.id
  where businesses.approved is not true;
end;
$$;

revoke all on function public.admin_list_business_verifications() from public, anon;
grant execute on function public.admin_list_business_verifications() to authenticated;

create or replace function public.admin_confirm_iban_holder(
  p_business_id bigint,
  p_confirmed boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Only admins can review business verification';
  end if;

  update public.business_verifications
  set
    iban_holder_confirmed_at = case when p_confirmed then timezone('utc'::text, now()) end,
    iban_holder_confirmed_by = case when p_confirmed then (select auth.uid()) end
  where business_id = p_business_id;

  return found;
end;
$$;

revoke all on function public.admin_confirm_iban_holder(bigint, boolean) from public, anon;
grant execute on function public.admin_confirm_iban_holder(bigint, boolean) to authenticated;

-- 6. Approval guard ---------------------------------------------------------------
-- The service role (no auth.uid) can still approve, like the other guards.
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
    or verification.registry_extract_path is null
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

revoke all on function private.guard_business_approval() from public, anon, authenticated;

drop trigger if exists businesses_guard_approval on public.businesses;
create trigger businesses_guard_approval
before insert or update of approved on public.businesses
for each row execute function private.guard_business_approval();

commit;
