-- Business profile, business privacy and full business deletion (2026-11-07).
-- STATUS: applied to production (Frankfurt) on 2026-11-07 with the owner's OK.
--
-- Owner decision 6 + check-2 #17, #18:
-- 1. Profile: description, logo, cover photo and opening hours next to the
--    existing name, category (business_type) and address. Owners edit them
--    with update_my_business_profile(); pictures must live in the business's
--    own offer-images folder.
-- 2. Privacy: owners read their rows with get_my_businesses() and admins
--    with admin_list_businesses(); 20261107130100 then limits everyone else
--    to the public profile columns.
-- 3. Deletion: deleting a business account also removes its templates,
--    profile texts and pictures (the route removes the files), IBAN, staff
--    PINs and the owner's verification data. The legal name and ID code stay
--    with the order records for 6 years (retain_until), then
--    run_data_retention() deletes them. Rejected applications not sent again
--    lose their verification data, IBAN and registry extract after 90 days.

begin;

-- 1. Profile columns ------------------------------------------------------------------

alter table public.businesses
  add column if not exists description text,
  add column if not exists logo_url text,
  add column if not exists cover_url text,
  add column if not exists opening_hours jsonb,
  add column if not exists deleted_at timestamp with time zone;

alter table public.businesses
  drop constraint if exists businesses_description_length;
alter table public.businesses
  add constraint businesses_description_length
    check (description is null or char_length(description) <= 600);

-- {"1": {"open": "09:00", "close": "20:00"}, ..., "7": null}; 1 = Monday.
create or replace function private.valid_opening_hours(p_hours jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  day_key text;
  day_value jsonb;
begin
  if p_hours is null then
    return true;
  end if;
  if jsonb_typeof(p_hours) <> 'object' then
    return false;
  end if;
  for day_key, day_value in select key, value from jsonb_each(p_hours)
  loop
    if day_key !~ '^[1-7]$' then
      return false;
    end if;
    if jsonb_typeof(day_value) = 'null' then
      continue;
    end if;
    if jsonb_typeof(day_value) <> 'object'
      or coalesce(day_value ->> 'open', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or coalesce(day_value ->> 'close', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      or day_value ->> 'open' = day_value ->> 'close' then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

alter table public.businesses
  drop constraint if exists businesses_opening_hours_valid;
alter table public.businesses
  add constraint businesses_opening_hours_valid
    check (private.valid_opening_hours(opening_hours));

-- Pictures only from the business's own public folder (no outside URLs that
-- could track customers).
create or replace function private.is_own_business_image(p_business_id bigint, p_url text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_url is null
    or p_url ~ ('^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/offer-images/business-'
      || p_business_id::text || '/[A-Za-z0-9._-]+$');
$$;

alter table public.businesses
  drop constraint if exists businesses_profile_images_own_folder;
alter table public.businesses
  add constraint businesses_profile_images_own_folder
    check (
      private.is_own_business_image(id, logo_url)
      and private.is_own_business_image(id, cover_url)
    );

create or replace function public.update_my_business_profile(
  p_business_id bigint,
  p_name text,
  p_business_type text,
  p_address text,
  p_phone text,
  p_description text,
  p_logo_url text,
  p_cover_url text,
  p_opening_hours jsonb
)
returns setof public.businesses
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;
  if not exists (
    select 1 from public.businesses
    where id = p_business_id and owner_id = (select auth.uid()) and deleted_at is null
  ) then
    raise exception 'Not allowed to update this business';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 80 then
    raise exception 'Business name must be 2-80 characters';
  end if;
  if char_length(btrim(coalesce(p_address, ''))) not between 5 and 200 then
    raise exception 'Address must be 5-200 characters';
  end if;
  if p_phone is not null and btrim(p_phone) <> '' and btrim(p_phone) !~ '^\+?[0-9 ()-]{6,20}$' then
    raise exception 'Phone number is not valid';
  end if;

  return query
  update public.businesses
  set
    name = btrim(p_name),
    business_type = coalesce(nullif(btrim(coalesce(p_business_type, '')), ''), 'Other'),
    address = btrim(p_address),
    phone = nullif(btrim(coalesce(p_phone, '')), ''),
    description = nullif(btrim(coalesce(p_description, '')), ''),
    logo_url = nullif(btrim(coalesce(p_logo_url, '')), ''),
    cover_url = nullif(btrim(coalesce(p_cover_url, '')), ''),
    opening_hours = case when p_opening_hours = '{}'::jsonb then null else p_opening_hours end
  where id = p_business_id
  returning *;
end;
$$;

-- 2. Who can read what ----------------------------------------------------------------

-- Guests may read the new public profile columns right away. The column
-- restriction for everyone else is 20261107130100_business_columns_private.sql
-- (applied after the website reads through these functions).
grant select (description, logo_url, cover_url, opening_hours) on table public.businesses to anon;

-- The owner's own businesses, every column.
create or replace function public.get_my_businesses()
returns setof public.businesses
language sql
stable
security definer
set search_path = ''
as $$
  select businesses.*
  from public.businesses
  where businesses.owner_id = (select auth.uid())
    and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.role = 'business'
    )
  order by businesses.id desc;
$$;

create or replace function public.admin_list_businesses()
returns setof public.businesses
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Admins only';
  end if;
  return query select * from public.businesses order by id desc;
end;
$$;

revoke all on function public.update_my_business_profile(bigint, text, text, text, text, text, text, text, jsonb) from public, anon;
revoke all on function public.get_my_businesses() from public, anon;
revoke all on function public.admin_list_businesses() from public, anon;
grant execute on function public.update_my_business_profile(bigint, text, text, text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.get_my_businesses() to authenticated;
grant execute on function public.admin_list_businesses() to authenticated;

-- 3. Deletion and retention ------------------------------------------------------------

alter table public.business_verifications
  add column if not exists retain_until timestamp with time zone;

create or replace function public.anonymize_account_for_deletion(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owned_ids bigint[];
begin
  if p_user_id is null then
    raise exception 'User is required';
  end if;

  perform 1 from public.profiles where id = p_user_id for update;

  if exists (
    select 1
    from public.orders
    where orders.user_id = p_user_id
      and orders.status in ('pending_payment', 'reserved', 'confirmed', 'refund_pending')
  ) then
    raise exception 'Account has active reservations';
  end if;

  if exists (
    select 1
    from public.orders
    join public.offers on offers.id = orders.offer_id
    join public.businesses on businesses.id = offers.business_id
    where businesses.owner_id = p_user_id
      and orders.status in ('pending_payment', 'reserved', 'confirmed', 'refund_pending')
  ) then
    raise exception 'Business has active reservations';
  end if;

  select coalesce(array_agg(id), '{}') into owned_ids
  from public.businesses where owner_id = p_user_id;

  -- Businesses: hide, detach and strip; keep the rows the orders point to.
  update public.offers
  set
    active = false,
    status = case when status in ('active', 'sold_out') then 'inactive' else status end
  where business_id = any (owned_ids);

  delete from public.bag_templates where business_id = any (owned_ids);
  delete from public.business_payout_accounts where business_id = any (owned_ids);
  delete from private.department_staff_pins
  where department_id in (select id from public.departments where business_id = any (owned_ids));
  update public.departments set has_staff_pin = false where business_id = any (owned_ids);

  update public.business_verifications
  set
    owner_full_name = null,
    verified_phone = null,
    registry_extract_path = null,
    retain_until = coalesce(retain_until, timezone('utc'::text, now()) + interval '6 years')
  where business_id = any (owned_ids);

  update public.businesses
  set
    owner_id = null,
    approved = false,
    phone = null,
    address = '',
    description = null,
    logo_url = null,
    cover_url = null,
    opening_hours = null,
    latitude = null,
    longitude = null,
    deleted_at = coalesce(deleted_at, timezone('utc'::text, now()))
  where id = any (owned_ids);

  -- Accounting records: keep, strip the person.
  update public.orders
  set
    user_id = null,
    customer_deleted_at = coalesce(customer_deleted_at, timezone('utc'::text, now()))
  where user_id = p_user_id;

  update public.payments
  set user_id = null
  where user_id = p_user_id;

  update public.business_ratings
  set
    user_id = null,
    comment = null
  where user_id = p_user_id;

  delete from public.favorites
  where user_id = p_user_id;
end;
$$;

-- Daily (app/api/cron/data-retention). Returns the registry-extract files the
-- caller must remove from storage (SQL can't delete storage objects).
create or replace function public.run_data_retention()
returns table(registry_extract_path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    raise exception 'Only the scheduler can run data retention';
  end if;

  -- Rejected applications that were not sent again within 90 days.
  return query
  with expired as (
    select businesses.id
    from public.businesses
    where businesses.approved = false
      and businesses.rejected_at is not null
      and businesses.rejected_at < timezone('utc'::text, now()) - interval '90 days'
  ),
  removed as (
    delete from public.business_verifications
    where business_id in (select id from expired)
    returning business_verifications.registry_extract_path
  )
  select removed.registry_extract_path from removed
  where removed.registry_extract_path is not null;

  delete from public.business_payout_accounts
  where business_id in (
    select businesses.id
    from public.businesses
    where businesses.approved = false
      and businesses.rejected_at is not null
      and businesses.rejected_at < timezone('utc'::text, now()) - interval '90 days'
  );

  -- Deleted businesses: the legal name and ID code go after 6 years.
  delete from public.business_verifications
  where retain_until is not null
    and retain_until < timezone('utc'::text, now());
end;
$$;

revoke all on function public.run_data_retention() from public, anon, authenticated;
grant execute on function public.run_data_retention() to service_role;

commit;

-- Down: grant select on table public.businesses to anon, authenticated (then
-- re-apply the anon column list from 20261106190000); drop the new functions
-- and columns; restore anonymize_account_for_deletion from 20261016104337.
