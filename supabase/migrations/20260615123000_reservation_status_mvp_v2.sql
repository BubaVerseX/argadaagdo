begin;

alter table public.orders
  alter column status set default 'reserved';

alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (
    status is not null
    and status in (
      'reserved',
      'confirmed',
      'collected',
      'completed',
      'cancelled',
      'refunded',
      'no_show'
    )
  );

create or replace function public.cancel_paid_order(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order record;
  cancellation_deadline timestamp with time zone;
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  perform public.process_expired_marketplace();

  select
    orders.id,
    orders.user_id,
    orders.offer_id,
    orders.status,
    orders.quantity_restored_at,
    offers.status as offer_status,
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

  cancellation_deadline := private.pickup_start_at(
    target_order.pickup_date,
    target_order.pickup_start::text
  ) - interval '2 hours';

  if now() > cancellation_deadline then
    raise exception 'Cancellation window has closed';
  end if;

  if target_order.quantity_restored_at is null then
    update public.offers
    set
      quantity = coalesce(quantity, 0) + 1,
      active = case
        when status = 'inactive' then false
        when status = 'expired' then false
        else true
      end,
      status = case
        when status = 'inactive' then 'inactive'
        when status = 'expired' then 'expired'
        else 'active'
      end
    where id = target_order.offer_id;
  end if;

  update public.orders
  set
    status = 'cancelled',
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
    orders.pickup_code,
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
    raise exception 'Not allowed to complete this order';
  end if;

  if private.pickup_end_at(
    target_order.pickup_date,
    target_order.pickup_end::text
  ) < now() then
    perform private.apply_no_show_order(p_order_id);
    return;
  end if;

  if target_order.pickup_code is null
    or target_order.pickup_code <> trim(p_pickup_code) then
    raise exception 'Invalid pickup code';
  end if;

  update public.orders
  set
    status = 'collected',
    completed_at = timezone('utc'::text, now())
  where id = p_order_id;

  update public.profiles
  set completed_pickup_count = completed_pickup_count + 1
  where id = target_order.user_id;

  perform private.apply_reliability_delta(target_order.user_id, 1);
end;
$$;

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

  if target_order.status not in ('completed', 'collected') then
    raise exception 'Only collected pickups can be rated';
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

revoke all on function public.cancel_paid_order(bigint)
from public, anon, authenticated;
revoke all on function public.complete_pickup(bigint, text)
from public, anon, authenticated;
revoke all on function public.rate_business(bigint, integer, text)
from public, anon, authenticated;

grant execute on function public.cancel_paid_order(bigint) to authenticated;
grant execute on function public.complete_pickup(bigint, text) to authenticated;
grant execute on function public.rate_business(bigint, integer, text) to authenticated;

commit;
