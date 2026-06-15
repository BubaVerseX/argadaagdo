begin;

alter table public.offers
  add column if not exists pickup_date date not null default (
    timezone('Asia/Tbilisi'::text, now())::date
  );

alter table public.offers
  drop constraint if exists offers_status_check;

alter table public.offers
  add constraint offers_status_check
  check (
    status is not null
    and status in ('active', 'sold_out', 'expired', 'inactive')
  );

create index if not exists offers_pickup_date_idx
on public.offers (pickup_date);

create index if not exists offers_lifecycle_idx
on public.offers (status, active, pickup_date);

create or replace function private.pickup_start_at(
  p_pickup_date date,
  p_pickup_start text
)
returns timestamp with time zone
language sql
stable
set search_path = ''
as $$
  select (
    (
      coalesce(p_pickup_date, timezone('Asia/Tbilisi'::text, now())::date)
      + coalesce(nullif(p_pickup_start, '')::time, '00:00'::time)
    )::timestamp at time zone 'Asia/Tbilisi'
  );
$$;

create or replace function private.pickup_end_at(
  p_pickup_date date,
  p_pickup_end text
)
returns timestamp with time zone
language sql
stable
set search_path = ''
as $$
  select (
    (
      coalesce(p_pickup_date, timezone('Asia/Tbilisi'::text, now())::date)
      + coalesce(nullif(p_pickup_end, '')::time, '23:59'::time)
    )::timestamp at time zone 'Asia/Tbilisi'
  );
$$;

revoke all on function private.pickup_start_at(date, text)
from public, anon, authenticated;
revoke all on function private.pickup_end_at(date, text)
from public, anon, authenticated;

create or replace function private.reliability_status_for_score(p_score integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when greatest(least(coalesce(p_score, 100), 100), 0) >= 90 then 'excellent'
    when greatest(least(coalesce(p_score, 100), 100), 0) >= 75 then 'good'
    when greatest(least(coalesce(p_score, 100), 100), 0) >= 50 then 'warning'
    else 'restricted'
  end;
$$;

revoke all on function private.reliability_status_for_score(integer)
from public, anon, authenticated;

update public.profiles
set reliability_status = private.reliability_status_for_score(reliability_score)
where reliability_status is distinct from
  private.reliability_status_for_score(reliability_score);

create or replace function private.apply_no_show_order(p_order_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order record;
begin
  select
    orders.id,
    orders.user_id,
    offers.pickup_date,
    offers.pickup_end
  into target_order
  from public.orders
  join public.offers on offers.id = orders.offer_id
  where orders.id = p_order_id
    and orders.status = 'reserved'
  for update of orders;

  if not found then
    return false;
  end if;

  if private.pickup_end_at(
    target_order.pickup_date,
    target_order.pickup_end::text
  ) >= now() then
    return false;
  end if;

  update public.orders
  set
    status = 'no_show',
    no_show_at = coalesce(no_show_at, timezone('utc'::text, now()))
  where id = p_order_id
    and status = 'reserved';

  if not found then
    return false;
  end if;

  update public.profiles
  set no_show_count = no_show_count + 1
  where id = target_order.user_id;

  perform private.apply_reliability_delta(target_order.user_id, -15);

  return true;
end;
$$;

revoke all on function private.apply_no_show_order(bigint)
from public, anon, authenticated;

create or replace function public.process_expired_marketplace()
returns table(expired_offers integer, no_show_orders integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_count integer := 0;
  no_show_count integer := 0;
  reserved_order record;
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
  where coalesce(status, 'active') in ('active', 'sold_out')
    and private.pickup_end_at(pickup_date, pickup_end::text) < now();

  get diagnostics expired_count = row_count;

  for reserved_order in
    select orders.id, orders.offer_id
    from public.orders
    join public.offers on offers.id = orders.offer_id
    where orders.status = 'reserved'
      and private.pickup_end_at(offers.pickup_date, offers.pickup_end::text) < now()
  loop
    if (select auth.uid()) is not null
      and (
        (select private.is_admin())
        or (select private.owns_offer(reserved_order.offer_id))
      ) then
      perform public.mark_order_no_show(reserved_order.id);
      no_show_count := no_show_count + 1;
    elsif private.apply_no_show_order(reserved_order.id) then
      no_show_count := no_show_count + 1;
    end if;
  end loop;

  return query select expired_count, no_show_count;
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
    and private.pickup_end_at(offers.pickup_date, offers.pickup_end::text) > now()
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
    status = 'completed',
    completed_at = timezone('utc'::text, now())
  where id = p_order_id;

  update public.profiles
  set completed_pickup_count = completed_pickup_count + 1
  where id = target_order.user_id;

  perform private.apply_reliability_delta(target_order.user_id, 1);
end;
$$;

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
    orders.offer_id
  into target_order
  from public.orders
  where orders.id = p_order_id
    and orders.status = 'reserved'
  for update of orders;

  if not found then
    raise exception 'Reserved order not found';
  end if;

  if not ((select private.is_admin()) or (select private.owns_offer(target_order.offer_id))) then
    raise exception 'Not allowed to mark this order no-show';
  end if;

  if not private.apply_no_show_order(p_order_id) then
    raise exception 'Pickup window has not ended yet';
  end if;
end;
$$;

create or replace function public.get_business_rating_summary()
returns table(
  business_id bigint,
  average_rating numeric,
  rating_count bigint
)
language sql
security definer
set search_path = ''
as $$
  select
    business_ratings.business_id,
    round(avg(business_ratings.rating)::numeric, 2) as average_rating,
    count(*) as rating_count
  from public.business_ratings
  group by business_ratings.business_id;
$$;

revoke all on function public.mock_pay_and_reserve_offer(bigint)
from public, anon, authenticated;
revoke all on function public.cancel_paid_order(bigint)
from public, anon, authenticated;
revoke all on function public.complete_pickup(bigint, text)
from public, anon, authenticated;
revoke all on function public.mark_order_no_show(bigint)
from public, anon, authenticated;
revoke all on function public.get_business_rating_summary()
from public, anon, authenticated;

grant execute on function public.mock_pay_and_reserve_offer(bigint) to authenticated;
grant execute on function public.cancel_paid_order(bigint) to authenticated;
grant execute on function public.complete_pickup(bigint, text) to authenticated;
grant execute on function public.mark_order_no_show(bigint) to authenticated;
grant execute on function public.get_business_rating_summary() to anon, authenticated;

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

commit;
