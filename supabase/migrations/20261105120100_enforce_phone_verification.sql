-- Business verification and phone verification, part 2 of 2 (2026-11-05).
-- STATUS: NOT applied to production. Ask the founder first.
--
-- APPLY LAST, after 20261105120000 is applied, the app code is deployed and a
-- real SMS has been received in production. From this point every customer
-- without a confirmed phone is stopped at their next order.
--
-- A trigger rather than a change to the payment functions: it covers every
-- path that creates an order and can't be skipped by calling an RPC directly.
-- The App Review logins in private.review_demo_accounts are exempt. The service
-- role (no auth.uid) is unaffected.

begin;

create or replace function public.phone_verification_required()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and private.verified_phone((select auth.uid())) is null
    and not exists (
      select 1
      from private.review_demo_accounts
      where user_id = (select auth.uid())
    );
$$;

revoke all on function public.phone_verification_required() from public, anon;
grant execute on function public.phone_verification_required() to authenticated;

create or replace function private.guard_order_phone_verified()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select public.phone_verification_required()) then
    raise exception 'Verify your phone number before ordering';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_order_phone_verified() from public, anon, authenticated;

drop trigger if exists orders_guard_phone_verified on public.orders;
create trigger orders_guard_phone_verified
before insert on public.orders
for each row execute function private.guard_order_phone_verified();

commit;
