-- Green Bag model, stage 3 (2026-11-01): swipe-to-collect.
-- STATUS: applied to production on 2026-11-01 (recorded as version 20261101110702).
--
-- On the customer's order screen a full-screen "Collected" slider is swiped
-- in front of staff. collect_my_order marks the reservation completed (the
-- same status complete_pickup sets, so ratings, stats and the business
-- dashboard behave exactly as for a code verification) and stamps
-- customer_collected_at. undo_collect_my_order reverts it within 2 minutes.
-- The 6-digit code flow (complete_pickup) is unchanged and remains the
-- fallback described in the App Review notes.

begin;

alter table public.orders
  add column if not exists customer_collected_at timestamp with time zone;

comment on column public.orders.customer_collected_at is
  'Set when the customer confirmed the pickup with the in-app slider (2-minute undo window).';

create or replace function public.collect_my_order(p_order_id bigint)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order record;
  window_start timestamp with time zone;
  window_end timestamp with time zone;
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  select
    orders.id,
    orders.user_id,
    orders.status,
    orders.pickup_code,
    offers.pickup_date,
    offers.pickup_start,
    offers.pickup_end
  into target_order
  from public.orders
  join public.offers on offers.id = orders.offer_id
  where orders.id = p_order_id
    and orders.user_id = (select auth.uid())
  for update of orders;

  if not found then
    raise exception 'Order not found';
  end if;

  if target_order.status = 'completed' then
    return 'already_collected';
  end if;

  if target_order.status not in ('reserved', 'confirmed') or target_order.pickup_code is null then
    raise exception 'Only reserved orders can be collected';
  end if;

  -- Swiping is meant for the counter: from one hour before the window opens
  -- until two hours after it closes (late pickups the business still honours).
  window_start := private.pickup_start_at(target_order.pickup_date, target_order.pickup_start::text) - interval '1 hour';
  window_end := private.pickup_end_at(target_order.pickup_date, target_order.pickup_end::text) + interval '2 hours';

  if now() < window_start or now() > window_end then
    raise exception 'Pickup window is not open';
  end if;

  update public.orders
  set
    status = 'completed',
    completed_at = timezone('utc'::text, now()),
    customer_collected_at = timezone('utc'::text, now())
  where id = p_order_id;

  update public.profiles
  set completed_pickup_count = completed_pickup_count + 1
  where id = target_order.user_id;

  perform private.apply_reliability_delta(target_order.user_id, 1);

  return 'collected';
end;
$$;

revoke all on function public.collect_my_order(bigint) from public, anon;
grant execute on function public.collect_my_order(bigint) to authenticated;

create or replace function public.undo_collect_my_order(p_order_id bigint)
returns text
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

  select id, user_id, status, customer_collected_at, rated_at
  into target_order
  from public.orders
  where orders.id = p_order_id
    and orders.user_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if target_order.status <> 'completed' or target_order.customer_collected_at is null then
    raise exception 'This order was not collected with the slider';
  end if;

  if target_order.rated_at is not null then
    raise exception 'A rated pickup cannot be undone';
  end if;

  if target_order.customer_collected_at < timezone('utc'::text, now()) - interval '2 minutes' then
    return 'undo_window_closed';
  end if;

  update public.orders
  set
    status = 'reserved',
    completed_at = null,
    customer_collected_at = null
  where id = p_order_id;

  update public.profiles
  set completed_pickup_count = greatest(completed_pickup_count - 1, 0)
  where id = target_order.user_id;

  perform private.apply_reliability_delta(target_order.user_id, -1);

  return 'reserved';
end;
$$;

revoke all on function public.undo_collect_my_order(bigint) from public, anon;
grant execute on function public.undo_collect_my_order(bigint) to authenticated;

commit;

-- Down (reversible):
-- begin;
-- drop function if exists public.undo_collect_my_order(bigint);
-- drop function if exists public.collect_my_order(bigint);
-- alter table public.orders drop column if exists customer_collected_at;
-- commit;
