begin;

create table if not exists public.favorites (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  offer_id bigint not null references public.offers(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  constraint favorites_user_offer_key unique (user_id, offer_id)
);

create index if not exists favorites_user_id_idx on public.favorites (user_id);
create index if not exists favorites_offer_id_idx on public.favorites (offer_id);

alter table public.favorites enable row level security;

revoke all on public.favorites from anon, authenticated;
grant select, insert, delete on public.favorites to authenticated;

drop policy if exists "Users can view own favorites" on public.favorites;
drop policy if exists "Customers can create own favorites" on public.favorites;
drop policy if exists "Users can delete own favorites" on public.favorites;

create policy "Users can view own favorites"
on public.favorites
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Customers can create own favorites"
on public.favorites
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'customer'
  )
  and exists (
    select 1
    from public.offers
    where offers.id = favorites.offer_id
      and offers.active = true
  )
);

create policy "Users can delete own favorites"
on public.favorites
for delete
to authenticated
using (user_id = (select auth.uid()));

create table if not exists public.ratings (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id bigint not null references public.businesses(id) on delete cascade,
  order_id bigint not null references public.orders(id) on delete cascade,
  rating integer not null,
  review text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  constraint ratings_order_id_key unique (order_id),
  constraint ratings_rating_check check (rating between 1 and 5)
);

alter table public.ratings
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists business_id bigint references public.businesses(id) on delete cascade,
  add column if not exists order_id bigint references public.orders(id) on delete cascade,
  add column if not exists rating integer,
  add column if not exists review text,
  add column if not exists created_at timestamp with time zone default timezone('utc'::text, now());

alter table public.ratings
  drop constraint if exists ratings_order_id_key;

alter table public.ratings
  add constraint ratings_order_id_key unique (order_id);

alter table public.ratings
  drop constraint if exists ratings_rating_check;

alter table public.ratings
  add constraint ratings_rating_check check (rating between 1 and 5);

create index if not exists ratings_user_id_idx on public.ratings (user_id);
create index if not exists ratings_business_id_idx on public.ratings (business_id);
create index if not exists ratings_order_id_idx on public.ratings (order_id);
create index if not exists ratings_created_at_idx on public.ratings (created_at);

insert into public.ratings (
  user_id,
  business_id,
  order_id,
  rating,
  review,
  created_at
)
select
  business_ratings.user_id,
  business_ratings.business_id,
  business_ratings.order_id,
  business_ratings.rating,
  business_ratings.comment,
  business_ratings.created_at
from public.business_ratings
on conflict (order_id) do nothing;

alter table public.ratings enable row level security;

revoke all on public.ratings from anon, authenticated;
grant select on public.ratings to authenticated;
grant update (rating, review) on public.ratings to authenticated;

drop policy if exists "Users can view own ratings" on public.ratings;
drop policy if exists "Business owners can view ratings for own businesses" on public.ratings;
drop policy if exists "Admins can view ratings" on public.ratings;
drop policy if exists "Users can update own ratings" on public.ratings;

create policy "Users can view own ratings"
on public.ratings
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Business owners can view ratings for own businesses"
on public.ratings
for select
to authenticated
using (
  exists (
    select 1
    from public.businesses
    where businesses.id = ratings.business_id
      and businesses.owner_id = (select auth.uid())
  )
);

create policy "Admins can view ratings"
on public.ratings
for select
to authenticated
using ((select private.is_admin()));

create policy "Users can update own ratings"
on public.ratings
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

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
  clean_review text;
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  if not exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'customer'
  ) then
    raise exception 'Only customer accounts can rate pickups';
  end if;

  if p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;

  clean_review := nullif(trim(coalesce(p_comment, '')), '');

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

  if target_order.status not in ('completed', 'collected') then
    raise exception 'Only collected pickups can be rated';
  end if;

  if target_order.rated_at is not null
    or exists (
      select 1
      from public.ratings
      where ratings.order_id = p_order_id
    ) then
    raise exception 'This order has already been rated';
  end if;

  insert into public.ratings (
    order_id,
    business_id,
    user_id,
    rating,
    review
  )
  values (
    p_order_id,
    target_order.business_id,
    (select auth.uid()),
    p_rating,
    clean_review
  );

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
    clean_review
  )
  on conflict (order_id) do nothing;

  update public.orders
  set rated_at = timezone('utc'::text, now())
  where id = p_order_id;
end;
$$;

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
    ratings.business_id,
    round(avg(ratings.rating)::numeric, 2) as average_rating,
    count(*) as rating_count
  from public.ratings
  group by ratings.business_id;
$$;

create or replace function public.get_public_business_reviews(p_business_id bigint)
returns table(
  id bigint,
  business_id bigint,
  rating integer,
  review text,
  created_at timestamp with time zone
)
language sql
security definer
set search_path = ''
as $$
  select
    ratings.id,
    ratings.business_id,
    ratings.rating,
    ratings.review,
    ratings.created_at
  from public.ratings
  where ratings.business_id = p_business_id
  order by ratings.created_at desc;
$$;

revoke all on function public.rate_business(bigint, integer, text)
from public, anon, authenticated;
revoke all on function public.get_business_rating_summary()
from public, anon, authenticated;
revoke all on function public.get_public_business_reviews(bigint)
from public, anon, authenticated;

grant execute on function public.rate_business(bigint, integer, text) to authenticated;
grant execute on function public.get_business_rating_summary() to anon, authenticated;
grant execute on function public.get_public_business_reviews(bigint) to anon, authenticated;

commit;
