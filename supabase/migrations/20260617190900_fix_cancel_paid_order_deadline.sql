begin;

-- Fix cancellation deadline calculation only.
-- Previous live logic compared only time-of-day, so tomorrow's reservations
-- could be blocked after today's cutoff hour. This version compares full
-- Asia/Tbilisi pickup datetimes using the existing private.pickup_start_at()
-- helper.
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
      active = true,
      status = 'active'
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

commit;
