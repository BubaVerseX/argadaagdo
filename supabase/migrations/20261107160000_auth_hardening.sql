-- Auth hardening (check-2 #33, 2026-11-07).
-- STATUS: applied to production (Frankfurt) on 2026-11-07 with the owner's OK.
--
-- 1. Password re-check for account deletion and password change: a stolen
--    session alone can no longer delete the account or set a new password.
--    The password is compared with the stored bcrypt hash inside the
--    database (no extra sign-in, so it also works once captcha is on).
--    5 wrong tries lock the check for 15 minutes.
-- 2. Staff PINs: new PINs must have 6 digits (old 4-8 digit PINs keep
--    working until changed). The department-wide lock now needs 100 wrong
--    tries in an hour (was 30), so a few people can't lock a shop's staff
--    page; device (5) and network (10) limits are unchanged.

begin;

create table if not exists private.password_check_failures (
  user_id uuid not null references auth.users (id) on delete cascade,
  failed_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists password_check_failures_user_idx
  on private.password_check_failures (user_id, failed_at);

alter table private.password_check_failures enable row level security;
revoke all on table private.password_check_failures from public, anon, authenticated;

-- 'ok', 'wrong' or 'locked'.
create or replace function private.check_password(p_user_id uuid, p_password text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  stored_hash text;
begin
  delete from private.password_check_failures
  where failed_at < timezone('utc'::text, now()) - interval '1 day';

  if (
    select count(*) from private.password_check_failures
    where user_id = p_user_id
      and failed_at > timezone('utc'::text, now()) - interval '15 minutes'
  ) >= 5 then
    return 'locked';
  end if;

  select encrypted_password into stored_hash from auth.users where id = p_user_id;

  if stored_hash is null
    or coalesce(p_password, '') = ''
    or stored_hash <> extensions.crypt(p_password, stored_hash) then
    insert into private.password_check_failures (user_id) values (p_user_id);
    return 'wrong';
  end if;

  delete from private.password_check_failures where user_id = p_user_id;
  return 'ok';
end;
$$;

revoke all on function private.check_password(uuid, text) from public, anon, authenticated;

-- For the signed-in person (change password in Settings).
create or replace function public.verify_my_password(p_password text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;
  return private.check_password((select auth.uid()), p_password);
end;
$$;

-- For server routes (account deletion), service role only.
create or replace function public.check_user_password(p_user_id uuid, p_password text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    raise exception 'Server only';
  end if;
  return private.check_password(p_user_id, p_password);
end;
$$;

revoke all on function public.verify_my_password(text) from public, anon;
revoke all on function public.check_user_password(uuid, text) from public, anon, authenticated;
grant execute on function public.verify_my_password(text) to authenticated;
grant execute on function public.check_user_password(uuid, text) to service_role;

-- Staff PINs ------------------------------------------------------------------------

create or replace function private.note_staff_failure(p_department_id bigint, p_device_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked_device boolean;
  locked_ip boolean;
  locked_department boolean;
begin
  locked_device := private.bump_staff_counter(p_department_id, p_device_key, 5, interval '15 minutes');
  locked_ip := private.bump_staff_counter(
    p_department_id, 'ip|' || split_part(p_device_key, '|', 1), 10, interval '15 minutes'
  );
  locked_department := private.bump_staff_counter(p_department_id, 'department', 100, interval '1 hour');

  return locked_device or locked_ip or locked_department;
end;
$$;

create or replace function public.set_department_staff_pin(p_department_id bigint, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  department_business_id bigint;
  normalized_pin text := nullif(btrim(coalesce(p_pin, '')), '');
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;
  select business_id into department_business_id
  from public.departments
  where id = p_department_id;
  if department_business_id is null then
    raise exception 'Department not found';
  end if;
  if not ((select private.is_admin()) or (select private.owns_approved_business(department_business_id))) then
    raise exception 'Not allowed to manage this department';
  end if;
  if normalized_pin is null then
    delete from private.department_staff_pins where department_id = p_department_id;
    update public.departments set has_staff_pin = false where id = p_department_id;
    return false;
  end if;
  if normalized_pin !~ '^[0-9]{6}$' then
    raise exception 'PIN must be 6 digits' using errcode = 'check_violation';
  end if;
  insert into private.department_staff_pins (department_id, pin_hash, updated_at)
  values (
    p_department_id,
    extensions.crypt(normalized_pin, extensions.gen_salt('bf')),
    timezone('utc'::text, now())
  )
  on conflict (department_id) do update
    set pin_hash = excluded.pin_hash,
        updated_at = excluded.updated_at;
  delete from private.staff_pin_attempts where department_id = p_department_id;
  update public.departments set has_staff_pin = true where id = p_department_id;
  return true;
end;
$$;

commit;

-- Down: drop the password functions and table; restore note_staff_failure and
-- set_department_staff_pin from 20261101160000 / 20261106180000.
