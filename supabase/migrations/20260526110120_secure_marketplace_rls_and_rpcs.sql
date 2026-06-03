begin;

-- Authorization helpers stay outside exposed API schemas.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function private.owns_approved_business(p_business_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.businesses
    where id = p_business_id
      and owner_id = (select auth.uid())
      and approved = true
  );
$$;

create or replace function private.owns_offer(p_offer_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.offers
    join public.businesses on businesses.id = offers.business_id
    where offers.id = p_offer_id
      and businesses.owner_id = (select auth.uid())
  );
$$;

create or replace function private.has_approved_business()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.businesses
    where owner_id = (select auth.uid())
      and approved = true
  );
$$;

create or replace function private.customer_can_view_offer(p_offer_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders
    where offer_id = p_offer_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function private.business_can_view_customer(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders
    join public.offers on offers.id = orders.offer_id
    join public.businesses on businesses.id = offers.business_id
    where orders.user_id = p_profile_id
      and businesses.owner_id = (select auth.uid())
  );
$$;

revoke all on function private.is_admin() from public, anon, authenticated;
revoke all on function private.owns_approved_business(bigint) from public, anon, authenticated;
revoke all on function private.owns_offer(bigint) from public, anon, authenticated;
revoke all on function private.has_approved_business() from public, anon, authenticated;
revoke all on function private.customer_can_view_offer(bigint) from public, anon, authenticated;
revoke all on function private.business_can_view_customer(uuid) from public, anon, authenticated;

grant execute on function private.is_admin() to authenticated;
grant execute on function private.owns_approved_business(bigint) to authenticated;
grant execute on function private.owns_offer(bigint) to authenticated;
grant execute on function private.has_approved_business() to authenticated;
grant execute on function private.customer_can_view_offer(bigint) to authenticated;
grant execute on function private.business_can_view_customer(uuid) to authenticated;

-- Profiles are created by Auth, not by a browser insert that can fail under RLS.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case
      when new.raw_user_meta_data ->> 'role' = 'business' then 'business'
      else 'customer'
    end
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

insert into public.profiles (id, email, role)
select
  users.id,
  users.email,
  case
    when users.raw_user_meta_data ->> 'role' = 'business' then 'business'
    else 'customer'
  end
from auth.users as users
where not exists (
  select 1 from public.profiles where profiles.id = users.id
);

alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role is not null and role in ('customer', 'business', 'admin'));

alter table public.orders
  drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status is not null and status in ('reserved', 'completed', 'cancelled'));

create index if not exists businesses_owner_id_idx on public.businesses (owner_id);
create index if not exists offers_business_id_idx on public.offers (business_id);
create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_offer_id_idx on public.orders (offer_id);

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.offers enable row level security;
alter table public.orders enable row level security;
alter table storage.objects enable row level security;

-- Remove browser privileges that permit forged roles and reservations.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

revoke all on public.businesses from anon, authenticated;
grant select on public.businesses to anon, authenticated;
grant insert, update on public.businesses to authenticated;

revoke all on public.offers from anon, authenticated;
grant select on public.offers to anon, authenticated;
grant insert, update on public.offers to authenticated;

revoke all on public.orders from anon, authenticated;
grant select on public.orders to authenticated;
grant update (status) on public.orders to authenticated;

-- Profile access: no client INSERT or UPDATE policy exists; role cannot self-escalate.
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Admins can view profiles" on public.profiles;
drop policy if exists "Business owners can view reservation customer profiles" on public.profiles;

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

create policy "Admins can view profiles"
on public.profiles
for select
to authenticated
using ((select private.is_admin()));

create policy "Business owners can view reservation customer profiles"
on public.profiles
for select
to authenticated
using ((select private.business_can_view_customer(profiles.id)));

-- Business approval is readable and mutable by admins, never self-approved by owners.
drop policy if exists "Anyone can view approved businesses" on public.businesses;
drop policy if exists "Business owners can insert businesses" on public.businesses;
drop policy if exists "Business owners can update own businesses" on public.businesses;
drop policy if exists "Owners can view their businesses" on public.businesses;
drop policy if exists "Admins can view businesses" on public.businesses;
drop policy if exists "Admins can update business approval" on public.businesses;

create policy "Anyone can view approved businesses"
on public.businesses
for select
to anon, authenticated
using (approved = true);

create policy "Owners can view their businesses"
on public.businesses
for select
to authenticated
using (owner_id = (select auth.uid()));

create policy "Admins can view businesses"
on public.businesses
for select
to authenticated
using ((select private.is_admin()));

create policy "Owners can register pending businesses"
on public.businesses
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and approved = false
);

create policy "Admins can update business approval"
on public.businesses
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

-- Offers remain public while active, but owners/admins can see inactive history.
drop policy if exists "Anyone can view active offers" on public.offers;
drop policy if exists "Business owners can create offers" on public.offers;
drop policy if exists "Business owners can update own offers" on public.offers;
drop policy if exists "Customers can view ordered offers" on public.offers;
drop policy if exists "Business owners can view own offers" on public.offers;
drop policy if exists "Admins can view offers" on public.offers;

create policy "Anyone can view active offers"
on public.offers
for select
to anon, authenticated
using (
  active = true
  and exists (
    select 1
    from public.businesses
    where businesses.id = offers.business_id
      and businesses.approved = true
  )
);

create policy "Customers can view ordered offers"
on public.offers
for select
to authenticated
using ((select private.customer_can_view_offer(offers.id)));

create policy "Business owners can view own offers"
on public.offers
for select
to authenticated
using ((select private.owns_offer(offers.id)));

create policy "Admins can view offers"
on public.offers
for select
to authenticated
using ((select private.is_admin()));

create policy "Approved business owners can create offers"
on public.offers
for insert
to authenticated
with check ((select private.owns_approved_business(offers.business_id)));

create policy "Approved business owners can update own offers"
on public.offers
for update
to authenticated
using ((select private.owns_approved_business(offers.business_id)))
with check ((select private.owns_approved_business(offers.business_id)));

-- Orders can be inserted only through reserve_offer and cancelled only through cancel_order.
drop policy if exists "Users can create own orders" on public.orders;
drop policy if exists "Users can update own orders" on public.orders;
drop policy if exists "Users can view own orders" on public.orders;
drop policy if exists "Business owners can update orders for own offers" on public.orders;
drop policy if exists "Business owners can view orders for own offers" on public.orders;
drop policy if exists "Admins can view orders" on public.orders;
drop policy if exists "Business owners can complete reserved orders" on public.orders;

create policy "Users can view own orders"
on public.orders
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Business owners can view orders for own offers"
on public.orders
for select
to authenticated
using ((select private.owns_offer(orders.offer_id)));

create policy "Admins can view orders"
on public.orders
for select
to authenticated
using ((select private.is_admin()));

create policy "Business owners can complete reserved orders"
on public.orders
for update
to authenticated
using (
  (select private.owns_offer(orders.offer_id))
  and status = 'reserved'
)
with check (
  (select private.owns_offer(orders.offer_id))
  and status = 'completed'
);

-- Keep the existing reservation API, while constraining its elevated privileges.
create or replace function public.reserve_offer(p_offer_id bigint)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_quantity integer;
  new_pickup_code text;
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  select offers.quantity
  into current_quantity
  from public.offers
  join public.businesses on businesses.id = offers.business_id
  where offers.id = p_offer_id
    and offers.active = true
    and businesses.approved = true
  for update of offers;

  if current_quantity is null or current_quantity <= 0 then
    raise exception 'Offer sold out';
  end if;

  new_pickup_code := floor(100000 + random() * 900000)::text;

  insert into public.orders (
    user_id,
    offer_id,
    status,
    payment_method,
    pickup_code
  )
  values (
    (select auth.uid()),
    p_offer_id,
    'reserved',
    'cash',
    new_pickup_code
  );

  update public.offers
  set
    quantity = quantity - 1,
    active = case when quantity - 1 > 0 then true else false end
  where id = p_offer_id;

  return new_pickup_code;
end;
$$;

revoke all on function public.reserve_offer(bigint) from public, anon, authenticated;
grant execute on function public.reserve_offer(bigint) to authenticated;

create or replace function public.cancel_order(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cancelled_offer_id bigint;
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  select orders.offer_id
  into cancelled_offer_id
  from public.orders
  where orders.id = p_order_id
    and orders.user_id = (select auth.uid())
    and orders.status = 'reserved'
  for update;

  if cancelled_offer_id is null then
    raise exception 'Reservation cannot be cancelled';
  end if;

  update public.orders
  set status = 'cancelled'
  where id = p_order_id;

  update public.offers
  set
    quantity = coalesce(quantity, 0) + 1,
    active = true
  where id = cancelled_offer_id;
end;
$$;

revoke all on function public.cancel_order(bigint) from public, anon, authenticated;
grant execute on function public.cancel_order(bigint) to authenticated;

-- Offer media are publicly readable but only approved owners may upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'offer-images',
  'offer-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Approved business owners can upload offer images" on storage.objects;

create policy "Approved business owners can upload offer images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'offer-images'
  and (select private.has_approved_business())
);

commit;
