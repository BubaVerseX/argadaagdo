-- Business pickup location (2026-11-06). Additive.
-- STATUS: NOT applied to production yet: applying it was blocked by the
-- assistant's permission rules, so it needs the owner's explicit OK (or the owner
-- runs it). The app works without it: the feed falls back, pins just don't show.
--
-- Coordinates for the app's map pins and "nearest first" sorting. Set from an
-- address search + draggable pin in the business sign-up and in admin. Both
-- or neither: a half location is useless.
--
-- No access-rule changes: everyone who can read a business row can read its
-- coordinates (the pickup address is already public), and the only way to
-- write them is set_business_location(), for the business owner or an admin.

begin;

alter table public.businesses
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.businesses
  drop constraint if exists businesses_location_valid;

alter table public.businesses
  add constraint businesses_location_valid check (
    (latitude is null and longitude is null)
    or (latitude between -90 and 90 and longitude between -180 and 180)
  );

create or replace function public.set_business_location(
  p_business_id bigint,
  p_latitude double precision,
  p_longitude double precision
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

  if not exists (
    select 1
    from public.businesses b
    where b.id = p_business_id
      and (b.owner_id = (select auth.uid()) or (select private.is_admin()))
  ) then
    raise exception 'Not allowed';
  end if;

  if (p_latitude is null) <> (p_longitude is null)
    or p_latitude not between -90 and 90
    or p_longitude not between -180 and 180
  then
    raise exception 'Invalid location';
  end if;

  update public.businesses
  set latitude = p_latitude, longitude = p_longitude
  where id = p_business_id;
end;
$$;

revoke all on function public.set_business_location(bigint, double precision, double precision) from public, anon;
grant execute on function public.set_business_location(bigint, double precision, double precision) to authenticated;

commit;

-- Down:
-- drop function if exists public.set_business_location(bigint, double precision, double precision);
-- alter table public.businesses drop constraint if exists businesses_location_valid;
-- alter table public.businesses drop column if exists longitude, drop column if exists latitude;
