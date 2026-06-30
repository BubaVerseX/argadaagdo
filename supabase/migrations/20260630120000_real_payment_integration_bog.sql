begin;

-- ArGadaagdo real payment integration foundation.
-- This migration keeps the existing mock reservation RPC intact for backwards
-- compatibility, while adding a provider-first flow for Bank of Georgia.

-- Orders can now hold inventory while the customer is completing payment.
alter table public.orders
  alter column status set default 'pending_payment';

alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (
    status is not null
    and status in (
      'pending_payment',
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

-- Payments support provider session states in addition to the existing paid
-- and refund states.
alter table public.payments
  drop constraint if exists payments_status_check;

alter table public.payments
  add constraint payments_status_check
  check (
    status in (
      'pending',
      'authorized',
      'paid',
      'failed',
      'cancelled',
      'expired',
      'refunded'
    )
  );

create index if not exists payments_provider_reference_idx
on public.payments (provider, provider_reference)
where provider_reference is not null;

create unique index if not exists payments_provider_reference_unique_idx
on public.payments (provider, provider_reference)
where provider_reference is not null;

-- Create a pending order and payment hold before redirecting to the provider.
-- Inventory is decreased here to avoid overselling the last available box.
-- The order only becomes "reserved" after a verified provider callback.
create or replace function public.create_provider_payment_order(
  p_offer_id bigint,
  p_provider text default 'bog'
)
returns table(
  order_id bigint,
  payment_id bigint,
  external_order_id text,
  amount numeric,
  platform_fee numeric,
  business_amount numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_offer record;
  active_reservation_count integer;
  new_order_id bigint;
  new_payment_id bigint;
  order_amount numeric(10, 2);
  order_platform_fee numeric(10, 2);
  order_business_amount numeric(10, 2);
  normalized_provider text := lower(trim(coalesce(p_provider, 'bog')));
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  perform public.process_expired_marketplace();

  if normalized_provider not in ('bog') then
    raise exception 'Unsupported payment provider';
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
    and status in ('pending_payment', 'reserved', 'confirmed');

  if active_reservation_count >= 3 then
    raise exception 'You can have at most 3 active reservations';
  end if;

  if exists (
    select 1
    from public.orders
    where user_id = (select auth.uid())
      and offer_id = p_offer_id
      and status in ('pending_payment', 'reserved', 'confirmed')
  ) then
    raise exception 'You already have an active reservation for this offer';
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
    'pending_payment',
    normalized_provider,
    null,
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
    'pending',
    normalized_provider,
    null
  )
  returning id into new_payment_id;

  update public.offers
  set
    quantity = quantity - 1,
    active = case when quantity - 1 > 0 then true else false end,
    status = case when quantity - 1 > 0 then 'active' else 'sold_out' end
  where id = p_offer_id;

  return query select
    new_order_id,
    new_payment_id,
    'argadaagdo_payment_' || new_payment_id::text,
    order_amount,
    order_platform_fee,
    order_business_amount;
end;
$$;

-- Store the provider reference after the payment session is created.
create or replace function public.attach_provider_payment_reference(
  p_payment_id bigint,
  p_provider_reference text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  if nullif(trim(coalesce(p_provider_reference, '')), '') is null then
    raise exception 'Provider reference is required';
  end if;

  update public.payments
  set provider_reference = trim(p_provider_reference)
  where id = p_payment_id
    and user_id = (select auth.uid())
    and status = 'pending'
    and (
      provider_reference is null
      or provider_reference = trim(p_provider_reference)
    );

  if not found then
    raise exception 'Pending payment not found';
  end if;
end;
$$;

-- If provider session creation fails, release the held inventory exactly once.
create or replace function public.record_provider_payment_failure(
  p_payment_id bigint,
  p_reason text default 'provider_session_failed'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_payment record;
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  select
    payments.id,
    payments.order_id,
    payments.offer_id,
    payments.status,
    orders.status as order_status,
    orders.quantity_restored_at
  into target_payment
  from public.payments
  join public.orders on orders.id = payments.order_id
  where payments.id = p_payment_id
    and payments.user_id = (select auth.uid())
  for update of payments, orders;

  if not found then
    raise exception 'Payment not found';
  end if;

  if target_payment.status <> 'pending' then
    return;
  end if;

  if target_payment.order_status = 'pending_payment'
    and target_payment.quantity_restored_at is null then
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
    where id = target_payment.offer_id;
  end if;

  update public.orders
  set
    status = 'cancelled',
    cancelled_at = coalesce(cancelled_at, timezone('utc'::text, now())),
    cancelled_reason = coalesce(nullif(trim(p_reason), ''), 'provider_session_failed'),
    quantity_restored_at = coalesce(
      quantity_restored_at,
      timezone('utc'::text, now())
    )
  where id = target_payment.order_id
    and status = 'pending_payment';

  update public.payments
  set status = 'failed'
  where id = p_payment_id
    and status = 'pending';
end;
$$;

-- Validate a customer cancellation before a provider refund is requested.
-- This performs the same ownership, status and deadline checks as
-- cancel_paid_order(), but does not mutate data.
create or replace function public.get_customer_refund_payment(
  p_order_id bigint
)
returns table(
  payment_id bigint,
  provider text,
  provider_reference text,
  amount numeric
)
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

  select
    orders.id,
    orders.user_id,
    orders.status,
    offers.pickup_date,
    offers.pickup_start
  into target_order
  from public.orders
  join public.offers on offers.id = orders.offer_id
  where orders.id = p_order_id
    and orders.user_id = (select auth.uid());

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

  return query
  select
    payments.id,
    payments.provider,
    payments.provider_reference,
    payments.amount
  from public.payments
  where payments.order_id = p_order_id
    and payments.status = 'paid'
  limit 1;
end;
$$;

-- Finalize a provider payment after the server has verified the callback or
-- return state with Bank of Georgia. This function is intentionally service-role
-- only; browser clients must not be able to mark a payment paid.
create or replace function public.finalize_provider_payment(
  p_provider text,
  p_provider_reference text,
  p_external_order_id text,
  p_provider_status text,
  p_amount numeric default null
)
returns table(order_id bigint, payment_id bigint, order_status text, payment_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_payment record;
  normalized_provider text := lower(trim(coalesce(p_provider, 'bog')));
  normalized_status text := lower(trim(coalesce(p_provider_status, '')));
  mapped_payment_status text;
  external_payment_id bigint;
  generated_pickup_code text;
begin
  if coalesce(p_external_order_id, '') ~ '^argadaagdo_payment_[0-9]+$' then
    external_payment_id := substring(p_external_order_id from '[0-9]+$')::bigint;
  end if;

  mapped_payment_status := case
    when normalized_status in ('paid', 'completed', 'complete', 'success', 'succeeded', 'approved', 'authorized')
      then 'paid'
    when normalized_status in ('pending', 'created', 'processing')
      then 'pending'
    when normalized_status in ('cancelled', 'canceled')
      then 'cancelled'
    when normalized_status = 'expired'
      then 'expired'
    when normalized_status = 'refunded'
      then 'refunded'
    else 'failed'
  end;

  select
    payments.id,
    payments.order_id,
    payments.offer_id,
    payments.amount,
    payments.status as payment_status,
    payments.provider,
    payments.provider_reference,
    orders.status as order_status,
    orders.pickup_code,
    orders.quantity_restored_at
  into target_payment
  from public.payments
  join public.orders on orders.id = payments.order_id
  where payments.provider = normalized_provider
    and (
      payments.id = external_payment_id
      or (
        p_provider_reference is not null
        and payments.provider_reference = p_provider_reference
      )
    )
  for update of payments, orders;

  if not found then
    raise exception 'Provider payment not found';
  end if;

  if p_amount is not null
    and round(target_payment.amount::numeric, 2) <> round(p_amount::numeric, 2) then
    raise exception 'Payment amount mismatch';
  end if;

  if p_provider_reference is not null then
    update public.payments
    set provider_reference = p_provider_reference
    where id = target_payment.id
      and (
        provider_reference is null
        or provider_reference = p_provider_reference
      );
  end if;

  if mapped_payment_status = 'paid' then
    generated_pickup_code := floor(100000 + random() * 900000)::text;

    update public.orders
    set
      status = 'reserved',
      payment_method = normalized_provider,
      pickup_code = coalesce(pickup_code, generated_pickup_code)
    where id = target_payment.order_id
      and status = 'pending_payment';

    update public.payments
    set status = 'paid'
    where id = target_payment.id
      and status in ('pending', 'authorized');

  elsif mapped_payment_status = 'pending' then
    update public.payments
    set status = 'pending'
    where id = target_payment.id
      and status = 'pending';

  elsif mapped_payment_status = 'refunded' then
    if target_payment.quantity_restored_at is null
      and target_payment.order_status in ('pending_payment', 'reserved', 'confirmed') then
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
      where id = target_payment.offer_id;
    end if;

    update public.orders
    set
      status = 'refunded',
      cancelled_at = coalesce(cancelled_at, timezone('utc'::text, now())),
      cancelled_reason = coalesce(cancelled_reason, 'provider_refunded'),
      quantity_restored_at = coalesce(quantity_restored_at, timezone('utc'::text, now()))
    where id = target_payment.order_id
      and status in ('pending_payment', 'reserved', 'confirmed');

    update public.payments
    set
      status = 'refunded',
      refunded_at = coalesce(refunded_at, timezone('utc'::text, now()))
    where id = target_payment.id;

  else
    if target_payment.quantity_restored_at is null
      and target_payment.order_status = 'pending_payment' then
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
      where id = target_payment.offer_id;
    end if;

    update public.orders
    set
      status = 'cancelled',
      cancelled_at = coalesce(cancelled_at, timezone('utc'::text, now())),
      cancelled_reason = 'payment_' || mapped_payment_status,
      quantity_restored_at = coalesce(quantity_restored_at, timezone('utc'::text, now()))
    where id = target_payment.order_id
      and status = 'pending_payment';

    update public.payments
    set status = mapped_payment_status
    where id = target_payment.id
      and status in ('pending', 'authorized');
  end if;

  return query
  select
    orders.id,
    payments.id,
    orders.status,
    payments.status
  from public.payments
  join public.orders on orders.id = payments.order_id
  where payments.id = target_payment.id;
end;
$$;

-- Release old abandoned provider sessions. This is intended for a future cron
-- job or manual admin operation and is safe to run repeatedly.
create or replace function public.expire_pending_provider_payments(
  p_older_than_minutes integer default 20
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_count integer := 0;
  pending_payment record;
begin
  for pending_payment in
    select
      payments.id,
      payments.order_id,
      payments.offer_id,
      orders.quantity_restored_at
    from public.payments
    join public.orders on orders.id = payments.order_id
    where payments.status = 'pending'
      and orders.status = 'pending_payment'
      and payments.created_at < now() - make_interval(mins => greatest(p_older_than_minutes, 1))
    for update of payments, orders
  loop
    if pending_payment.quantity_restored_at is null then
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
      where id = pending_payment.offer_id;
    end if;

    update public.orders
    set
      status = 'cancelled',
      cancelled_at = coalesce(cancelled_at, timezone('utc'::text, now())),
      cancelled_reason = 'payment_expired',
      quantity_restored_at = coalesce(quantity_restored_at, timezone('utc'::text, now()))
    where id = pending_payment.order_id
      and status = 'pending_payment';

    update public.payments
    set status = 'expired'
    where id = pending_payment.id
      and status = 'pending';

    expired_count := expired_count + 1;
  end loop;

  return expired_count;
end;
$$;

revoke all on function public.create_provider_payment_order(bigint, text)
from public, anon, authenticated;
revoke all on function public.attach_provider_payment_reference(bigint, text)
from public, anon, authenticated;
revoke all on function public.record_provider_payment_failure(bigint, text)
from public, anon, authenticated;
revoke all on function public.finalize_provider_payment(text, text, text, text, numeric)
from public, anon, authenticated;
revoke all on function public.expire_pending_provider_payments(integer)
from public, anon, authenticated;
revoke all on function public.get_customer_refund_payment(bigint)
from public, anon, authenticated;

grant execute on function public.create_provider_payment_order(bigint, text)
to authenticated;
grant execute on function public.attach_provider_payment_reference(bigint, text)
to authenticated;
grant execute on function public.record_provider_payment_failure(bigint, text)
to authenticated;
grant execute on function public.get_customer_refund_payment(bigint)
to authenticated;

grant execute on function public.finalize_provider_payment(text, text, text, text, numeric)
to service_role;
grant execute on function public.expire_pending_provider_payments(integer)
to service_role;

commit;
