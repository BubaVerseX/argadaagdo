-- Payment safety for TBC, part 1 of 2 (2026-10-16): additive changes only.
--
-- Safe to apply while the older app code is still live (it only adds states,
-- columns and functions). Part 2, 20261016120200_lock_pickup_codes_and_old_refunds.sql,
-- removes the old access and must be applied only AFTER the app code that
-- uses these new functions is deployed.
--
-- What this adds:
--  a. Late payments. If the bank reports a payment as paid after its hold was
--     released (order already cancelled/expired), finalize_provider_payment
--     now marks the payment 'refund_required' instead of leaving it looking
--     unpaid. The app refunds it at the bank straight away and then calls
--     complete_provider_refund; the payment-maintenance cron retries any that
--     are left.
--  b. Two-phase customer refund. begin_customer_refund locks the order
--     ('refund_pending', box back on sale, payment 'refund_required'), the
--     server refunds at the bank, then complete_provider_refund finalizes
--     ('refunded'). A failed or timed-out bank call leaves the order locked
--     for the cron to retry, never "cancelled but not refunded" or "refunded
--     but still collectable".
--  c. Pickup codes. get_my_pickup_codes() lets customers read their own
--     codes, and the generated has_pickup_code column keeps "was this order
--     ever paid" visible once part 2 hides pickup_code from businesses.

begin;

-- New states --------------------------------------------------------------
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (
    status is not null
    and status = any (array[
      'pending_payment', 'reserved', 'confirmed', 'collected', 'completed',
      'expired', 'cancelled', 'refund_pending', 'refunded', 'no_show'
    ])
  );

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (
    status = any (array[
      'pending', 'authorized', 'paid', 'failed', 'cancelled', 'expired',
      'refund_required', 'refunded'
    ])
  );

create index if not exists payments_refund_required_idx
on public.payments (created_at)
where status = 'refund_required';

-- a. finalize_provider_payment: late payments become refund_required; a bank
--    refund of a refund_pending order completes it.
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
  normalized_provider text := lower(trim(coalesce(p_provider, 'tbc')));
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
    if target_payment.order_status = 'pending_payment' then
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
    elsif target_payment.payment_status in ('pending', 'authorized', 'expired', 'failed', 'cancelled') then
      -- The bank took the money after the hold was released (or the checkout
      -- was abandoned). There is no reservation to give, so it must go back.
      update public.payments
      set status = 'refund_required'
      where id = target_payment.id;
    end if;

  elsif mapped_payment_status = 'pending' then
    update public.payments
    set status = 'pending'
    where id = target_payment.id
      and status = 'pending';

  elsif mapped_payment_status = 'refunded' then
    if target_payment.order_status = 'refund_pending' then
      -- Customer cancellation whose bank refund has now settled. The box and
      -- the customer counters were handled when the refund began.
      update public.orders
      set status = 'refunded'
      where id = target_payment.order_id
        and status = 'refund_pending';
    else
      if target_payment.quantity_restored_at is null
        and target_payment.order_status in ('pending_payment', 'reserved', 'confirmed') then
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
    end if;

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
          when status in ('inactive', 'expired') then false
          else true
        end,
        status = case
          when status in ('inactive', 'expired') then status
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

revoke all on function public.finalize_provider_payment(text, text, text, text, numeric) from public, anon, authenticated;

-- b. Phase 1: the customer locks the order for a refund ---------------------
create or replace function public.begin_customer_refund(p_order_id bigint)
returns table(payment_id bigint, provider text, provider_reference text, amount numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order record;
  paid_payment_id bigint;
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

  -- A retry after a failed bank call: hand back the same refund to finish.
  if target_order.status = 'refund_pending' then
    return query
    select payments.id, payments.provider, payments.provider_reference, payments.amount
    from public.payments
    where payments.order_id = p_order_id
      and payments.status = 'refund_required';
    return;
  end if;

  if target_order.status <> 'reserved' then
    raise exception 'Only reserved orders can be cancelled';
  end if;

  if target_order.pickup_start is null then
    raise exception 'Pickup start is missing';
  end if;

  if now() > private.pickup_start_at(
    target_order.pickup_date,
    target_order.pickup_start::text
  ) - interval '2 hours' then
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

  select payments.id
  into paid_payment_id
  from public.payments
  where payments.order_id = p_order_id
    and payments.status = 'paid'
  limit 1
  for update;

  if paid_payment_id is not null then
    update public.payments
    set status = 'refund_required'
    where id = paid_payment_id;
  end if;

  update public.orders
  set
    -- No captured payment (legacy cash/mock orders): nothing to send back.
    status = case when paid_payment_id is null then 'cancelled' else 'refund_pending' end,
    cancelled_at = timezone('utc'::text, now()),
    cancelled_reason = 'customer_cancelled_before_deadline',
    quantity_restored_at = coalesce(quantity_restored_at, timezone('utc'::text, now()))
  where id = p_order_id;

  update public.profiles
  set cancelled_order_count = cancelled_order_count + 1
  where id = target_order.user_id;

  perform private.apply_reliability_delta(target_order.user_id, -2);

  return query
  select payments.id, payments.provider, payments.provider_reference, payments.amount
  from public.payments
  where payments.id = paid_payment_id;
end;
$$;

revoke all on function public.begin_customer_refund(bigint) from public, anon;
grant execute on function public.begin_customer_refund(bigint) to authenticated;

-- b. Phase 3: the server records a refund the bank has confirmed -----------
create or replace function public.complete_provider_refund(p_payment_id bigint)
returns table(order_id bigint, order_status text, payment_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_payment record;
begin
  select payments.id, payments.order_id, payments.status
  into target_payment
  from public.payments
  where payments.id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment not found';
  end if;

  if target_payment.status not in ('refund_required', 'refunded') then
    raise exception 'Payment is not awaiting a refund';
  end if;

  update public.payments
  set
    status = 'refunded',
    refunded_at = coalesce(refunded_at, timezone('utc'::text, now()))
  where id = p_payment_id;

  update public.orders
  set status = 'refunded'
  where id = target_payment.order_id
    and status = 'refund_pending';

  return query
  select orders.id, orders.status, payments.status
  from public.payments
  join public.orders on orders.id = payments.order_id
  where payments.id = p_payment_id;
end;
$$;

-- Service role only: it records money as returned, so only server code that
-- has just confirmed the refund with the bank may call it.
revoke all on function public.complete_provider_refund(bigint) from public, anon, authenticated;

-- c. Pickup codes: a paid flag anyone with order access can read, and the
--    customer's own codes through an RPC ------------------------------------
alter table public.orders
  add column if not exists has_pickup_code boolean
  generated always as (pickup_code is not null) stored;

grant select (has_pickup_code) on public.orders to authenticated;

create or replace function public.get_my_pickup_codes()
returns table(order_id bigint, pickup_code text)
language sql
stable
security definer
set search_path = ''
as $$
  select orders.id, orders.pickup_code
  from public.orders
  where orders.user_id = (select auth.uid())
    and orders.status in ('reserved', 'confirmed')
    and orders.pickup_code is not null;
$$;

revoke all on function public.get_my_pickup_codes() from public, anon;
grant execute on function public.get_my_pickup_codes() to authenticated;

commit;
