begin;

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
      'expired',
      'cancelled',
      'refunded',
      'no_show'
    )
  );

create or replace function public.process_expired_marketplace()
returns table(expired_offers integer, no_show_orders integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_offer_count integer := 0;
  expired_order_count integer := 0;
begin
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
  where pickup_date is not null
    and coalesce(status, 'active') in ('active', 'sold_out')
    and private.pickup_end_at(pickup_date, pickup_end::text) < now();

  get diagnostics expired_offer_count = row_count;

  update public.orders
  set status = 'expired'
  from public.offers
  where orders.offer_id = offers.id
    and orders.status in ('reserved', 'confirmed')
    and private.pickup_end_at(
      coalesce(
        offers.pickup_date,
        timezone('Asia/Tbilisi'::text, orders.created_at)::date
      ),
      offers.pickup_end::text
    ) < now();

  get diagnostics expired_order_count = row_count;

  return query select expired_offer_count, expired_order_count;
end;
$$;

revoke all on function public.process_expired_marketplace()
from public, anon, authenticated;
grant execute on function public.process_expired_marketplace()
to anon, authenticated;

create or replace function public.mock_pay_and_reserve_offer(p_offer_id bigint)
returns table(order_id bigint, payment_id bigint, pickup_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_offer record;
  active_reservation_count integer;
  new_order_id bigint;
  new_payment_id bigint;
  new_pickup_code text;
  order_amount numeric(10, 2);
  order_platform_fee numeric(10, 2);
  order_business_amount numeric(10, 2);
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  perform public.process_expired_marketplace();

  if not exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'customer'
      and reliability_status <> 'restricted'
  ) then
    raise exception 'Only unrestricted customer accounts can reserve offers';
  end if;

  select count(*)
  into active_reservation_count
  from public.orders
  where user_id = (select auth.uid())
    and status = 'reserved';

  if active_reservation_count >= 3 then
    raise exception 'You can have at most 3 active reservations';
  end if;

  select
    offers.id,
    offers.price,
    offers.quantity,
    offers.active,
    offers.status,
    offers.pickup_date,
    offers.pickup_start,
    offers.pickup_end,
    businesses.approved
  into selected_offer
  from public.offers
  join public.businesses on businesses.id = offers.business_id
  where offers.id = p_offer_id
    and offers.active = true
    and coalesce(offers.status, 'active') = 'active'
    and (
      offers.pickup_date is null
      or private.pickup_end_at(offers.pickup_date, offers.pickup_end::text) > now()
    )
    and businesses.approved = true
  for update of offers;

  if not found then
    raise exception 'Offer is not available';
  end if;

  if coalesce(selected_offer.quantity, 0) <= 0 then
    raise exception 'Offer sold out';
  end if;

  order_amount := round(coalesce(selected_offer.price::numeric, 0), 2);
  order_platform_fee := round(order_amount * 0.10, 2);
  order_business_amount := round(order_amount - order_platform_fee, 2);
  new_pickup_code := floor(100000 + random() * 900000)::text;

  insert into public.orders (
    user_id,
    offer_id,
    status,
    payment_method,
    pickup_code,
    amount,
    platform_fee,
    business_amount
  )
  values (
    (select auth.uid()),
    p_offer_id,
    'reserved',
    'mock_online',
    new_pickup_code,
    order_amount,
    order_platform_fee,
    order_business_amount
  )
  returning id into new_order_id;

  insert into public.payments (
    order_id,
    user_id,
    offer_id,
    amount,
    platform_fee,
    business_amount,
    status,
    provider,
    provider_reference
  )
  values (
    new_order_id,
    (select auth.uid()),
    p_offer_id,
    order_amount,
    order_platform_fee,
    order_business_amount,
    'paid',
    'mock',
    'mock_' || new_order_id::text || '_' || extract(epoch from now())::bigint::text
  )
  returning id into new_payment_id;

  update public.offers
  set
    quantity = quantity - 1,
    active = case when quantity - 1 > 0 then true else false end,
    status = case when quantity - 1 > 0 then 'active' else 'sold_out' end
  where id = p_offer_id;

  return query select new_order_id, new_payment_id, new_pickup_code;
end;
$$;

revoke all on function public.mock_pay_and_reserve_offer(bigint)
from public, anon, authenticated;
grant execute on function public.mock_pay_and_reserve_offer(bigint)
to authenticated;

commit;
