begin;

create schema if not exists private;

alter table public.orders
  add column if not exists amount numeric(10, 2),
  add column if not exists platform_fee numeric(10, 2),
  add column if not exists business_amount numeric(10, 2),
  add column if not exists cancelled_at timestamp with time zone,
  add column if not exists cancelled_reason text,
  add column if not exists completed_at timestamp with time zone,
  add column if not exists no_show_at timestamp with time zone,
  add column if not exists rated_at timestamp with time zone,
  add column if not exists quantity_restored_at timestamp with time zone;

alter table public.profiles
  add column if not exists reliability_score integer not null default 100,
  add column if not exists reliability_status text not null default 'good',
  add column if not exists no_show_count integer not null default 0,
  add column if not exists completed_pickup_count integer not null default 0,
  add column if not exists cancelled_order_count integer not null default 0;

alter table public.offers
  add column if not exists description text,
  add column if not exists allergens text,
  add column if not exists status text not null default 'active';

update public.orders
set status = 'cancelled'
where status is null
  or status not in ('reserved', 'completed', 'cancelled', 'refunded', 'no_show');

update public.offers
set status = case
  when coalesce(quantity, 0) <= 0 then 'sold_out'
  when active = true then 'active'
  else 'inactive'
end
where status is null
  or status not in ('active', 'inactive', 'sold_out');

with calculated_order_amounts as (
  select
    orders.id,
    round(coalesce(orders.amount, offers.price::numeric, 0), 2) as amount
  from public.orders
  join public.offers on offers.id = orders.offer_id
)
update public.orders
set
  amount = calculated_order_amounts.amount,
  platform_fee = round(calculated_order_amounts.amount * 0.10, 2),
  business_amount = round(
    calculated_order_amounts.amount
    - round(calculated_order_amounts.amount * 0.10, 2),
    2
  )
from calculated_order_amounts
where orders.id = calculated_order_amounts.id
  and (
    orders.amount is null
    or orders.platform_fee is null
    or orders.business_amount is null
  );

alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (
    status is not null
    and status in ('reserved', 'completed', 'cancelled', 'refunded', 'no_show')
  );

alter table public.offers
  drop constraint if exists offers_status_check;

alter table public.offers
  add constraint offers_status_check
  check (
    status is not null
    and status in ('active', 'inactive', 'sold_out')
  );

alter table public.profiles
  drop constraint if exists profiles_reliability_status_check;

alter table public.profiles
  add constraint profiles_reliability_status_check
  check (
    reliability_status is not null
    and reliability_status in ('excellent', 'good', 'warning', 'restricted')
  );

alter table public.profiles
  drop constraint if exists profiles_reliability_score_check;

alter table public.profiles
  add constraint profiles_reliability_score_check
  check (reliability_score between 0 and 100);

create table if not exists public.payments (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  offer_id bigint not null references public.offers(id),
  amount numeric(10, 2) not null,
  platform_fee numeric(10, 2) not null,
  business_amount numeric(10, 2) not null,
  status text not null default 'paid',
  provider text not null default 'mock',
  provider_reference text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  refunded_at timestamp with time zone,
  constraint payments_order_id_key unique (order_id),
  constraint payments_amount_check check (amount >= 0),
  constraint payments_platform_fee_check check (platform_fee >= 0),
  constraint payments_business_amount_check check (business_amount >= 0),
  constraint payments_status_check check (
    status in ('paid', 'refunded', 'failed', 'cancelled')
  )
);

create table if not exists public.business_ratings (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  business_id bigint not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null,
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  constraint business_ratings_order_id_key unique (order_id),
  constraint business_ratings_rating_check check (rating between 1 and 5)
);

create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_user_status_idx on public.orders (user_id, status);
create index if not exists payments_order_id_idx on public.payments (order_id);
create index if not exists payments_user_id_idx on public.payments (user_id);
create index if not exists payments_offer_id_idx on public.payments (offer_id);
create index if not exists payments_status_idx on public.payments (status);
create index if not exists business_ratings_business_id_idx on public.business_ratings (business_id);
create index if not exists business_ratings_user_id_idx on public.business_ratings (user_id);
create index if not exists business_ratings_order_id_idx on public.business_ratings (order_id);
create index if not exists offers_status_idx on public.offers (status);

create or replace function private.reliability_status_for_score(p_score integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when greatest(least(coalesce(p_score, 100), 100), 0) >= 100 then 'excellent'
    when greatest(least(coalesce(p_score, 100), 100), 0) >= 80 then 'good'
    when greatest(least(coalesce(p_score, 100), 100), 0) >= 60 then 'warning'
    else 'restricted'
  end;
$$;

create or replace function private.apply_reliability_delta(
  p_user_id uuid,
  p_delta integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_score integer;
begin
  update public.profiles
  set reliability_score = greatest(
    least(coalesce(reliability_score, 100) + p_delta, 100),
    0
  )
  where id = p_user_id
  returning reliability_score into next_score;

  if next_score is not null then
    update public.profiles
    set reliability_status = private.reliability_status_for_score(next_score)
    where id = p_user_id;
  end if;
end;
$$;

revoke all on function private.reliability_status_for_score(integer)
from public, anon, authenticated;
revoke all on function private.apply_reliability_delta(uuid, integer)
from public, anon, authenticated;

update public.profiles
set reliability_status = private.reliability_status_for_score(reliability_score)
where reliability_status is distinct from
  private.reliability_status_for_score(reliability_score);

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
    offers.pickup_start,
    offers.pickup_end,
    businesses.approved
  into selected_offer
  from public.offers
  join public.businesses on businesses.id = offers.business_id
  where offers.id = p_offer_id
    and offers.active = true
    and coalesce(offers.status, 'active') = 'active'
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
  local_time time;
  cancellation_deadline time;
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

  local_time := timezone('Asia/Tbilisi'::text, now())::time;
  cancellation_deadline := (target_order.pickup_start::time - interval '2 hours')::time;

  if local_time > cancellation_deadline then
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

create or replace function public.mark_order_no_show(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order record;
  local_time time;
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  select
    orders.id,
    orders.user_id,
    orders.offer_id,
    orders.status,
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

  local_time := timezone('Asia/Tbilisi'::text, now())::time;

  if local_time <= target_order.pickup_end::time then
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

revoke all on function public.mock_pay_and_reserve_offer(bigint)
from public, anon, authenticated;
revoke all on function public.cancel_paid_order(bigint)
from public, anon, authenticated;
revoke all on function public.complete_pickup(bigint, text)
from public, anon, authenticated;
revoke all on function public.mark_order_no_show(bigint)
from public, anon, authenticated;
revoke all on function public.rate_business(bigint, integer, text)
from public, anon, authenticated;

grant execute on function public.mock_pay_and_reserve_offer(bigint) to authenticated;
grant execute on function public.cancel_paid_order(bigint) to authenticated;
grant execute on function public.complete_pickup(bigint, text) to authenticated;
grant execute on function public.mark_order_no_show(bigint) to authenticated;
grant execute on function public.rate_business(bigint, integer, text) to authenticated;

alter table public.payments enable row level security;
alter table public.business_ratings enable row level security;

revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;

revoke all on public.business_ratings from anon, authenticated;
grant select on public.business_ratings to authenticated;

drop policy if exists "Users can view own payments" on public.payments;
drop policy if exists "Business owners can view payments for own offers" on public.payments;
drop policy if exists "Admins can view payments" on public.payments;

create policy "Users can view own payments"
on public.payments
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Business owners can view payments for own offers"
on public.payments
for select
to authenticated
using ((select private.owns_offer(payments.offer_id)));

create policy "Admins can view payments"
on public.payments
for select
to authenticated
using ((select private.is_admin()));

drop policy if exists "Users can view own business ratings" on public.business_ratings;
drop policy if exists "Business owners can view ratings for own businesses" on public.business_ratings;
drop policy if exists "Admins can view business ratings" on public.business_ratings;

create policy "Users can view own business ratings"
on public.business_ratings
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Business owners can view ratings for own businesses"
on public.business_ratings
for select
to authenticated
using (
  exists (
    select 1
    from public.businesses
    where businesses.id = business_ratings.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "Admins can view business ratings"
on public.business_ratings
for select
to authenticated
using ((select private.is_admin()));

commit;
