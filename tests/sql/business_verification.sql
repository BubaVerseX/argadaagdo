-- Scenario checks for the verification migrations. Run against a LOCAL database
-- that has both migrations applied. Everything rolls back. Any failure raises.
--   psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f tests/sql/business_verification.sql

begin;

create or replace function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true),
         set_config('role', 'authenticated', true);
$$;
create or replace function pg_temp.act_as_service() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'postgres', true);
$$;
-- True when the statement raises an error containing p_message.
create or replace function pg_temp.raises(p_sql text, p_message text) returns boolean language plpgsql as $$
begin
  execute p_sql;
  return false;
exception when others then
  if position(p_message in sqlerrm) = 0 then
    raise exception 'Expected "%", got "%"', p_message, sqlerrm;
  end if;
  return true;
end;
$$;
create or replace function pg_temp.check(p_ok boolean, p_name text) returns void language plpgsql as $$
begin
  if p_ok is not true then raise exception 'FAILED: %', p_name; end if;
  raise notice 'ok: %', p_name;
end;
$$;

-- Fixtures: an admin, a business owner with a phone, one without, a customer
-- with and without a phone, a demo reviewer.
insert into auth.users (id, email, phone, phone_confirmed_at, email_confirmed_at, raw_user_meta_data, aud, role)
values
  ('00000000-0000-0000-0000-00000000000a', 't-admin@example.com', null, null, now(), '{"role":"customer"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 't-owner@example.com', '995555000001', now(), now(), '{"role":"business"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000c', 't-nophone@example.com', null, null, now(), '{"role":"business"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000d', 't-cust@example.com', null, null, now(), '{"role":"customer"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000e', 't-demo@example.com', null, null, now(), '{"role":"customer"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000f', 't-cust2@example.com', '995555000002', now(), now(), '{"role":"customer"}', 'authenticated', 'authenticated');
insert into public.profiles (id, email, role)
values
  ('00000000-0000-0000-0000-00000000000a', 't-admin@example.com', 'admin'),
  ('00000000-0000-0000-0000-00000000000b', 't-owner@example.com', 'business'),
  ('00000000-0000-0000-0000-00000000000c', 't-nophone@example.com', 'business'),
  ('00000000-0000-0000-0000-00000000000d', 't-cust@example.com', 'customer'),
  ('00000000-0000-0000-0000-00000000000e', 't-demo@example.com', 'customer'),
  ('00000000-0000-0000-0000-00000000000f', 't-cust2@example.com', 'customer')
on conflict (id) do update set role = excluded.role;
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a';
insert into private.review_demo_accounts (user_id) values ('00000000-0000-0000-0000-00000000000e');
insert into storage.objects (bucket_id, name) values
  ('business-documents', '00000000-0000-0000-0000-00000000000b/extract.pdf');

-- A valid TBC IBAN: GE + check + TB + 16 digits.
select pg_temp.check(private.is_valid_tbc_iban('GE' || lpad((98 - (('291100000001234567891614' || '00')::numeric % 97))::text, 2, '0') || 'TB0000000123456789'), 'valid IBAN accepted');
select pg_temp.check(not private.is_valid_tbc_iban('GE00TB0000000123456789'), 'wrong IBAN checksum refused');
select pg_temp.check(not private.is_valid_tbc_iban('GE29NB0000000101904917'), 'non-TBC IBAN refused');

create temp table t_args on commit drop as
select 'GE' || lpad((98 - (('291100000001234567891614' || '00')::numeric % 97))::text, 2, '0') || 'TB0000000123456789' as iban;
grant select on t_args to authenticated;

create or replace function pg_temp.submit(p_iban text, p_id_code text, p_path text) returns text language sql as $$
  select format(
    'select public.submit_business_application(%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%s,%s,%s,%L,%L)',
    'Test Bakery', 'Bakery', 'Rustaveli Ave 1', 'Test Bakery LLC', p_id_code, 'llc', 'Test Owner', p_iban, p_path,
    'Green Bag', 'Bakery', 'M', '10', 'null', '5', '19:00', '21:00');
$$;

-- Applying.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select pg_temp.check(pg_temp.raises(pg_temp.submit((select iban from t_args), '123456789', '00000000-0000-0000-0000-00000000000c/x.pdf'), 'Verify your phone'), 'no phone: application refused');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.check(pg_temp.raises(pg_temp.submit((select iban from t_args), '123456789', 'x/x.pdf'), 'Only business accounts'), 'customer: application refused');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.check(pg_temp.raises(pg_temp.submit((select iban from t_args), '12345', '00000000-0000-0000-0000-00000000000b/extract.pdf'), '9 or 11 digits'), 'bad ID code refused');
select pg_temp.check(pg_temp.raises(pg_temp.submit('GE00TB0000000123456789', '123456789', '00000000-0000-0000-0000-00000000000b/extract.pdf'), 'valid TBC IBAN'), 'bad IBAN refused');
select pg_temp.check(pg_temp.raises(pg_temp.submit((select iban from t_args), '123456789', '00000000-0000-0000-0000-00000000000b/missing.pdf'), 'Registry extract'), 'missing upload refused');
select pg_temp.check(pg_temp.raises(pg_temp.submit((select iban from t_args), '123456789', '00000000-0000-0000-0000-00000000000c/x.pdf'), 'Registry extract'), 'another account''s file refused');
select pg_temp.check(pg_temp.raises($$insert into public.businesses (owner_id, name, approved) values ('00000000-0000-0000-0000-00000000000b', 'Direct', false)$$, 'row-level security'), 'direct insert refused');

create temp table t_biz (id bigint) on commit drop;
grant all on t_biz to authenticated;
do $$ begin execute 'insert into t_biz select (' || substr(pg_temp.submit((select iban from t_args), '123456789', '00000000-0000-0000-0000-00000000000b/extract.pdf'), 8) || ')'; end $$;
select pg_temp.check((select count(*) from t_biz) = 1, 'complete application saved');
select pg_temp.check((select count(*) from public.business_verifications where business_id = (select id from t_biz)) = 1, 'owner can read own legal details');
select pg_temp.check(pg_temp.raises(pg_temp.submit((select iban from t_args), '123456789', '00000000-0000-0000-0000-00000000000b/extract.pdf'), 'already have a business application'), 'second application refused');
select pg_temp.check(pg_temp.raises('select iban from public.business_payout_accounts', 'permission denied'), 'owner cannot read the IBAN table');
select pg_temp.check(pg_temp.raises('select public.admin_list_business_verifications()', 'Only admins'), 'owner cannot use the admin list');
select pg_temp.check(pg_temp.raises(format('select public.admin_confirm_iban_holder(%s, true)', (select id from t_biz)), 'Only admins'), 'owner cannot confirm the IBAN');
select pg_temp.check((select count(*) from storage.objects where bucket_id = 'business-documents') = 0, 'owner cannot read the extract');
select pg_temp.check(pg_temp.raises(format('update public.businesses set approved = true where id = %s; select 1/(select count(*) from public.businesses where id = %s and approved)', (select id from t_biz), (select id from t_biz)), ''), 'owner cannot approve own business');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.check((select count(*) from public.business_verifications) = 0, 'another account sees no legal details');
select pg_temp.check((select count(*) from storage.objects where bucket_id = 'business-documents') = 0, 'customer cannot read the extract');

-- Fee and bag defaults.
select pg_temp.act_as_service();
select pg_temp.check((select platform_fee_rate from public.businesses where id = (select id from t_biz)) = (select (column_default)::numeric from information_schema.columns where table_schema='public' and table_name='businesses' and column_name='platform_fee_rate'), 'new business gets the default fee');
select pg_temp.check((select count(*) from public.bag_templates where business_id = (select id from t_biz)) = 1, 'first bag template saved');

-- Approval.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select pg_temp.check((select count(*) from public.admin_list_business_verifications() where business_id = (select id from t_biz) and iban is not null) = 1, 'admin sees the application with its IBAN');
select pg_temp.check((select count(*) from storage.objects where bucket_id = 'business-documents') = 1, 'admin can read the extract');
select pg_temp.check(pg_temp.raises(format('update public.businesses set approved = true where id = %s', (select id from t_biz)), 'IBAN holder'), 'approval refused before the IBAN check');
select public.admin_confirm_iban_holder((select id from t_biz), true);
update public.businesses set approved = true where id = (select id from t_biz);
select pg_temp.check((select approved from public.businesses where id = (select id from t_biz)), 'approved after the IBAN check');
select pg_temp.act_as_service();
select pg_temp.check((select bool_and(exists (select 1 from private.business_verification_exempt e where e.business_id = b.id)) from public.businesses b where b.is_review_demo or b.id in (select business_id from private.business_verification_exempt)), 'existing businesses stay exempt');

-- Re-approving an existing business still works without documents.
do $$
declare existing bigint;
begin
  select business_id into existing from private.business_verification_exempt limit 1;
  if existing is null then
    raise notice 'skipped: no exempt business in this database';
    return;
  end if;
  perform pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
  update public.businesses set approved = false where id = existing;
  update public.businesses set approved = true where id = existing;
  perform pg_temp.check((select approved from public.businesses where id = existing), 'existing business can be re-approved');
  perform pg_temp.act_as_service();
end $$;

-- Customers (part 2).
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.check(public.phone_verification_required(), 'customer without a phone must verify');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000e');
select pg_temp.check(not public.phone_verification_required(), 'App Review login is exempt');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000f');
select pg_temp.check(not public.phone_verification_required(), 'verified customer can order');

create temp table t_offer on commit drop as select 1 as dummy;
select pg_temp.act_as_service();
do $$
declare offer_id bigint;
begin
  select id into offer_id from public.offers limit 1;
  if offer_id is null then
    insert into public.offers (business_id, title, price, quantity, pickup_date, pickup_start, pickup_end, active, status)
    values ((select id from t_biz), 'Test bag', 10, 5, (now() + interval '2 days')::date, '19:00', '21:00', true, 'active')
    returning id into offer_id;
  end if;
  perform pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
  perform pg_temp.check(pg_temp.raises(format($q$insert into public.orders (user_id, offer_id, status) values ('00000000-0000-0000-0000-00000000000d', %s, 'reserved')$q$, offer_id), ''), 'order without a phone refused');
  perform pg_temp.act_as_service();
end $$;
select pg_temp.check((select count(*) from pg_trigger where tgname = 'orders_guard_phone_verified') = 1, 'phone trigger installed on orders');

-- One account per phone number.
select pg_temp.check(pg_temp.raises($$update auth.users set phone = '995555000001' where id = '00000000-0000-0000-0000-00000000000f'$$, 'duplicate key'), 'duplicate phone refused');

rollback;
