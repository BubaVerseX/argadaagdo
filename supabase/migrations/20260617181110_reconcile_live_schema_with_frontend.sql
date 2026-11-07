begin;

-- Reconcile the live offers schema with the current frontend.
-- The frontend creates and reads offers.pickup_date, but the live database may
-- be missing that column because prior migrations were only partially applied.
alter table public.offers
  add column if not exists pickup_date date;

alter table public.offers
  alter column pickup_date set default (
    timezone('Asia/Tbilisi'::text, now())::date
  );

-- Backfill existing rows without deleting or replacing any offer data.
-- Existing offers did not have a pickup_date, so created_at is the safest
-- available fallback for lifecycle calculations.
update public.offers
set pickup_date = coalesce(
  pickup_date,
  timezone('Asia/Tbilisi'::text, coalesce(created_at, now()))::date
)
where pickup_date is null;

alter table public.offers
  alter column pickup_date set not null;

create index if not exists offers_pickup_date_idx
on public.offers (pickup_date);

create index if not exists offers_lifecycle_idx
on public.offers (status, active, pickup_date);

-- Allow the offer lifecycle states used by the frontend.
alter table public.offers
  drop constraint if exists offers_status_check;

alter table public.offers
  add constraint offers_status_check
  check (
    status is not null
    and status in ('active', 'sold_out', 'expired', 'inactive')
  );

-- Timestamp helpers used by lifecycle and cancellation logic.
-- They combine a Georgia-market pickup date with the pickup time fields.
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

-- Public lifecycle reconciliation RPC.
-- This is called by frontend loading paths to keep sold-out and expired offers
-- consistent without relying on a cron job yet.
create or replace function public.process_expired_marketplace()
returns table(expired_offers integer, no_show_orders integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_offer_count integer := 0;
  no_show_order_count integer := 0;
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

  get diagnostics expired_offer_count = row_count;

  for reserved_order in
    select
      orders.id,
      orders.user_id
    from public.orders
    join public.offers on offers.id = orders.offer_id
    where orders.status = 'reserved'
      and private.pickup_end_at(offers.pickup_date, offers.pickup_end::text) < now()
  loop
    update public.orders
    set
      status = 'no_show',
      no_show_at = coalesce(no_show_at, timezone('utc'::text, now()))
    where id = reserved_order.id
      and status = 'reserved';

    if found then
      no_show_order_count := no_show_order_count + 1;

      update public.profiles
      set no_show_count = no_show_count + 1
      where id = reserved_order.user_id;

      perform private.apply_reliability_delta(reserved_order.user_id, -15);
    end if;
  end loop;

  return query select expired_offer_count, no_show_order_count;
end;
$$;

revoke all on function public.process_expired_marketplace()
from public, anon, authenticated;

grant execute on function public.process_expired_marketplace()
to anon, authenticated;

-- Rating summary RPC used by homepage, offers, business profiles, and dashboard.
-- This keeps compatibility with the currently-live business_ratings table.
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

revoke all on function public.get_business_rating_summary()
from public, anon, authenticated;

grant execute on function public.get_business_rating_summary()
to anon, authenticated;

commit;
