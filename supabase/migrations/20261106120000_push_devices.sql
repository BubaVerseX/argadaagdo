-- Push notification devices (2026-11-06). Additive.
-- STATUS: applied to production (Frankfurt) on 6 Nov 2026 with the owner's OK.
--
-- One row per app install that allowed notifications: the APNs device token
-- (iOS) or FCM registration token (Android) and the account signed in on it.
-- The app never reads or writes the table directly: it calls
-- register_push_device / unregister_push_device, which only ever touch the
-- caller's own rows. The server sends with the service role.

begin;

create table if not exists public.push_devices (
  token text primary key check (length(token) between 20 and 4096),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  -- The app language on that device, so notifications arrive in it.
  language text not null default 'ka' check (language in ('ka', 'en')),
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists push_devices_user_id_idx on public.push_devices (user_id);

alter table public.push_devices enable row level security;
revoke all on table public.push_devices from public, anon, authenticated;
grant select, insert, update, delete on table public.push_devices to service_role;
-- No policies: signed-in users reach the table only through the functions below.

-- A token belongs to the account signed in on the device now, so it moves
-- when someone else signs in on the same phone.
create or replace function public.register_push_device(
  p_token text,
  p_platform text,
  p_language text default 'ka'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Not logged in';
  end if;

  if p_platform not in ('ios', 'android')
    or length(coalesce(p_token, '')) not between 20 and 4096
  then
    raise exception 'Invalid device';
  end if;

  insert into public.push_devices (token, user_id, platform, language)
  values (
    p_token,
    current_user_id,
    p_platform,
    case when p_language = 'en' then 'en' else 'ka' end
  )
  on conflict (token) do update set
    user_id = excluded.user_id,
    platform = excluded.platform,
    language = excluded.language,
    updated_at = timezone('utc'::text, now());
end;
$$;

create or replace function public.unregister_push_device(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_devices
  where token = p_token
    and user_id = (select auth.uid());
$$;

revoke all on function public.register_push_device(text, text, text) from public, anon;
revoke all on function public.unregister_push_device(text) from public, anon;
grant execute on function public.register_push_device(text, text, text) to authenticated;
grant execute on function public.unregister_push_device(text) to authenticated;

commit;

-- Down:
-- drop function if exists public.unregister_push_device(text);
-- drop function if exists public.register_push_device(text, text, text);
-- drop table if exists public.push_devices;
