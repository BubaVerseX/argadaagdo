-- "Reservations close at" (owner's request, 2026-11-14).
-- STATUS: applied to production (Frankfurt) on 2026-11-14 with the owner's OK.
--
-- Optional per box: a time on the pickup day after which nobody can reserve
-- any more, even if boxes are left. Empty (null) = reservations stay open
-- until pickup ends, as before. Orders that already exist are not touched.
--
-- Triggers rather than changes to the publish or payment functions:
-- 1. a box published from a template takes the template's time;
-- 2. no new order after that time, on every path that creates an order.
-- Nothing is deleted; RLS and auth are unchanged.

begin;

alter table public.bag_templates
  add column if not exists reserve_until text;

alter table public.offers
  add column if not exists reserve_until text;

alter table public.bag_templates
  drop constraint if exists bag_templates_reserve_until_format;
alter table public.bag_templates
  add constraint bag_templates_reserve_until_format
    check (reserve_until is null or reserve_until ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

alter table public.offers
  drop constraint if exists offers_reserve_until_format;
alter table public.offers
  add constraint offers_reserve_until_format
    check (reserve_until is null or reserve_until ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

-- 1. A box published from a template takes the template's time.
create or replace function private.copy_offer_reserve_until()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.template_id is not null and new.reserve_until is null then
    select bag_templates.reserve_until
      into new.reserve_until
    from public.bag_templates
    where bag_templates.id = new.template_id;
  end if;

  return new;
end;
$$;

revoke all on function private.copy_offer_reserve_until() from public, anon, authenticated;

drop trigger if exists offers_copy_reserve_until on public.offers;
create trigger offers_copy_reserve_until
before insert on public.offers
for each row execute function private.copy_offer_reserve_until();

-- 2. No new reservation after that time (Tbilisi time, on the pickup day).
create or replace function private.guard_order_reserve_until()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  closes_at timestamp with time zone;
begin
  select (offers.pickup_date + offers.reserve_until::time) at time zone 'Asia/Tbilisi'
    into closes_at
  from public.offers
  where offers.id = new.offer_id
    and offers.reserve_until is not null
    and offers.pickup_date is not null;

  if closes_at is not null and now() >= closes_at then
    raise exception 'Offer is not available';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_order_reserve_until() from public, anon, authenticated;

drop trigger if exists orders_guard_reserve_until on public.orders;
create trigger orders_guard_reserve_until
before insert on public.orders
for each row execute function private.guard_order_reserve_until();

commit;
