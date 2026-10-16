-- Limit wrong pickup-code attempts (2026-10-16).
--
-- Apply only AFTER the app code from the same change is deployed: wrong codes
-- now come back as a result ('invalid_code' / 'locked') instead of an error,
-- and older dashboard code would read that as "the pickup window ended".
--
-- A pickup code is 6 digits, and complete_pickup had no attempt limit, so a
-- business could guess any paid order's code. After 5 wrong codes the order
-- is locked: complete_pickup refuses it, even with the right code, until an
-- admin calls reset_pickup_code_attempts(order_id).
--
-- Why a result instead of an exception: raising rolls back the whole call,
-- including the failed-attempt counter, so a counter can only be kept if the
-- wrong-code path returns normally.

begin;

alter table public.orders
  add column if not exists pickup_code_failed_attempts integer not null default 0;

-- Lets the dashboard show the lock before staff try again.
grant select (pickup_code_failed_attempts) on public.orders to authenticated;

-- The return type changes (void -> text), which CREATE OR REPLACE can't do.
drop function if exists public.complete_pickup(bigint, text);

create function public.complete_pickup(
  p_order_id bigint,
  p_pickup_code text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order record;
  max_attempts constant integer := 5;
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  select
    orders.id,
    orders.user_id,
    orders.offer_id,
    orders.status,
    orders.pickup_code,
    orders.pickup_code_failed_attempts
  into target_order
  from public.orders
  where orders.id = p_order_id
    and orders.status = 'reserved'
  for update;

  if not found then
    raise exception 'Reserved order not found';
  end if;

  if not ((select private.is_admin()) or (select private.owns_offer(target_order.offer_id))) then
    raise exception 'Not allowed to complete this order';
  end if;

  if target_order.pickup_code_failed_attempts >= max_attempts then
    return 'locked';
  end if;

  if target_order.pickup_code is null
    or target_order.pickup_code <> trim(coalesce(p_pickup_code, '')) then
    update public.orders
    set pickup_code_failed_attempts = pickup_code_failed_attempts + 1
    where id = p_order_id;

    return case
      when target_order.pickup_code_failed_attempts + 1 >= max_attempts then 'locked'
      else 'invalid_code'
    end;
  end if;

  update public.orders
  set
    status = 'completed',
    completed_at = timezone('utc'::text, now())
  where id = p_order_id;

  update public.profiles
  set completed_pickup_count = completed_pickup_count + 1
  where id = target_order.user_id;

  perform private.apply_reliability_delta(target_order.user_id, 1);

  return 'completed';
end;
$$;

revoke all on function public.complete_pickup(bigint, text) from public, anon;
grant execute on function public.complete_pickup(bigint, text) to authenticated;

create or replace function public.reset_pickup_code_attempts(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Only admins can unlock pickup codes';
  end if;

  update public.orders
  set pickup_code_failed_attempts = 0
  where id = p_order_id;
end;
$$;

revoke all on function public.reset_pickup_code_attempts(bigint) from public, anon;
grant execute on function public.reset_pickup_code_attempts(bigint) to authenticated;

commit;
