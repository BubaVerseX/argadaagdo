-- Green Bag model, stage 4 (2026-11-01): platform commission per business.
-- STATUS: applied to production on 2026-11-04 (recorded as version 20261104081140).
--
-- businesses.platform_fee_rate (0.30 = 30%, default; 0 for pilot partners)
-- is server-side: only admins (or the service role) can change it, through
-- set_business_platform_fee_rate or a direct update; owners can't, even
-- though they may update their own business row. create_provider_payment_order
-- reads it when it splits an order into platform_fee / business_amount, so
-- the TBC split share (extra2 = business_amount in lib/payments/tbc.ts)
-- follows automatically. Nothing else in the payment flow changes.
--
-- Deploy note: this changes the live commission from the hard-coded 10% to
-- the per-business rate (30% default) as soon as it is applied. Set pilot
-- partners to 0 in the same session:
--   select public.set_business_platform_fee_rate(<id>, 0);

begin;

alter table public.businesses
  add column if not exists platform_fee_rate numeric(5, 4) not null default 0.30
    check (platform_fee_rate >= 0 and platform_fee_rate <= 1);

comment on column public.businesses.platform_fee_rate is
  'Platform commission share of each order (0.30 = 30%). Admin/service role only.';

create or replace function private.guard_business_fee_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
    and not (select private.is_admin())
    and new.platform_fee_rate is distinct from (
      case when tg_op = 'INSERT' then 0.30::numeric(5, 4) else old.platform_fee_rate end
    )
  then
    raise exception 'Only admins can change the platform commission';
  end if;

  return new;
end;
$$;

drop trigger if exists businesses_guard_fee_rate on public.businesses;
create trigger businesses_guard_fee_rate
before insert or update of platform_fee_rate on public.businesses
for each row execute function private.guard_business_fee_rate();

create or replace function public.set_business_platform_fee_rate(
  p_business_id bigint,
  p_rate numeric
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not (select private.is_admin()) then
    raise exception 'Only admins can change the platform commission';
  end if;

  if p_rate is null or p_rate < 0 or p_rate > 1 then
    raise exception 'Commission must be between 0 and 1' using errcode = 'check_violation';
  end if;

  update public.businesses
  set platform_fee_rate = round(p_rate, 4)
  where id = p_business_id;

  if not found then
    raise exception 'Business not found';
  end if;

  return round(p_rate, 4);
end;
$$;

revoke all on function public.set_business_platform_fee_rate(bigint, numeric) from public, anon;
grant execute on function public.set_business_platform_fee_rate(bigint, numeric) to authenticated;

-- Same function as live (2026-10-16 version); only the two share lines and
-- the businesses column in the select changed.
create or replace function public.create_provider_payment_order(p_offer_id bigint, p_provider text default 'tbc'::text)
returns table(order_id bigint, payment_id bigint, external_order_id text, amount numeric, platform_fee numeric, business_amount numeric)
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
  normalized_provider text := lower(trim(coalesce(p_provider, 'tbc')));
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  perform public.process_expired_marketplace();

  if normalized_provider not in ('tbc') then
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
    businesses.approved,
    businesses.platform_fee_rate
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
  -- Per-business commission (30% default, 0 for pilot partners).
  order_platform_fee := round(order_amount * coalesce(selected_offer.platform_fee_rate, 0.30), 2);
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

commit;

-- Down (reversible): restore the 10% calculation and drop the column.
-- begin;
-- drop function if exists public.set_business_platform_fee_rate(bigint, numeric);
-- drop trigger if exists businesses_guard_fee_rate on public.businesses;
-- drop function if exists private.guard_business_fee_rate();
-- -- re-create create_provider_payment_order from
-- -- 20260930094443_switch_payments_to_tbc_and_add_payout_accounts.sql
-- -- (order_platform_fee := round(order_amount * 0.10, 2)).
-- alter table public.businesses drop column if exists platform_fee_rate;
-- commit;
