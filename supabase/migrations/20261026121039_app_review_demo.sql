-- App Store review demo (2026-10-26).
-- STATUS: applied to production on 2026-10-26 (recorded as version
-- 20261026121039) after a rolled-back dry run with scenario checks.
--
-- Apple's reviewer has to reserve a bag, get a pickup code and have it
-- collected without paying real money. This adds a review-only business whose
-- 0 GEL offers are reserved through reserve_review_demo_offer instead of TBC.
-- Real users never see or reserve them:
--  - businesses.is_review_demo marks the demo business. Only the service role
--    (SQL / dashboard) can set it; app users, admins included, can't.
--  - private.review_demo_accounts lists the reviewer logins. Only the service
--    role can change it, so nobody can flag their own account.
--  - The public SELECT policies on businesses and offers now exclude demo
--    businesses, and two companion policies show them to the reviewer logins
--    only. Owner and admin policies are unchanged, so the demo business
--    account and admins still see everything they saw before.
--  - Price 0 is allowed only for demo businesses (was CHECK price > 0).
--  - reserve_review_demo_offer creates a reserved order with a pickup code and
--    no payment row, so begin_customer_refund (cancel) and complete_pickup
--    (collect) handle it unchanged, without any bank call.
--  - refresh_review_demo_offers, run by the daily payment-maintenance cron,
--    keeps the 0 GEL demo bags on sale for tomorrow 18:00-21:00, so they never
--    expire, stay cancellable (2-hour rule) and never become no-shows.
--
-- Safe to apply before the app code is deployed: only the demo logins can see
-- a 0 GEL offer, and the old checkout route would just fail at TBC and roll
-- the hold back.
--
-- The demo accounts, business and offer are created separately (they need
-- real auth signups), see docs/app-store-submission.md.

begin;

-- 1. Demo business flag --------------------------------------------------------
alter table public.businesses
  add column if not exists is_review_demo boolean not null default false;

create or replace function private.guard_business_review_demo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
    and new.is_review_demo is distinct from (
      case when tg_op = 'INSERT' then false else old.is_review_demo end
    )
  then
    raise exception 'Only the service role can change review demo businesses';
  end if;

  return new;
end;
$$;

drop trigger if exists businesses_guard_review_demo on public.businesses;
create trigger businesses_guard_review_demo
before insert or update of is_review_demo on public.businesses
for each row execute function private.guard_business_review_demo();

-- 2. Reviewer logins -------------------------------------------------------------
create table if not exists private.review_demo_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table private.review_demo_accounts enable row level security;
revoke all on table private.review_demo_accounts from public, anon, authenticated;

create or replace function private.is_review_demo_account()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.review_demo_accounts
    where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_review_demo_account() from public, anon;
grant execute on function private.is_review_demo_account() to authenticated;

-- 3. Visibility: hide demo businesses from everyone but the reviewer logins ----
alter policy "Anyone can view approved businesses" on public.businesses
using (approved = true and not is_review_demo);

drop policy if exists "Review demo accounts can view demo businesses" on public.businesses;
create policy "Review demo accounts can view demo businesses"
on public.businesses
for select
to authenticated
using (
  approved = true
  and is_review_demo
  and (select private.is_review_demo_account())
);

alter policy "Anyone can view active offers" on public.offers
using (
  active = true
  and exists (
    select 1
    from public.businesses
    where businesses.id = offers.business_id
      and businesses.approved = true
      and not businesses.is_review_demo
  )
);

drop policy if exists "Review demo accounts can view demo offers" on public.offers;
create policy "Review demo accounts can view demo offers"
on public.offers
for select
to authenticated
using (
  active = true
  and (select private.is_review_demo_account())
  and exists (
    select 1
    from public.businesses
    where businesses.id = offers.business_id
      and businesses.approved = true
      and businesses.is_review_demo
  )
);

-- 4. Price 0 only for demo businesses --------------------------------------------
alter table public.offers drop constraint if exists offers_price_positive;
alter table public.offers drop constraint if exists offers_price_non_negative;
alter table public.offers
  add constraint offers_price_non_negative check (price >= 0);

create or replace function private.guard_offer_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.price <= 0 and not exists (
    select 1
    from public.businesses
    where businesses.id = new.business_id
      and businesses.is_review_demo
  ) then
    raise exception 'Price must be greater than 0'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists offers_guard_price on public.offers;
create trigger offers_guard_price
before insert or update of price, business_id on public.offers
for each row execute function private.guard_offer_price();

-- 5. Reserving a demo bag without a payment ---------------------------------------
create or replace function public.reserve_review_demo_offer(p_offer_id bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_offer record;
  active_reservation_count integer;
  new_order_id bigint;
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  perform public.process_expired_marketplace();

  -- Same message as for a missing offer, so a real account learns nothing.
  if not (select private.is_review_demo_account()) then
    raise exception 'Offer is not available';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'customer'
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
    offers.quantity
  into selected_offer
  from public.offers
  join public.businesses on businesses.id = offers.business_id
  where offers.id = p_offer_id
    and offers.price = 0
    and offers.active = true
    and coalesce(offers.status, 'active') = 'active'
    and private.pickup_end_at(offers.pickup_date, offers.pickup_end::text) > now()
    and businesses.approved = true
    and businesses.is_review_demo
  for update of offers;

  if not found then
    raise exception 'Offer is not available';
  end if;

  if coalesce(selected_offer.quantity, 0) <= 0 then
    raise exception 'Offer sold out';
  end if;

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
    'review_demo',
    floor(100000 + random() * 900000)::text,
    0,
    0,
    0
  )
  returning id into new_order_id;

  update public.offers
  set
    quantity = quantity - 1,
    active = case when quantity - 1 > 0 then true else false end,
    status = case when quantity - 1 > 0 then 'active' else 'sold_out' end
  where id = p_offer_id;

  return new_order_id;
end;
$$;

revoke all on function public.reserve_review_demo_offer(bigint) from public, anon;
grant execute on function public.reserve_review_demo_offer(bigint) to authenticated;

-- 6. Keeping the demo bags on sale ---------------------------------------------------
create or replace function public.refresh_review_demo_offers()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  refreshed_count integer;
begin
  update public.offers
  set
    pickup_date = timezone('Asia/Tbilisi'::text, now())::date + 1,
    pickup_start = '18:00',
    pickup_end = '21:00',
    quantity = 20,
    active = true,
    status = 'active'
  from public.businesses
  where businesses.id = offers.business_id
    and businesses.is_review_demo
    and offers.price = 0;

  get diagnostics refreshed_count = row_count;
  return refreshed_count;
end;
$$;

-- Service role only (payment-maintenance cron).
revoke all on function public.refresh_review_demo_offers() from public, anon, authenticated;

commit;
