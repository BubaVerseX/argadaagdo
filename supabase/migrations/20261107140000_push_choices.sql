-- Two push choices per account and device (check-2 #10, 2026-11-07).
-- STATUS: applied to production (Frankfurt) on 2026-11-07 with the owner's OK.
--
-- Order updates (confirmed, pickup reminder, cancelled) and "new boxes from
-- places you saved" (marketing) used to share one switch and one prompt.
-- Now each device row says which of the two the account wants:
-- notify_orders (on when the account turns notifications on) and
-- notify_new_boxes (off until the person turns it on). Existing devices keep
-- order updates and lose new-box pushes until asked. A device that moves to
-- another account starts again with new-box pushes off. Each choice is also
-- recorded in private.consent_events with the server time.

begin;

alter table public.push_devices
  add column if not exists notify_orders boolean not null default true,
  add column if not exists notify_new_boxes boolean not null default false;

update public.push_devices set notify_new_boxes = false where notify_new_boxes;

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

  insert into public.push_devices (token, user_id, platform, language, notify_orders, notify_new_boxes)
  values (
    p_token,
    current_user_id,
    p_platform,
    case when p_language = 'en' then 'en' else 'ka' end,
    true,
    false
  )
  on conflict (token) do update set
    -- Another account on the same phone: its own choices, not the last one's.
    notify_new_boxes = case
      when push_devices.user_id = excluded.user_id then push_devices.notify_new_boxes
      else false
    end,
    notify_orders = true,
    user_id = excluded.user_id,
    platform = excluded.platform,
    language = excluded.language,
    updated_at = timezone('utc'::text, now());
end;
$$;

-- The "new boxes" switch for this device, recorded as a consent.
create or replace function public.set_push_new_boxes(p_token text, p_on boolean, p_version text default null)
returns boolean
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

  update public.push_devices
  set notify_new_boxes = coalesce(p_on, false),
      updated_at = timezone('utc'::text, now())
  where token = p_token
    and user_id = current_user_id;

  if not found then
    return false;
  end if;

  insert into private.consent_events (user_id, kind, version, granted, source)
  values (current_user_id, 'push_new_boxes', left(coalesce(nullif(p_version, ''), 'unknown'), 40), coalesce(p_on, false), 'app');

  return true;
end;
$$;

create or replace function public.get_my_push_device(p_token text)
returns table(notify_orders boolean, notify_new_boxes boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select push_devices.notify_orders, push_devices.notify_new_boxes
  from public.push_devices
  where push_devices.token = p_token
    and push_devices.user_id = (select auth.uid());
$$;

revoke all on function public.set_push_new_boxes(text, boolean, text) from public, anon;
revoke all on function public.get_my_push_device(text) from public, anon;
grant execute on function public.set_push_new_boxes(text, boolean, text) to authenticated;
grant execute on function public.get_my_push_device(text) to authenticated;

commit;

-- Down: drop the two functions and columns; restore register_push_device from
-- 20261106120000_push_devices.sql.
