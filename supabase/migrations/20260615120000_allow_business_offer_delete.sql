grant delete on public.offers to authenticated;

drop policy if exists "Approved business owners can delete own offers"
on public.offers;

create policy "Approved business owners can delete own offers"
on public.offers
for delete
to authenticated
using ((select private.owns_approved_business(offers.business_id)));
