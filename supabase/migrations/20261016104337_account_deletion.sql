-- In-app account deletion (2026-10-16). Required by Apple and Google.
--
-- STATUS: applied to production on 2026-10-16 (recorded as version
-- 20261016104337). Additive; the delete button only works once the app code
-- from the same change is deployed.
--
-- Orders and payments are accounting records, so they are anonymized, not
-- deleted. Before this migration, deleting a user cascaded
-- auth.users -> profiles -> orders -> payments (and business_ratings), and
-- deleting a business owner cascaded into businesses -> offers -> orders. The
-- foreign keys now SET NULL instead, so even a deletion made outside the app
-- (e.g. from the Supabase dashboard) keeps the records.
--
-- Flow (app/api/account/delete): the server calls
-- anonymize_account_for_deletion(user_id) with the service role, then deletes
-- the auth user, which removes the profile (email) and favorites.
--
-- What is kept vs stripped:
--  orders / payments: kept (amounts, fees, dates, statuses, bank reference);
--    user_id set to null and customer_deleted_at stamped.
--  business_ratings: star rating kept for the business's average; the
--    reviewer link and the free-text comment are removed.
--  favorites: deleted.
--  businesses owned by the user: kept for the accounting history but
--    detached (owner_id null), unapproved (hidden), offers switched off, and
--    the phone number removed. Payout IBAN rows are kept for reconciling
--    payouts already made.
-- Deletion is refused while the user has a reservation in progress, or (for
-- a business owner) while any of their offers has one, so nobody is left with
-- a paid order and no counterpart.

begin;

alter table public.orders
  add column if not exists customer_deleted_at timestamp with time zone;

alter table public.payments alter column user_id drop not null;
alter table public.business_ratings alter column user_id drop not null;

alter table public.orders drop constraint if exists orders_user_id_fkey;
alter table public.orders
  add constraint orders_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;

alter table public.payments drop constraint if exists payments_user_id_fkey;
alter table public.payments
  add constraint payments_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;

alter table public.business_ratings drop constraint if exists business_ratings_user_id_fkey;
alter table public.business_ratings
  add constraint business_ratings_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;

alter table public.businesses drop constraint if exists businesses_owner_id_fkey;
alter table public.businesses
  add constraint businesses_owner_id_fkey
  foreign key (owner_id) references public.profiles(id) on delete set null;

create or replace function public.anonymize_account_for_deletion(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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

  -- Businesses: hide and detach, keep the records.
  update public.offers
  set
    active = false,
    status = case when status in ('active', 'sold_out') then 'inactive' else status end
  where business_id in (
    select businesses.id from public.businesses where businesses.owner_id = p_user_id
  );

  update public.businesses
  set
    owner_id = null,
    approved = false,
    phone = null
  where owner_id = p_user_id;

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

-- Service role only; the API route checks who is asking.
revoke all on function public.anonymize_account_for_deletion(uuid) from public, anon, authenticated;

commit;
