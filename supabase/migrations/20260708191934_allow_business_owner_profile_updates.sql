-- Already applied to production on 2026-07-08 (outside this repo). Copied
-- verbatim from supabase_migrations.schema_migrations on 2026-10-01 so the
-- repository matches the live database. 20260710120000 re-creates the same
-- policy idempotently.

begin;

-- Business owners could view/insert their own business but had no UPDATE
-- policy, so the "Save profile" feature on the business dashboard
-- (direct .update() on public.businesses for name/business_type/address/phone)
-- silently failed for every business owner. Mirrors the existing
-- "Approved business owners can update own offers" policy on public.offers,
-- reusing the same private.owns_approved_business() helper.
create policy "Approved business owners can update own business"
on public.businesses
for update
to authenticated
using (private.owns_approved_business(businesses.id))
with check (private.owns_approved_business(businesses.id));

commit;
