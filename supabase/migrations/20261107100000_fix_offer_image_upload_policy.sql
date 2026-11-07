-- Fix: businesses could not upload offer or template photos (2026-11-07).
-- STATUS: applied to production (Frankfurt) on 2026-11-07 with the owner's OK.
--
-- The policy from 20261106180000_audit_security_fixes compared the folder of
-- `name` inside a sub-select on public.businesses, so `name` resolved to
-- businesses.name (the shop name) instead of storage.objects.name (the file
-- path). Every upload was refused with 400. Qualify the column.

begin;

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
    where 'business-' || businesses.id::text = (storage.foldername(objects.name))[1]
      and businesses.owner_id = (select auth.uid())
      and businesses.approved = true
  )
);

commit;

-- Down: re-create the policy from 20261106180000 (broken, do not use).
