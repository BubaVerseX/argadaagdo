-- Fix after 20261107130100_business_columns_private (2026-11-11).
-- STATUS: applied to production (Frankfurt) on 2026-11-11 by the owner in the
-- SQL editor, with his OK.
--
-- The "Approved business owners can upload offer images" policy on
-- storage.objects read public.businesses.owner_id directly. Since owner_id is
-- no longer readable by `authenticated`, every signed-in upload to any bucket
-- (registry extracts at business sign-up, avatars, offer images) failed with
-- "permission denied for table businesses". The check now runs inside a
-- security-definer helper; who may upload what is unchanged.

begin;

create or replace function private.can_upload_offer_image(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.businesses
    where 'business-' || businesses.id::text = p_folder
      and businesses.owner_id = (select auth.uid())
      and businesses.approved = true
  );
$$;

revoke all on function private.can_upload_offer_image(text) from public, anon;
grant execute on function private.can_upload_offer_image(text) to authenticated;

drop policy if exists "Approved business owners can upload offer images" on storage.objects;
create policy "Approved business owners can upload offer images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'offer-images'
  and private.can_upload_offer_image((storage.foldername(name))[1])
);

commit;

-- Down: restore the policy from 20261107100000_fix_offer_image_upload_policy
-- and drop function private.can_upload_offer_image(text).
