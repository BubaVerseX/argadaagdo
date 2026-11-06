-- Profile name and photo (2026-11-07).
-- STATUS: applied to production (Frankfurt) on 2026-11-07 with the owner's OK.
--
-- Name: lives in public.profiles (was auth user_metadata, which anyone can
-- rewrite at will) and changes only through public.set_my_display_name():
-- max 30 characters, letters only (Georgian, Latin, Cyrillic) with single
-- spaces, hyphens or apostrophes between parts, and at most once every 30
-- days. Existing metadata names are copied over without a lock.
-- Photo: private bucket "avatars", one file per person at <uid>/avatar.jpg,
-- max 2 MB, jpeg/png/webp. Only the owner can read, upload, replace or delete
-- it; the app shows it through a short-lived signed URL.

begin;

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists display_name_changed_at timestamp with time zone,
  add column if not exists avatar_path text;

update public.profiles
set display_name = left(btrim(users.raw_user_meta_data ->> 'display_name'), 30)
from auth.users
where users.id = profiles.id
  and profiles.display_name is null
  and coalesce(btrim(users.raw_user_meta_data ->> 'display_name'), '') <> '';

-- Returns {status, display_name, next_change_at}. status: 'ok', 'unchanged',
-- 'too_soon', 'too_long', 'invalid'. Never raises for user input.
create or replace function public.set_my_display_name(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  clean text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  current_row record;
  next_change timestamp with time zone;
begin
  if current_user_id is null then
    raise exception 'Not logged in';
  end if;

  select display_name, display_name_changed_at into current_row
  from public.profiles
  where id = current_user_id
  for update;

  next_change := current_row.display_name_changed_at + interval '30 days';

  if char_length(clean) > 30 then
    return jsonb_build_object('status', 'too_long', 'next_change_at', next_change);
  end if;

  if clean !~ '^[A-Za-zÀ-ÖØ-öø-ÿა-ჿА-Яа-яЁё]+([ ''’-][A-Za-zÀ-ÖØ-öø-ÿა-ჿА-Яа-яЁё]+)*$' then
    return jsonb_build_object('status', 'invalid', 'next_change_at', next_change);
  end if;

  if clean = coalesce(current_row.display_name, '') then
    return jsonb_build_object('status', 'unchanged', 'display_name', clean, 'next_change_at', next_change);
  end if;

  if next_change is not null and next_change > timezone('utc'::text, now()) then
    return jsonb_build_object(
      'status', 'too_soon',
      'display_name', current_row.display_name,
      'next_change_at', next_change
    );
  end if;

  update public.profiles
  set display_name = clean,
      display_name_changed_at = timezone('utc'::text, now())
  where id = current_user_id;

  return jsonb_build_object(
    'status', 'ok',
    'display_name', clean,
    'next_change_at', timezone('utc'::text, now()) + interval '30 days'
  );
end;
$$;

revoke all on function public.set_my_display_name(text) from public, anon;
grant execute on function public.set_my_display_name(text) to authenticated;

-- Records (or clears, with null) the caller's photo. Only <uid>/avatar.jpg
-- that really exists in the bucket is accepted.
create or replace function public.set_my_avatar(p_path text)
returns text
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

  if p_path is null then
    update public.profiles set avatar_path = null where id = current_user_id;
    return null;
  end if;

  if p_path <> current_user_id::text || '/avatar.jpg'
    or not exists (
      select 1 from storage.objects
      where bucket_id = 'avatars' and name = p_path
    )
  then
    raise exception 'Upload the photo first';
  end if;

  update public.profiles set avatar_path = p_path where id = current_user_id;
  return p_path;
end;
$$;

revoke all on function public.set_my_avatar(text) from public, anon;
grant execute on function public.set_my_avatar(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Owners read their avatar" on storage.objects;
drop policy if exists "Owners upload their avatar" on storage.objects;
drop policy if exists "Owners replace their avatar" on storage.objects;
drop policy if exists "Owners delete their avatar" on storage.objects;

create policy "Owners read their avatar"
on storage.objects for select to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners upload their avatar"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners replace their avatar"
on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners delete their avatar"
on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;

-- Down (manual): drop the four avatar policies, delete the avatars bucket
-- (after emptying it), drop set_my_avatar / set_my_display_name and the three
-- profiles columns.
