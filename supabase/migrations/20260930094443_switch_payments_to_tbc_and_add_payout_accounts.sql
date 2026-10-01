-- Already applied to production on 2026-09-30 (outside this repo). Copied
-- verbatim from supabase_migrations.schema_migrations on 2026-10-01 so the
-- repository matches the live database.
--
-- NOTE: after this migration create_provider_payment_order only accepts
-- 'tbc', but the app code (lib/payments/, app/api/payments/) still sends
-- 'bog', so every checkout is rejected until one side is changed to match.

create table if not exists public.business_payout_accounts (
  business_id bigint primary key references public.businesses(id) on delete cascade,
  iban text not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint business_payout_accounts_iban_check
    check (iban ~ '^GE[0-9]{2}TB[0-9]{16}$')
);

alter table public.business_payout_accounts enable row level security;

revoke all on table public.business_payout_accounts from public, anon, authenticated;
grant select, insert, update, delete on table public.business_payout_accounts to service_role;

create or replace function public.create_provider_payment_order(
  p_offer_id bigint,
  p_provider text default 'tbc'
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

revoke all on function public.create_provider_payment_order(bigint, text)
from public, anon, authenticated;
grant execute on function public.create_provider_payment_order(bigint, text)
to authenticated;
