-- Fix after 20261107130100_business_columns_private (2026-11-07).
-- STATUS: applied to production (Frankfurt) on 2026-11-07 with the owner's OK.
--
-- Two policies read public.businesses.owner_id directly. Since owner_id is no
-- longer readable by `authenticated`, every signed-in SELECT on
-- business_ratings and business_verifications failed with
-- "permission denied for table businesses" (admin page, business dashboard
-- ratings, business registration status). The checks now run inside
-- security-definer helpers; who may read what is unchanged.

begin;

-- Owner of a business (approved or not): for the registration status page.
create or replace function private.owns_business(p_business_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.businesses
    where businesses.id = p_business_id
      and businesses.owner_id = (select auth.uid())
  );
$$;

revoke all on function private.owns_business(bigint) from public, anon;
grant execute on function private.owns_business(bigint) to authenticated;

-- Same rule as before (approved business, owner with the business role).
drop policy if exists "Business owners can view ratings for own businesses"
  on public.business_ratings;
create policy "Business owners can view ratings for own businesses"
  on public.business_ratings
  for select
  to authenticated
  using ((select private.owns_approved_business(business_ratings.business_id)));

drop policy if exists "Owners can view own verification"
  on public.business_verifications;
create policy "Owners can view own verification"
  on public.business_verifications
  for select
  to authenticated
  using ((select private.owns_business(business_verifications.business_id)));

commit;

-- Down: recreate both policies with the direct EXISTS on public.businesses
-- (only works if owner_id is readable again) and drop private.owns_business.
