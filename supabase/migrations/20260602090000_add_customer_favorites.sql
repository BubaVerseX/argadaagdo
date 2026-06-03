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

commit;
