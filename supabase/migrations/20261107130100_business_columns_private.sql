-- Business privacy, step 2 (check-2 #17, 2026-11-07).
-- STATUS: applied to production (Frankfurt) on 2026-11-07 with the owner's OK,
-- after the website switched to get_my_businesses / admin_list_businesses.
--
-- Guests and signed-in customers can read only the public profile columns.
-- owner_id, the owner's phone, the commission, the rejection reason and
-- deleted_at are no longer readable through the API.

begin;

revoke select on table public.businesses from anon, authenticated;
-- Older column grants (20261106190000) included the phone: drop them first.
revoke select (owner_id, phone, platform_fee_rate, rejection_reason, deleted_at)
  on table public.businesses from anon, authenticated;
grant select (
  id, name, business_type, address, approved, created_at, is_review_demo,
  latitude, longitude, sales_paused_on, rejected_at,
  description, logo_url, cover_url, opening_hours
) on table public.businesses to anon, authenticated;

commit;

-- Down: grant select on table public.businesses to authenticated; and grant the
-- anon column list from 20261106190000 back.
