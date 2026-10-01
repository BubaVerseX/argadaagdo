-- ArGadaagdo audit fixes (2026-10-01).
--
-- STATUS: written and tested on a local copy only. NOT yet applied to the
-- production database — apply only after review (Supabase SQL editor,
-- `supabase db push`, or the MCP apply_migration tool).
--
-- Deliberately does NOT touch create_provider_payment_order or
-- finalize_provider_payment: those depend on the BOG-vs-TBC decision.
--
-- What this changes (live behavior today → after):
--  1. mark_order_no_show compared only the time of day, so a business could
--     no-show tomorrow's reservation tonight. → compares the full pickup end.
--  2. cancel_paid_order re-activated offers the business had paused or that
--     had expired. → keeps 'inactive' / 'expired'.
--  3. Abandoned checkouts held stock until the once-a-day cron. →
--     process_expired_marketplace (run on every page load and before every
--     checkout) also releases unpaid holds older than 40 minutes (longer
--     than the 20-minute bank page, so a hold is never released while the
--     customer can still pay).
--  4. Automatic no-shows fired the second the window ended. → 30-minute
--     grace period. (A business can still mark a no-show manually as soon
--     as the window ends.)
--  5. Two parallel checkouts could create two holds for the same offer. →
--     unique index: one active order per customer per offer.
--  6. Pickup times are text columns; one malformed value made the expiry
--     function fail, which broke every checkout. → format CHECKs. Also
--     price > 0, quantity >= 0, old price > 0.
--  7. Offers could not be deleted at all (no policy), and the repo's earlier
--     policy (20260615120000) would have cascade-deleted paid orders and
--     payment records. → delete allowed only for offers with no orders.
--  8. An approved owner could change owner_id (hand the business to an
--     unvetted account). → only admins/service role can change owner_id or
--     approved.
--  9. Pending owners could not correct their application. → they can
--     update their own pending business (approval stays admin-only).
-- 10. Businesses could read the profile (email) of anyone who ever started
--     a checkout on their offers. → only customers with a paid reservation
--     (orders that received a pickup code).
-- 11. complete_pickup and rate_business are re-declared exactly as they run
--     in production, so replaying the repo no longer installs the older
--     06-15/06-16 versions (rate_business there writes to a `ratings` table
--     that doesn't exist in production).

begin;

-- 1. No-show only after the full pickup end timestamp (date + time) ----------
create or replace function public.mark_order_no_show(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order record;
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  select
    orders.id,
    orders.user_id,
    orders.offer_id,
    orders.status,
    offers.pickup_date,
    offers.pickup_end
  into target_order
  from public.orders
  join public.offers on offers.id = orders.offer_id
  where orders.id = p_order_id
    and orders.status = 'reserved'
  for update of orders;

  if not found then
    raise exception 'Reserved order not found';
  end if;

  if not ((select private.is_admin()) or (select private.owns_offer(target_order.offer_id))) then
    raise exception 'Not allowed to mark this order no-show';
  end if;

  if target_order.pickup_end is null then
    raise exception 'Pickup end is missing';
  end if;

  if private.pickup_end_at(
    target_order.pickup_date,
    target_order.pickup_end::text
  ) >= now() then
    raise exception 'Pickup window has not ended yet';
  end if;

  update public.orders
  set
    status = 'no_show',
    no_show_at = timezone('utc'::text, now())
  where id = p_order_id;

  update public.profiles
  set no_show_count = no_show_count + 1
  where id = target_order.user_id;

  perform private.apply_reliability_delta(target_order.user_id, -15);
end;
$$;

revoke all on function public.mark_order_no_show(bigint) from public, anon;
grant execute on function public.mark_order_no_show(bigint) to authenticated;

-- 2. Customer cancellation keeps paused/expired offers off sale --------------
create or replace function public.cancel_paid_order(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order record;
  pickup_datetime timestamp with time zone;
  cancellation_deadline timestamp with time zone;
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  select
    orders.id,
    orders.user_id,
    orders.offer_id,
    orders.status,
    orders.quantity_restored_at,
    offers.pickup_date,
    offers.pickup_start
  into target_order
  from public.orders
  join public.offers on offers.id = orders.offer_id
  where orders.id = p_order_id
    and orders.user_id = (select auth.uid())
  for update of orders;

  if not found then
    raise exception 'Order not found';
  end if;

  if target_order.status <> 'reserved' then
    raise exception 'Only reserved orders can be cancelled';
  end if;

  if target_order.pickup_start is null then
    raise exception 'Pickup start is missing';
  end if;

  pickup_datetime := private.pickup_start_at(
    target_order.pickup_date,
    target_order.pickup_start::text
  );
  cancellation_deadline := pickup_datetime - interval '2 hours';

  if now() > cancellation_deadline then
    raise exception 'Cancellation window has closed';
  end if;

  if target_order.quantity_restored_at is null then
    update public.offers
    set
      quantity = coalesce(quantity, 0) + 1,
      active = case
        when status in ('inactive', 'expired') then false
        else true
      end,
      status = case
        when status in ('inactive', 'expired') then status
        else 'active'
      end
    where id = target_order.offer_id;
  end if;

  update public.orders
  set
    status = 'refunded',
    cancelled_at = timezone('utc'::text, now()),
    cancelled_reason = 'customer_cancelled_before_deadline',
    quantity_restored_at = coalesce(
      quantity_restored_at,
      timezone('utc'::text, now())
    )
  where id = p_order_id;

  update public.payments
  set
    status = 'refunded',
    refunded_at = timezone('utc'::text, now())
  where order_id = p_order_id
    and status = 'paid';

  update public.profiles
  set cancelled_order_count = cancelled_order_count + 1
  where id = target_order.user_id;

  perform private.apply_reliability_delta(target_order.user_id, -2);
end;
$$;

revoke all on function public.cancel_paid_order(bigint) from public, anon;
grant execute on function public.cancel_paid_order(bigint) to authenticated;

-- 3 + 4. Release stale unpaid holds; grace period before automatic no-show ---
create or replace function public.process_expired_marketplace()
returns table(expired_offers integer, no_show_orders integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_offer_count integer := 0;
  no_show_order_count integer := 0;
  reserved_order record;
begin
  -- Unpaid checkouts older than 40 minutes give their box back. Runs before
  -- the sold-out/expiry updates below so a released box is counted again.
  perform public.expire_pending_provider_payments(40);

  update public.offers
  set
    active = false,
    status = 'sold_out'
  where coalesce(status, 'active') = 'active'
    and coalesce(quantity, 0) <= 0;

  update public.offers
  set
    active = false,
    quantity = 0,
    status = 'expired'
  where coalesce(status, 'active') in ('active', 'sold_out')
    and private.pickup_end_at(pickup_date, pickup_end::text) < now();

  get diagnostics expired_offer_count = row_count;

  for reserved_order in
    select
      orders.id,
      orders.user_id
    from public.orders
    join public.offers on offers.id = orders.offer_id
    where orders.status = 'reserved'
      and private.pickup_end_at(offers.pickup_date, offers.pickup_end::text)
        < now() - interval '30 minutes'
  loop
    update public.orders
    set
      status = 'no_show',
      no_show_at = coalesce(no_show_at, timezone('utc'::text, now()))
    where id = reserved_order.id
      and status = 'reserved';

    if found then
      no_show_order_count := no_show_order_count + 1;

      update public.profiles
      set no_show_count = no_show_count + 1
      where id = reserved_order.user_id;

      perform private.apply_reliability_delta(reserved_order.user_id, -15);
    end if;
  end loop;

  return query select expired_offer_count, no_show_order_count;
end;
$$;

revoke all on function public.process_expired_marketplace() from public;
grant execute on function public.process_expired_marketplace() to anon, authenticated;

-- 5. One active order per customer per offer ---------------------------------
create unique index if not exists orders_one_active_per_user_offer
on public.orders (user_id, offer_id)
where status in ('pending_payment', 'reserved', 'confirmed');

-- 6. Data checks on offers ----------------------------------------------------
alter table public.offers drop constraint if exists offers_pickup_start_format;
alter table public.offers
  add constraint offers_pickup_start_format
  check (
    pickup_start is null
    or pickup_start = ''
    or pickup_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
  );

alter table public.offers drop constraint if exists offers_pickup_end_format;
alter table public.offers
  add constraint offers_pickup_end_format
  check (
    pickup_end is null
    or pickup_end = ''
    or pickup_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
  );

alter table public.offers drop constraint if exists offers_price_positive;
alter table public.offers
  add constraint offers_price_positive check (price > 0);

alter table public.offers drop constraint if exists offers_quantity_non_negative;
alter table public.offers
  add constraint offers_quantity_non_negative
  check (quantity is null or quantity >= 0);

alter table public.offers drop constraint if exists offers_old_price_positive;
alter table public.offers
  add constraint offers_old_price_positive
  check (old_price is null or old_price > 0);

-- 7. Offers can be deleted only while they have no orders --------------------
create or replace function private.offer_has_orders(p_offer_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders
    where orders.offer_id = p_offer_id
  );
$$;

revoke all on function private.offer_has_orders(bigint) from public, anon, authenticated;
grant execute on function private.offer_has_orders(bigint) to authenticated;

grant delete on public.offers to authenticated;

drop policy if exists "Approved business owners can delete own offers"
on public.offers;

drop policy if exists "Approved business owners can delete own offers without orders"
on public.offers;

create policy "Approved business owners can delete own offers without orders"
on public.offers
for delete
to authenticated
using (
  (select private.owns_approved_business(offers.business_id))
  and not (select private.offer_has_orders(offers.id))
);

-- 8. Only admins (or the service role) change owner_id / approved -------------
create or replace function private.guard_business_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    new.owner_id is distinct from old.owner_id
    or new.approved is distinct from old.approved
  )
    and (select auth.uid()) is not null
    and not (select private.is_admin())
  then
    raise exception 'Only admins can change business ownership or approval';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_business_update() from public, anon, authenticated;

drop trigger if exists businesses_guard_update on public.businesses;
create trigger businesses_guard_update
before update on public.businesses
for each row
execute function private.guard_business_update();

-- 9. Pending owners can correct their own application -----------------------
drop policy if exists "Owners can update pending businesses"
on public.businesses;

create policy "Owners can update pending businesses"
on public.businesses
for update
to authenticated
using (
  owner_id = (select auth.uid())
  and approved = false
)
with check (
  owner_id = (select auth.uid())
  and approved = false
);

-- 10. Businesses see only customers with a paid reservation ------------------
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
      and orders.pickup_code is not null
      and businesses.owner_id = (select auth.uid())
      and businesses.approved = true
      and owner_profiles.role = 'business'
  );
$$;

-- 11. Match production: complete_pickup and rate_business as they run live --
create or replace function public.complete_pickup(
  p_order_id bigint,
  p_pickup_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order record;
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  select
    orders.id,
    orders.user_id,
    orders.offer_id,
    orders.status,
    orders.pickup_code
  into target_order
  from public.orders
  where orders.id = p_order_id
    and orders.status = 'reserved'
  for update;

  if not found then
    raise exception 'Reserved order not found';
  end if;

  if not ((select private.is_admin()) or (select private.owns_offer(target_order.offer_id))) then
    raise exception 'Not allowed to complete this order';
  end if;

  if target_order.pickup_code is null
    or target_order.pickup_code <> trim(p_pickup_code) then
    raise exception 'Invalid pickup code';
  end if;

  update public.orders
  set
    status = 'completed',
    completed_at = timezone('utc'::text, now())
  where id = p_order_id;

  update public.profiles
  set completed_pickup_count = completed_pickup_count + 1
  where id = target_order.user_id;

  perform private.apply_reliability_delta(target_order.user_id, 1);
end;
$$;

revoke all on function public.complete_pickup(bigint, text) from public, anon;
grant execute on function public.complete_pickup(bigint, text) to authenticated;

create or replace function public.rate_business(
  p_order_id bigint,
  p_rating integer,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order record;
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  if p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;

  select
    orders.id,
    orders.user_id,
    orders.offer_id,
    orders.status,
    orders.rated_at,
    offers.business_id
  into target_order
  from public.orders
  join public.offers on offers.id = orders.offer_id
  where orders.id = p_order_id
    and orders.user_id = (select auth.uid())
  for update of orders;

  if not found then
    raise exception 'Order not found';
  end if;

  if target_order.status <> 'completed' then
    raise exception 'Only completed pickups can be rated';
  end if;

  if target_order.rated_at is not null then
    raise exception 'This order has already been rated';
  end if;

  insert into public.business_ratings (
    order_id,
    business_id,
    user_id,
    rating,
    comment
  )
  values (
    p_order_id,
    target_order.business_id,
    (select auth.uid()),
    p_rating,
    nullif(trim(p_comment), '')
  );

  update public.orders
  set rated_at = timezone('utc'::text, now())
  where id = p_order_id;
end;
$$;

revoke all on function public.rate_business(bigint, integer, text) from public, anon;
grant execute on function public.rate_business(bigint, integer, text) to authenticated;

commit;
