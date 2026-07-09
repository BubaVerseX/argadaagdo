-- Tracks an RLS policy that was already applied directly to the live
-- database but was missing from migration history (same drift pattern
-- documented in PROJECT_CONTEXT.md for the BOG payment RPCs).
--
-- "Approved business owners can update own business" already exists live
-- and already works (verified against the QA business account before
-- writing this migration). This migration changes no behavior — it just
-- makes the policy reproducible from a clean migration replay.

begin;

drop policy if exists "Approved business owners can update own business"
on public.businesses;

create policy "Approved business owners can update own business"
on public.businesses
for update
to authenticated
using ((select private.owns_approved_business(businesses.id)))
with check ((select private.owns_approved_business(businesses.id)));

commit;
