-- Any Georgian bank for payouts, and weekly manual payouts (2026-11-09).
-- STATUS: applied to production (Frankfurt) on 2026-11-09 with the owner's OK.
--
-- Businesses may now give an IBAN at any Georgian bank. A TBC Bank account is
-- paid through TBC's split (once TBC_SPLIT_ENABLED is on). Every other payment
-- comes to us in full, and the business share is transferred by hand every
-- Monday. payments.payout_mode records which way each payment went; the admin
-- page lists what is due and records each transfer.

begin;

-- 1. IBAN at any Georgian bank: GEkk + 2-letter bank code + 16 digits, mod-97.
create or replace function private.is_valid_georgian_iban(p_iban text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  rearranged text;
  remainder integer := 0;
  character_value text;
  index_position integer;
  digit_position integer;
begin
  if p_iban is null or p_iban !~ '^GE[0-9]{2}[A-Z]{2}[0-9]{16}$' then
    return false;
  end if;

  rearranged := substr(p_iban, 5) || substr(p_iban, 1, 4);

  for index_position in 1..length(rearranged) loop
    character_value := substr(rearranged, index_position, 1);

    if character_value ~ '[A-Z]' then
      character_value := (ascii(character_value) - 55)::text;
    end if;

    for digit_position in 1..length(character_value) loop
      remainder :=
        (remainder * 10 + substr(character_value, digit_position, 1)::integer) % 97;
    end loop;
  end loop;

  return remainder = 1;
end;
$$;

revoke all on function private.is_valid_georgian_iban(text) from public, anon, authenticated;

alter table public.business_payout_accounts
  drop constraint if exists business_payout_accounts_iban_check;
alter table public.business_payout_accounts
  add constraint business_payout_accounts_iban_check
    check (iban ~ '^GE[0-9]{2}[A-Z]{2}[0-9]{16}$');

-- 2. The application accepts any Georgian bank (otherwise unchanged from
--    20261106180000_audit_security_fixes).
create or replace function public.submit_business_application(
  p_name text,
  p_business_type text,
  p_address text,
  p_legal_name text,
  p_id_code text,
  p_legal_form text,
  p_owner_full_name text,
  p_iban text,
  p_registry_extract_path text,
  p_bag_title text default null,
  p_bag_category text default null,
  p_bag_size text default null,
  p_bag_price numeric default null,
  p_bag_old_price numeric default null,
  p_bag_daily_quantity integer default null,
  p_bag_pickup_start text default null,
  p_bag_pickup_end text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  v_phone text;
  target_business public.businesses%rowtype;
  target_business_id bigint;
  default_department_id bigint;
  clean_iban text := upper(regexp_replace(coalesce(p_iban, ''), '\s', '', 'g'));
  clean_id_code text := btrim(coalesce(p_id_code, ''));
begin
  if current_user_id is null then
    raise exception 'Not logged in';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = current_user_id
      and role = 'business'
  ) then
    raise exception 'Only business accounts can register a business';
  end if;

  v_phone := private.verified_phone(current_user_id);

  if v_phone is null then
    raise exception 'Verify your phone number first';
  end if;

  if length(btrim(coalesce(p_name, ''))) not between 2 and 80
    or length(btrim(coalesce(p_business_type, ''))) not between 2 and 60
    or length(btrim(coalesce(p_address, ''))) not between 5 and 160
    or length(btrim(coalesce(p_legal_name, ''))) not between 2 and 160
    or length(btrim(coalesce(p_owner_full_name, ''))) not between 3 and 120
  then
    raise exception 'Please complete all company details';
  end if;

  if clean_id_code !~ '^([0-9]{9}|[0-9]{11})$' then
    raise exception 'Identification code must have 9 or 11 digits';
  end if;

  if not private.is_valid_georgian_iban(clean_iban) then
    raise exception 'Enter a valid Georgian IBAN';
  end if;

  if split_part(coalesce(p_registry_extract_path, ''), '/', 1) <> current_user_id::text
    or not exists (
      select 1
      from storage.objects
      where bucket_id = 'business-documents'
        and name = p_registry_extract_path
    )
  then
    raise exception 'Upload the Public Registry extract first';
  end if;

  -- A rejected application is corrected and sent again, not filed twice.
  select *
  into target_business
  from public.businesses
  where owner_id = current_user_id
    and approved is not true
  order by rejected_at nulls first, id
  limit 1
  for update;

  if found and target_business.rejected_at is null then
    raise exception 'You already have a business application waiting for admin approval';
  end if;

  if found then
    target_business_id := target_business.id;

    update public.businesses
    set
      name = btrim(p_name),
      business_type = btrim(p_business_type),
      address = btrim(p_address),
      phone = '+' || v_phone,
      rejected_at = null,
      rejection_reason = null
    where id = target_business_id;
  else
    insert into public.businesses (owner_id, name, business_type, address, phone, approved)
    values (
      current_user_id,
      btrim(p_name),
      btrim(p_business_type),
      btrim(p_address),
      '+' || v_phone,
      false
    )
    returning id into target_business_id;
  end if;

  insert into public.business_verifications (
    business_id,
    legal_name,
    id_code,
    legal_form,
    owner_full_name,
    verified_phone,
    registry_extract_path
  )
  values (
    target_business_id,
    btrim(p_legal_name),
    clean_id_code,
    p_legal_form,
    btrim(p_owner_full_name),
    v_phone,
    p_registry_extract_path
  )
  on conflict (business_id) do update set
    legal_name = excluded.legal_name,
    id_code = excluded.id_code,
    legal_form = excluded.legal_form,
    owner_full_name = excluded.owner_full_name,
    verified_phone = excluded.verified_phone,
    registry_extract_path = excluded.registry_extract_path,
    submitted_at = timezone('utc'::text, now()),
    -- Changed details must be checked again.
    iban_holder_confirmed_at = null,
    iban_holder_confirmed_by = null;

  insert into public.business_payout_accounts (business_id, iban)
  values (target_business_id, clean_iban)
  on conflict (business_id) do update set
    iban = excluded.iban,
    updated_at = timezone('utc'::text, now());

  select id into default_department_id
  from public.departments
  where business_id = target_business_id and is_default
  limit 1;

  if default_department_id is null then
    insert into public.departments (business_id, name, is_default)
    values (target_business_id, 'Main', true)
    returning id into default_department_id;
  end if;

  -- First bag template. It stays inert until approval, because publishing
  -- requires an approved business.
  if not exists (
    select 1 from public.bag_templates where business_id = target_business_id
  ) then
    if p_bag_title is null then
      raise exception 'Please add your first bag';
    end if;

    insert into public.bag_templates (
      business_id,
      department_id,
      title,
      category,
      size,
      price,
      old_price,
      daily_quantity,
      pickup_start,
      pickup_end
    )
    values (
      target_business_id,
      default_department_id,
      btrim(p_bag_title),
      p_bag_category,
      p_bag_size,
      p_bag_price,
      p_bag_old_price,
      p_bag_daily_quantity,
      p_bag_pickup_start,
      p_bag_pickup_end
    );
  end if;

  return target_business_id;
end;
$$;


-- 3. Which way the business share of a payment goes.
alter table public.payments add column if not exists payout_mode text;
alter table public.payments drop constraint if exists payments_payout_mode_check;
alter table public.payments
  add constraint payments_payout_mode_check
    check (payout_mode is null or payout_mode in ('split', 'manual'));
comment on column public.payments.payout_mode is
  'split: TBC sent the business share straight to the business. manual: the full amount came to us and the share is transferred by hand every week. Null: before 2026-11-09 (treated as manual).';

-- 4. Manual payouts: one row per transfer, one item per payment it covers.
create table if not exists private.manual_payouts (
  id bigint generated always as identity primary key,
  business_id bigint references public.businesses (id) on delete set null,
  legal_name text,
  iban text not null,
  amount numeric(10, 2) not null check (amount > 0),
  paid_at timestamp with time zone not null default timezone('utc'::text, now()),
  paid_by uuid references auth.users (id) on delete set null
);

create table if not exists private.manual_payout_items (
  payment_id bigint primary key,
  payout_id bigint not null references private.manual_payouts (id) on delete cascade,
  amount numeric(10, 2) not null
);

alter table private.manual_payouts enable row level security;
alter table private.manual_payout_items enable row level security;
revoke all on table private.manual_payouts from public, anon, authenticated;
revoke all on table private.manual_payout_items from public, anon, authenticated;

-- What each business is owed: paid, not split, picked up or missed, not yet
-- transferred. Review-demo businesses and free boxes are left out.
create or replace function public.admin_list_due_payouts()
returns table (
  business_id bigint,
  business_name text,
  legal_name text,
  iban text,
  is_tbc boolean,
  payment_ids bigint[],
  order_count integer,
  amount numeric,
  first_order_at timestamp with time zone,
  last_order_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Admins only';
  end if;

  return query
  select
    businesses.id,
    businesses.name,
    verifications.legal_name,
    payout_accounts.iban,
    coalesce(payout_accounts.iban like 'GE__TB%', false),
    array_agg(payments.id order by payments.id),
    count(*)::integer,
    sum(payments.business_amount)::numeric,
    min(orders.created_at),
    max(orders.created_at)
  from public.payments
  join public.orders on orders.id = payments.order_id
  join public.offers on offers.id = payments.offer_id
  join public.businesses on businesses.id = offers.business_id
  left join public.business_payout_accounts payout_accounts
    on payout_accounts.business_id = businesses.id
  left join public.business_verifications verifications
    on verifications.business_id = businesses.id
  where payments.status = 'paid'
    and coalesce(payments.payout_mode, 'manual') = 'manual'
    and payments.business_amount > 0
    and orders.status in ('completed', 'no_show')
    and not coalesce(businesses.is_review_demo, false)
    and not exists (
      select 1 from private.manual_payout_items items
      where items.payment_id = payments.id
    )
  group by businesses.id, businesses.name, verifications.legal_name, payout_accounts.iban
  order by sum(payments.business_amount) desc;
end;
$$;

-- Records a transfer the admin has made. The amount is worked out here, from
-- the payments listed, which must all still be due for this business.
create or replace function public.admin_mark_payout_paid(
  p_business_id bigint,
  p_payment_ids bigint[]
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  due_count integer;
  due_amount numeric;
  payout_iban text;
  payout_legal_name text;
  new_payout_id bigint;
begin
  if not (select private.is_admin()) then
    raise exception 'Admins only';
  end if;

  if p_payment_ids is null or cardinality(p_payment_ids) = 0 then
    raise exception 'Nothing to pay out';
  end if;

  select count(*), sum(payments.business_amount)
  into due_count, due_amount
  from public.payments
  join public.orders on orders.id = payments.order_id
  join public.offers on offers.id = payments.offer_id
  where payments.id = any (p_payment_ids)
    and offers.business_id = p_business_id
    and payments.status = 'paid'
    and coalesce(payments.payout_mode, 'manual') = 'manual'
    and payments.business_amount > 0
    and orders.status in ('completed', 'no_show')
    and not exists (
      select 1 from private.manual_payout_items items
      where items.payment_id = payments.id
    );

  if due_count <> cardinality(p_payment_ids) then
    raise exception 'The payout list changed. Reload the page.';
  end if;

  select iban into payout_iban
  from public.business_payout_accounts
  where business_id = p_business_id;

  if payout_iban is null then
    raise exception 'This business has no IBAN on file';
  end if;

  select legal_name into payout_legal_name
  from public.business_verifications
  where business_id = p_business_id;

  insert into private.manual_payouts (business_id, legal_name, iban, amount, paid_by)
  values (p_business_id, payout_legal_name, payout_iban, due_amount, (select auth.uid()))
  returning id into new_payout_id;

  insert into private.manual_payout_items (payment_id, payout_id, amount)
  select payments.id, new_payout_id, payments.business_amount
  from public.payments
  where payments.id = any (p_payment_ids);

  return new_payout_id;
end;
$$;

-- The latest transfers, for the admin page.
create or replace function public.admin_list_manual_payouts(p_limit integer default 20)
returns table (
  id bigint,
  business_id bigint,
  business_name text,
  legal_name text,
  iban text,
  amount numeric,
  item_count integer,
  paid_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Admins only';
  end if;

  return query
  select
    payouts.id,
    payouts.business_id,
    businesses.name,
    payouts.legal_name,
    payouts.iban,
    payouts.amount,
    (select count(*)::integer from private.manual_payout_items items where items.payout_id = payouts.id),
    payouts.paid_at
  from private.manual_payouts payouts
  left join public.businesses on businesses.id = payouts.business_id
  order by payouts.paid_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
end;
$$;

revoke all on function public.admin_list_due_payouts() from public, anon;
revoke all on function public.admin_mark_payout_paid(bigint, bigint[]) from public, anon;
revoke all on function public.admin_list_manual_payouts(integer) from public, anon;
grant execute on function public.admin_list_due_payouts() to authenticated;
grant execute on function public.admin_mark_payout_paid(bigint, bigint[]) to authenticated;
grant execute on function public.admin_list_manual_payouts(integer) to authenticated;

commit;

-- Down: drop the three admin functions, private.manual_payout_items,
-- private.manual_payouts and payments.payout_mode; restore the TBC-only IBAN
-- check (constraint and submit_business_application from 20261106180000).
