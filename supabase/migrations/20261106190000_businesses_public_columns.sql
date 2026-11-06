-- Guests see only public business columns (audit #22, 2026-11-06).
-- STATUS: applied to production (Frankfurt) on 2026-11-06 with the owner's OK,
-- after the app stopped selecting owner_id / * as a guest.
--
-- owner_id, platform_fee_rate, rejected_at and rejection_reason are no longer
-- readable with the public key. phone stays public on purpose: it is the
-- shop's contact number shown on the business page, editable by the owner.
-- Signed-in users keep table-level SELECT (owners and admins need every
-- column; RLS still limits rows).

begin;

revoke select on public.businesses from anon;
grant select (
  id,
  name,
  business_type,
  address,
  phone,
  approved,
  created_at,
  is_review_demo,
  sales_paused_on,
  latitude,
  longitude
) on public.businesses to anon;

commit;

-- Down: grant select on public.businesses to anon;
