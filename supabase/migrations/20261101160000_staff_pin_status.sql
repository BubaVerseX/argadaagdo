-- Green Bag model, stage 2b (2026-11-01): staff RPCs that never raise.
-- STATUS: applied to production on 2026-11-01 (see version in the migration
-- list; applied right after 20261101110658).
--
-- A PostgREST RPC that raises rolls back its whole transaction, so a wrong
-- PIN recorded by private.record_staff_failure and then raised as
-- 'staff_pin_invalid' was never persisted: the per-device counter could not
-- grow and the lockout never triggered. The staff page now uses three RPCs
-- that return a status ('ok', 'pin_invalid', 'pin_locked', 'rate_limited',
-- ...) and data as jsonb, and never raise for a bad PIN, so failed attempts
-- commit:
--   staff_session(department, pin, device)        -> {status, summary, reservations}
--   staff_collect(department, pin, code, device)  -> text status
--   staff_pause(department, pin, paused, device)  -> {status, changed}
-- The earlier raising RPCs (staff_department_summary, staff_list_reservations,
-- staff_set_sales_paused, staff_complete_pickup) lose their anon/authenticated
-- EXECUTE grant so they cannot be used to guess PINs without being counted;
-- they can be dropped in a later cleanup migration.

begin;

create or replace function private.note_staff_failure(p_department_id bigint, p_device_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  max_attempts constant integer := 5;
  attempts integer;
begin
  insert into private.staff_pin_attempts (department_id, device_key, failed_attempts, last_attempt_at)
  values (p_department_id, p_device_key, 1, timezone('utc'::text, now()))
  on conflict (department_id, device_key) do update
    set failed_attempts = private.staff_pin_attempts.failed_attempts + 1,
        last_attempt_at = excluded.last_attempt_at,
        locked_until = case
          when private.staff_pin_attempts.failed_attempts + 1 >= max_attempts
            then timezone('utc'::text, now()) + interval '15 minutes'
          else private.staff_pin_attempts.locked_until
        end
  returning failed_attempts into attempts;

  return attempts >= max_attempts;
end;
$$;

-- Returns 'ok', 'pin_invalid', 'pin_locked' or 'rate_limited'. Never raises.
create or replace function private.check_staff_pin(p_department_id bigint, p_pin text, p_device text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pin_row record;
  attempt_row record;
  v_device_key text := private.staff_device_key(p_device);
begin
  select * into attempt_row
  from private.staff_pin_attempts
  where department_id = p_department_id and device_key = v_device_key
  for update;

  if found then
    if attempt_row.locked_until is not null and attempt_row.locked_until > timezone('utc'::text, now()) then
      return 'pin_locked';
    end if;

    if attempt_row.last_attempt_at > timezone('utc'::text, now()) - interval '1 second' then
      update private.staff_pin_attempts
      set last_attempt_at = timezone('utc'::text, now())
      where department_id = p_department_id and device_key = v_device_key;
      return 'rate_limited';
    end if;
  end if;

  select * into pin_row
  from private.department_staff_pins
  where department_id = p_department_id;

  if not found or pin_row.pin_hash <> extensions.crypt(coalesce(p_pin, ''), pin_row.pin_hash) then
    if private.note_staff_failure(p_department_id, v_device_key) then
      return 'pin_locked';
    end if;
    return 'pin_invalid';
  end if;

  if attempt_row.failed_attempts is not null and attempt_row.failed_attempts <> 0 then
    delete from private.staff_pin_attempts
    where department_id = p_department_id and device_key = v_device_key;
  end if;

  return 'ok';
end;
$$;

-- One call for the staff page: summary + today's reservations.
create or replace function public.staff_session(p_department_id bigint, p_pin text, p_device text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  pin_status text := private.check_staff_pin(p_department_id, p_pin, p_device);
  department record;
  summary jsonb;
  rows jsonb;
begin
  if pin_status <> 'ok' then
    return jsonb_build_object('status', pin_status);
  end if;

  select departments.id, departments.business_id, departments.is_default into department
  from public.departments where departments.id = p_department_id;

  select jsonb_build_object(
    'business_id', businesses.id,
    'business_name', businesses.name,
    'department_name', departments.name,
    'is_default', departments.is_default,
    'sales_paused', (departments.sales_paused_on = private.tbilisi_today()
      or businesses.sales_paused_on = private.tbilisi_today())
  )
  into summary
  from public.departments
  join public.businesses on businesses.id = departments.business_id
  where departments.id = p_department_id;

  select coalesce(jsonb_agg(row_to_json(r)::jsonb), '[]'::jsonb) into rows
  from (
    select
      orders.id as order_id,
      offers.title,
      offers.category,
      offers.size,
      offers.pickup_date,
      offers.pickup_start,
      offers.pickup_end,
      orders.status,
      case
        when profiles.email is null then null
        else left(split_part(profiles.email, '@', 1), 1) || '***@' || split_part(profiles.email, '@', 2)
      end as customer_hint,
      orders.created_at,
      orders.completed_at
    from public.orders
    join public.offers on offers.id = orders.offer_id
    left join public.profiles on profiles.id = orders.user_id
    where offers.business_id = department.business_id
      and private.offer_in_department(offers.department_id, department.id, department.is_default)
      and offers.pickup_date between private.tbilisi_today() - 1 and private.tbilisi_today() + 1
      and orders.status in ('reserved', 'confirmed', 'collected', 'completed', 'no_show')
    order by
      case when orders.status in ('reserved', 'confirmed') then 0 else 1 end,
      offers.pickup_start,
      orders.id desc
  ) r;

  return jsonb_build_object('status', 'ok', 'summary', summary, 'reservations', rows);
end;
$$;

-- Returns 'completed', 'invalid_code', 'locked' (too many wrong codes),
-- 'ambiguous', 'pin_invalid', 'pin_locked' or 'rate_limited'.
create or replace function public.staff_collect(
  p_department_id bigint,
  p_pin text,
  p_pickup_code text,
  p_device text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pin_status text := private.check_staff_pin(p_department_id, p_pin, p_device);
  v_device_key text := private.staff_device_key(p_device);
  department record;
  matches bigint[];
  target_order record;
  max_attempts constant integer := 5;
  code text := btrim(coalesce(p_pickup_code, ''));
begin
  if pin_status <> 'ok' then
    return pin_status;
  end if;

  select departments.id, departments.business_id, departments.is_default into department
  from public.departments where departments.id = p_department_id;

  if code !~ '^[0-9]{6}$' then
    return 'invalid_code';
  end if;

  select array_agg(orders.id) into matches
  from public.orders
  join public.offers on offers.id = orders.offer_id
  where offers.business_id = department.business_id
    and private.offer_in_department(offers.department_id, department.id, department.is_default)
    and orders.status = 'reserved'
    and orders.pickup_code = code
    and orders.pickup_code_failed_attempts < max_attempts
    and offers.pickup_date between private.tbilisi_today() - 1 and private.tbilisi_today() + 1;

  if matches is null or cardinality(matches) = 0 then
    -- Wrong code: counts against this device like a wrong PIN.
    if private.note_staff_failure(p_department_id, v_device_key) then
      return 'locked';
    end if;
    return 'invalid_code';
  end if;

  if cardinality(matches) > 1 then
    return 'ambiguous';
  end if;

  select orders.id, orders.user_id into target_order
  from public.orders
  where orders.id = matches[1] and orders.status = 'reserved'
  for update;

  if not found then
    return 'invalid_code';
  end if;

  update public.orders
  set status = 'completed',
      completed_at = timezone('utc'::text, now())
  where id = target_order.id;

  update public.profiles
  set completed_pickup_count = completed_pickup_count + 1
  where id = target_order.user_id;

  perform private.apply_reliability_delta(target_order.user_id, 1);

  return 'completed';
end;
$$;

create or replace function public.staff_pause(
  p_department_id bigint,
  p_pin text,
  p_paused boolean,
  p_device text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  pin_status text := private.check_staff_pin(p_department_id, p_pin, p_device);
  department_business_id bigint;
begin
  if pin_status <> 'ok' then
    return jsonb_build_object('status', pin_status);
  end if;

  select business_id into department_business_id
  from public.departments where id = p_department_id;

  return jsonb_build_object(
    'status', 'ok',
    'changed', private.apply_sales_pause(department_business_id, p_department_id, p_paused)
  );
end;
$$;

revoke all on function public.staff_session(bigint, text, text) from public;
revoke all on function public.staff_collect(bigint, text, text, text) from public;
revoke all on function public.staff_pause(bigint, text, boolean, text) from public;
grant execute on function public.staff_session(bigint, text, text) to anon, authenticated;
grant execute on function public.staff_collect(bigint, text, text, text) to anon, authenticated;
grant execute on function public.staff_pause(bigint, text, boolean, text) to anon, authenticated;

-- The raising versions must not stay callable (uncounted PIN guesses).
revoke all on function public.staff_department_summary(bigint, text, text) from public, anon, authenticated;
revoke all on function public.staff_list_reservations(bigint, text, text) from public, anon, authenticated;
revoke all on function public.staff_complete_pickup(bigint, text, text, text) from public, anon, authenticated;
revoke all on function public.staff_set_sales_paused(bigint, text, boolean, text) from public, anon, authenticated;

commit;

-- Down: re-grant the four raising RPCs to anon, authenticated and remove
-- staff_session / staff_collect / staff_pause and private.note_staff_failure.
