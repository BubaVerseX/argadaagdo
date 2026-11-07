-- Consent records (owner decision 4, 2026-11-07; PDP Law Art. 37).
-- STATUS: applied to production (Frankfurt) on 2026-11-07 with the owner's OK.
--
-- One row per consent given or withdrawn, with the server time:
-- - data_transfer: transfer of personal data to providers outside Georgia
--   (sign-up checkbox, stored by handle_new_user from the sign-up metadata;
--   older accounts confirm once in the app, components/ConsentGate.tsx)
-- - push_orders / push_new_boxes: the two notification switches
-- - business_terms: acceptance of the Business Terms at registration
-- Rows go with the account (on delete cascade).

begin;

create table if not exists private.consent_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('data_transfer', 'push_orders', 'push_new_boxes', 'business_terms')),
  version text not null check (char_length(version) between 1 and 40),
  granted boolean not null,
  source text check (source is null or char_length(source) <= 20),
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists consent_events_user_kind_idx
  on private.consent_events (user_id, kind, created_at desc);

alter table private.consent_events enable row level security;
revoke all on table private.consent_events from public, anon, authenticated;

-- Sign-up: the checkbox value travels in the sign-up metadata.
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

  if coalesce(new.raw_user_meta_data ->> 'data_transfer_consent', '') <> '' then
    insert into private.consent_events (user_id, kind, version, granted, source)
    values (
      new.id,
      'data_transfer',
      left(new.raw_user_meta_data ->> 'data_transfer_consent', 40),
      true,
      'signup'
    );
  end if;

  return new;
end;
$$;

create or replace function public.record_my_consent(
  p_kind text,
  p_version text,
  p_granted boolean,
  p_source text default null
)
returns timestamp with time zone
language plpgsql
security definer
set search_path = ''
as $$
declare
  recorded_at timestamp with time zone;
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;
  if p_kind not in ('data_transfer', 'push_orders', 'push_new_boxes', 'business_terms') then
    raise exception 'Unknown consent';
  end if;
  insert into private.consent_events (user_id, kind, version, granted, source)
  values (
    (select auth.uid()),
    p_kind,
    left(coalesce(nullif(btrim(p_version), ''), 'unknown'), 40),
    coalesce(p_granted, false),
    left(nullif(btrim(coalesce(p_source, '')), ''), 20)
  )
  returning created_at into recorded_at;
  return recorded_at;
end;
$$;

-- The latest choice per kind for the signed-in user.
create or replace function public.get_my_consents()
returns table(kind text, version text, granted boolean, created_at timestamp with time zone)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (consent_events.kind)
    consent_events.kind,
    consent_events.version,
    consent_events.granted,
    consent_events.created_at
  from private.consent_events
  where consent_events.user_id = (select auth.uid())
  order by consent_events.kind, consent_events.created_at desc, consent_events.id desc;
$$;

revoke all on function public.record_my_consent(text, text, boolean, text) from public, anon;
revoke all on function public.get_my_consents() from public, anon;
grant execute on function public.record_my_consent(text, text, boolean, text) to authenticated;
grant execute on function public.get_my_consents() to authenticated;

commit;

-- Down: drop function public.get_my_consents(); drop function public.record_my_consent(text, text, boolean, text);
-- drop table private.consent_events; restore private.handle_new_user from 20261016101117.
