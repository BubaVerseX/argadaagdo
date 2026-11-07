-- ArGadaagdo role consistency hardening:
-- Business permissions require both:
--   1. profiles.role = 'business'
--   2. ownership of the relevant approved business
--
-- This migration intentionally does not update any live user roles or rows.

begin;

create or replace function private.has_approved_business()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.businesses
    join public.profiles on profiles.id = businesses.owner_id
    where businesses.owner_id = (select auth.uid())
      and businesses.approved = true
      and profiles.role = 'business'
  );
$$;

create or replace function private.owns_approved_business(p_business_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.businesses
    join public.profiles on profiles.id = businesses.owner_id
    where businesses.id = p_business_id
      and businesses.owner_id = (select auth.uid())
      and businesses.approved = true
      and profiles.role = 'business'
  );
$$;

create or replace function private.owns_offer(p_offer_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.offers
    join public.businesses on businesses.id = offers.business_id
    join public.profiles on profiles.id = businesses.owner_id
    where offers.id = p_offer_id
      and businesses.owner_id = (select auth.uid())
      and businesses.approved = true
      and profiles.role = 'business'
  );
$$;

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
      and businesses.owner_id = (select auth.uid())
      and businesses.approved = true
      and owner_profiles.role = 'business'
  );
$$;

revoke all on function private.has_approved_business()
from public, anon, authenticated;
revoke all on function private.owns_approved_business(bigint)
from public, anon, authenticated;
revoke all on function private.owns_offer(bigint)
from public, anon, authenticated;
revoke all on function private.business_can_view_customer(uuid)
from public, anon, authenticated;

grant execute on function private.has_approved_business()
to authenticated;
grant execute on function private.owns_approved_business(bigint)
to authenticated;
grant execute on function private.owns_offer(bigint)
to authenticated;
grant execute on function private.business_can_view_customer(uuid)
to authenticated;

drop policy if exists "Owners can view their businesses"
on public.businesses;

create policy "Owners can view their businesses"
on public.businesses
for select
to authenticated
using (
  owner_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'business'
  )
);

drop policy if exists "Owners can register pending businesses"
on public.businesses;

create policy "Owners can register pending businesses"
on public.businesses
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and approved = false
  and exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'business'
  )
);

drop policy if exists "Business owners can view ratings for own businesses"
on public.business_ratings;

create policy "Business owners can view ratings for own businesses"
on public.business_ratings
for select
to authenticated
using (
  exists (
    select 1
    from public.businesses
    join public.profiles on profiles.id = businesses.owner_id
    where businesses.id = business_ratings.business_id
      and businesses.owner_id = (select auth.uid())
      and businesses.approved = true
      and profiles.role = 'business'
  )
);

commit;
