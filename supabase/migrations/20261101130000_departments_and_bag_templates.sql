-- Green Bag model, stage 2 (2026-11-01): departments, bag templates with
-- auto-publish, "Today: no bags", department staff PINs.
-- STATUS: not applied. Additive: new tables, new nullable offer columns and
-- new RPCs. The live app ignores all of it, and the App Review demo flow
-- (reserve_review_demo_offer, complete_pickup, refresh_review_demo_offers)
-- is untouched.
--
-- Model
--  - departments: a business can split into departments (Bakery, Produce,
--    Deli, ...). A small shop has one default department, created lazily by
--    ensure_default_department; offers with department_id null belong to it.
--  - bag_templates: category + size/price + bags per day (daily_quantity, or
--    null = "until stopped") + pickup window + days of week. The daily cron
--    (publish_bag_templates, service role only) creates tomorrow's offers
--    from active templates; publish_bag_template_now lets the owner create
--    today's or tomorrow's offer by hand.
--  - "Today: no bags": set_sales_paused marks the business or department as
--    paused for the Tbilisi date and sets today's unsold offers inactive
--    (paused_at). Sold bags stay reserved and are fulfilled or cancelled
--    through the existing flow. Turning sales back on reactivates them.
--  - Staff PIN: private.department_staff_pins holds a bcrypt hash per
--    department. staff_* RPCs (callable without a login) verify the PIN,
--    list today's reservations and complete a pickup by code; 5 wrong PINs
--    or codes lock the department for 15 minutes.
--
-- New RLS policies exist only for the two new tables; no existing policy or
-- auth setting changes.

begin;

-- 1. Departments ---------------------------------------------------------------
create table if not exists public.departments (
  id bigint generated always as identity primary key,
  business_id bigint not null references public.businesses (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 60),
  is_default boolean not null default false,
  has_staff_pin boolean not null default false,
  sales_paused_on date,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create unique index if not exists departments_default_per_business
  on public.departments (business_id) where is_default;
create index if not exists departments_business_idx
  on public.departments (business_id);

alter table public.departments enable row level security;

drop policy if exists "Approved business owners manage own departments" on public.departments;
create policy "Approved business owners manage own departments"
on public.departments
for all
to authenticated
using ((select private.owns_approved_business(departments.business_id)))
with check ((select private.owns_approved_business(departments.business_id)));

drop policy if exists "Admins can view departments" on public.departments;
create policy "Admins can view departments"
on public.departments
for select
to authenticated
using ((select private.is_admin()));

-- Customers see the department name on offers of approved businesses.
drop policy if exists "Anyone can view departments of approved businesses" on public.departments;
create policy "Anyone can view departments of approved businesses"
on public.departments
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.businesses
    where businesses.id = departments.business_id
      and businesses.approved = true
      and not businesses.is_review_demo
  )
);

grant select, insert, update, delete on public.departments to authenticated;
grant select on public.departments to anon;

-- Store-wide "Today: no bags".
alter table public.businesses
  add column if not exists sales_paused_on date;

-- 2. Staff PINs (private) ----------------------------------------------------------
create table if not exists private.department_staff_pins (
  department_id bigint primary key references public.departments (id) on delete cascade,
  pin_hash text not null,
  failed_attempts integer not null default 0,
  locked_until timestamp with time zone,
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table private.department_staff_pins enable row level security;
revoke all on table private.department_staff_pins from public, anon, authenticated;

-- 3. Bag templates ---------------------------------------------------------------------
create table if not exists public.bag_templates (
  id bigint generated always as identity primary key,
  business_id bigint not null references public.businesses (id) on delete cascade,
  department_id bigint references public.departments (id) on delete cascade,
  title text not null check (length(btrim(title)) between 3 and 120),
  description text check (description is null or length(description) <= 500),
  category text not null
    check (category in ('Bakery', 'Fruit & veg', 'Dairy', 'Deli', 'Mixed')),
  size text not null check (size in ('S', 'M', 'L')),
  price numeric(10, 2) not null check (price > 0),
  old_price numeric(10, 2) check (old_price is null or old_price > price),
  -- Bags per day. Null = "until stopped": the daily offer gets a large
  -- quantity and offers.unlimited_quantity, and sales end with "Today: no bags".
  daily_quantity integer
    check (daily_quantity is null or daily_quantity between 1 and 500),
  pickup_start text not null
    check (pickup_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  pickup_end text not null
    check (pickup_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  -- ISO weekdays, 1 = Monday ... 7 = Sunday.
  days_of_week smallint[] not null default '{1,2,3,4,5,6,7}',
  image_url text,
  active boolean not null default true,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint bag_templates_window check (pickup_start < pickup_end),
  constraint bag_templates_days check (
    cardinality(days_of_week) between 1 and 7
    and days_of_week <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
  )
);

create index if not exists bag_templates_business_idx
  on public.bag_templates (business_id);

alter table public.bag_templates enable row level security;

drop policy if exists "Approved business owners manage own bag templates" on public.bag_templates;
create policy "Approved business owners manage own bag templates"
on public.bag_templates
for all
to authenticated
using ((select private.owns_approved_business(bag_templates.business_id)))
with check ((select private.owns_approved_business(bag_templates.business_id)));

drop policy if exists "Admins can view bag templates" on public.bag_templates;
create policy "Admins can view bag templates"
on public.bag_templates
for select
to authenticated
using ((select private.is_admin()));

grant select, insert, update, delete on public.bag_templates to authenticated;

-- A template's department must belong to the template's business.
create or replace function private.guard_template_department()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.department_id is not null and not exists (
    select 1
    from public.departments
    where departments.id = new.department_id
      and departments.business_id = new.business_id
  ) then
    raise exception 'Department does not belong to this business'
      using errcode = 'check_violation';
  end if;

  new.updated_at := timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists bag_templates_guard_department on public.bag_templates;
create trigger bag_templates_guard_department
before insert or update on public.bag_templates
for each row execute function private.guard_template_department();

-- 4. Offers: department, template, pause marker -------------------------------------------
alter table public.offers
  add column if not exists department_id bigint references public.departments (id) on delete set null,
  add column if not exists template_id bigint references public.bag_templates (id) on delete set null,
  add column if not exists paused_at timestamp with time zone;

create index if not exists offers_template_date_idx
  on public.offers (template_id, pickup_date) where template_id is not null;
create index if not exists offers_department_idx
  on public.offers (department_id) where department_id is not null;

create or replace function private.guard_offer_department()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.department_id is not null and not exists (
    select 1
    from public.departments
    where departments.id = new.department_id
      and departments.business_id = new.business_id
  ) then
    raise exception 'Department does not belong to this business'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists offers_guard_department on public.offers;
create trigger offers_guard_department
before insert or update of department_id, business_id on public.offers
for each row execute function private.guard_offer_department();

-- 5. Helpers --------------------------------------------------------------------------------
create or replace function private.tbilisi_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (timezone('Asia/Tbilisi'::text, now()))::date;
$$;

-- True when an offer belongs to the department: directly, or (for the
-- default department) through a null department_id.
create or replace function private.offer_in_department(
  p_offer_department_id bigint,
  p_department_id bigint,
  p_department_is_default boolean
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_offer_department_id = p_department_id
    or (p_offer_department_id is null and p_department_is_default);
$$;

create or replace function public.ensure_default_department(p_business_id bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  department_id bigint;
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  if not ((select private.is_admin()) or (select private.owns_approved_business(p_business_id))) then
    raise exception 'Not allowed to manage this business';
  end if;

  select id into department_id
  from public.departments
  where business_id = p_business_id and is_default
  limit 1;

  if department_id is null then
    insert into public.departments (business_id, name, is_default)
    values (p_business_id, 'Main', true)
    on conflict do nothing
    returning id into department_id;

    if department_id is null then
      select id into department_id
      from public.departments
      where business_id = p_business_id and is_default
      limit 1;
    end if;
  end if;

  return department_id;
end;
$$;

revoke all on function public.ensure_default_department(bigint) from public, anon;
grant execute on function public.ensure_default_department(bigint) to authenticated;

-- 6. "Today: no bags" --------------------------------------------------------------------------
-- Pauses (or resumes) sales for the business (p_department_id null) or one
-- department, for today's Tbilisi date. Returns the number of offers changed.
create or replace function private.apply_sales_pause(
  p_business_id bigint,
  p_department_id bigint,
  p_paused boolean
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := private.tbilisi_today();
  department_is_default boolean := false;
  changed integer := 0;
begin
  if p_department_id is not null then
    select is_default into department_is_default
    from public.departments
    where id = p_department_id and business_id = p_business_id;

    if not found then
      raise exception 'Department not found';
    end if;

    update public.departments
    set sales_paused_on = case when p_paused then today else null end
    where id = p_department_id;
  else
    update public.businesses
    set sales_paused_on = case when p_paused then today else null end
    where id = p_business_id;
  end if;

  if p_paused then
    update public.offers
    set active = false,
        status = 'inactive',
        paused_at = timezone('utc'::text, now())
    where business_id = p_business_id
      and pickup_date = today
      and active = true
      and coalesce(status, 'active') = 'active'
      and (
        p_department_id is null
        or private.offer_in_department(department_id, p_department_id, department_is_default)
      );
  else
    update public.offers
    set active = true,
        status = 'active',
        paused_at = null
    where business_id = p_business_id
      and paused_at is not null
      and pickup_date >= today
      and coalesce(quantity, 0) > 0
      and private.pickup_end_at(pickup_date, pickup_end::text) > now()
      and (
        p_department_id is null
        or private.offer_in_department(department_id, p_department_id, department_is_default)
      );

    get diagnostics changed = row_count;

    -- Bags paused earlier whose window has passed stay inactive; just drop the marker.
    update public.offers
    set paused_at = null
    where business_id = p_business_id
      and paused_at is not null
      and (
        p_department_id is null
        or private.offer_in_department(department_id, p_department_id, department_is_default)
      );

    return changed;
  end if;

  get diagnostics changed = row_count;
  return changed;
end;
$$;

create or replace function public.set_sales_paused(
  p_business_id bigint,
  p_department_id bigint,
  p_paused boolean
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  if not ((select private.is_admin()) or (select private.owns_approved_business(p_business_id))) then
    raise exception 'Not allowed to manage this business';
  end if;

  return private.apply_sales_pause(p_business_id, p_department_id, p_paused);
end;
$$;

revoke all on function public.set_sales_paused(bigint, bigint, boolean) from public, anon;
grant execute on function public.set_sales_paused(bigint, bigint, boolean) to authenticated;

-- 7. Templates -> offers ----------------------------------------------------------------------
-- Creates the offer for one template and date. Returns the new offer id, or
-- null when nothing was created (template inactive, wrong weekday, business
-- not approved, already published for that date, window already over, or
-- sales paused for that date).
create or replace function private.publish_bag_template(p_template_id bigint, p_date date)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  template record;
  new_offer_id bigint;
begin
  select bag_templates.*, businesses.approved, businesses.sales_paused_on as business_paused_on
  into template
  from public.bag_templates
  join public.businesses on businesses.id = bag_templates.business_id
  where bag_templates.id = p_template_id
  for update of bag_templates;

  if not found or not template.active or not template.approved then
    return null;
  end if;

  if not (extract(isodow from p_date)::smallint = any (template.days_of_week)) then
    return null;
  end if;

  if template.business_paused_on = p_date then
    return null;
  end if;

  if template.department_id is not null and exists (
    select 1
    from public.departments
    where id = template.department_id
      and sales_paused_on = p_date
  ) then
    return null;
  end if;

  if private.pickup_end_at(p_date, template.pickup_end) <= now() then
    return null;
  end if;

  if exists (
    select 1 from public.offers
    where template_id = p_template_id and pickup_date = p_date
  ) then
    return null;
  end if;

  insert into public.offers (
    business_id, department_id, template_id, title, description, category, size,
    price, old_price, quantity, unlimited_quantity, pickup_date, pickup_start,
    pickup_end, image_url, active, status
  )
  values (
    template.business_id, template.department_id, p_template_id, template.title,
    template.description, template.category, template.size, template.price,
    template.old_price, coalesce(template.daily_quantity, 500),
    template.daily_quantity is null, p_date, template.pickup_start,
    template.pickup_end, template.image_url, true, 'active'
  )
  returning id into new_offer_id;

  return new_offer_id;
end;
$$;

-- Daily job (service role only): publish every active template for p_date,
-- by default tomorrow in Tbilisi. Returns the number of offers created.
create or replace function public.publish_bag_templates(p_date date default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_date date := coalesce(p_date, private.tbilisi_today() + 1);
  template_row record;
  created integer := 0;
begin
  if (select auth.uid()) is not null then
    raise exception 'Only the service role can run the template job';
  end if;

  for template_row in
    select id from public.bag_templates where active order by id
  loop
    if private.publish_bag_template(template_row.id, target_date) is not null then
      created := created + 1;
    end if;
  end loop;

  return created;
end;
$$;

revoke all on function public.publish_bag_templates(date) from public, anon, authenticated;

-- Owner action: create this template's offer for today or tomorrow now.
create or replace function public.publish_bag_template_now(p_template_id bigint, p_date date)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  template_business_id bigint;
  today date := private.tbilisi_today();
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  select business_id into template_business_id
  from public.bag_templates
  where id = p_template_id;

  if template_business_id is null then
    raise exception 'Template not found';
  end if;

  if not ((select private.is_admin()) or (select private.owns_approved_business(template_business_id))) then
    raise exception 'Not allowed to publish this template';
  end if;

  if p_date not in (today, today + 1) then
    raise exception 'Templates can only be published for today or tomorrow';
  end if;

  return private.publish_bag_template(p_template_id, p_date);
end;
$$;

revoke all on function public.publish_bag_template_now(bigint, date) from public, anon;
grant execute on function public.publish_bag_template_now(bigint, date) to authenticated;

-- 8. Staff PIN ---------------------------------------------------------------------------------
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

  if normalized_pin !~ '^[0-9]{4,8}$' then
    raise exception 'PIN must be 4 to 8 digits' using errcode = 'check_violation';
  end if;

  insert into private.department_staff_pins (department_id, pin_hash, failed_attempts, locked_until, updated_at)
  values (
    p_department_id,
    extensions.crypt(normalized_pin, extensions.gen_salt('bf')),
    0,
    null,
    timezone('utc'::text, now())
  )
  on conflict (department_id) do update
    set pin_hash = excluded.pin_hash,
        failed_attempts = 0,
        locked_until = null,
        updated_at = excluded.updated_at;

  update public.departments set has_staff_pin = true where id = p_department_id;
  return true;
end;
$$;

revoke all on function public.set_department_staff_pin(bigint, text) from public, anon;
grant execute on function public.set_department_staff_pin(bigint, text) to authenticated;

-- Verifies a staff PIN. Wrong PINs count towards a 15-minute lock after 5.
create or replace function private.check_staff_pin(p_department_id bigint, p_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pin_row record;
  max_attempts constant integer := 5;
begin
  select * into pin_row
  from private.department_staff_pins
  where department_id = p_department_id
  for update;

  if not found then
    raise exception 'staff_pin_invalid';
  end if;

  if pin_row.locked_until is not null and pin_row.locked_until > now() then
    raise exception 'staff_pin_locked';
  end if;

  if pin_row.pin_hash <> extensions.crypt(coalesce(p_pin, ''), pin_row.pin_hash) then
    update private.department_staff_pins
    set failed_attempts = failed_attempts + 1,
        locked_until = case
          when failed_attempts + 1 >= max_attempts then now() + interval '15 minutes'
          else null
        end
    where department_id = p_department_id;

    if pin_row.failed_attempts + 1 >= max_attempts then
      raise exception 'staff_pin_locked';
    end if;

    raise exception 'staff_pin_invalid';
  end if;

  if pin_row.failed_attempts <> 0 or pin_row.locked_until is not null then
    update private.department_staff_pins
    set failed_attempts = 0, locked_until = null
    where department_id = p_department_id;
  end if;
end;
$$;

create or replace function public.staff_department_summary(p_department_id bigint, p_pin text)
returns table (
  business_id bigint,
  business_name text,
  department_name text,
  is_default boolean,
  sales_paused boolean
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_staff_pin(p_department_id, p_pin);

  return query
  select
    businesses.id,
    businesses.name,
    departments.name,
    departments.is_default,
    (departments.sales_paused_on = private.tbilisi_today()
      or businesses.sales_paused_on = private.tbilisi_today())
  from public.departments
  join public.businesses on businesses.id = departments.business_id
  where departments.id = p_department_id;
end;
$$;

create or replace function public.staff_list_reservations(p_department_id bigint, p_pin text)
returns table (
  order_id bigint,
  title text,
  category text,
  size text,
  pickup_date date,
  pickup_start text,
  pickup_end text,
  status text,
  customer_hint text,
  created_at timestamp with time zone,
  completed_at timestamp with time zone
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  department record;
begin
  perform private.check_staff_pin(p_department_id, p_pin);

  select id, business_id, is_default into department
  from public.departments where id = p_department_id;

  return query
  select
    orders.id,
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
    end,
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
    orders.id desc;
end;
$$;

-- Completes a reserved order of this department by its pickup code.
-- Returns 'completed', 'invalid_code', 'locked' (too many wrong codes) or
-- 'ambiguous' (two open reservations share the code; use the dashboard).
create or replace function public.staff_complete_pickup(
  p_department_id bigint,
  p_pin text,
  p_pickup_code text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  department record;
  pin_row record;
  matches bigint[];
  target_order record;
  max_attempts constant integer := 5;
  code text := btrim(coalesce(p_pickup_code, ''));
begin
  perform private.check_staff_pin(p_department_id, p_pin);

  select id, business_id, is_default into department
  from public.departments where id = p_department_id;

  select * into pin_row
  from private.department_staff_pins
  where department_id = p_department_id
  for update;

  if pin_row.locked_until is not null and pin_row.locked_until > now() then
    return 'locked';
  end if;

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
    update private.department_staff_pins
    set failed_attempts = failed_attempts + 1,
        locked_until = case
          when failed_attempts + 1 >= max_attempts then now() + interval '15 minutes'
          else null
        end
    where department_id = p_department_id;

    return case
      when pin_row.failed_attempts + 1 >= max_attempts then 'locked'
      else 'invalid_code'
    end;
  end if;

  if cardinality(matches) > 1 then
    return 'ambiguous';
  end if;

  select id, user_id into target_order
  from public.orders
  where id = matches[1] and status = 'reserved'
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

create or replace function public.staff_set_sales_paused(
  p_department_id bigint,
  p_pin text,
  p_paused boolean
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  department_business_id bigint;
begin
  perform private.check_staff_pin(p_department_id, p_pin);

  select business_id into department_business_id
  from public.departments where id = p_department_id;

  return private.apply_sales_pause(department_business_id, p_department_id, p_paused);
end;
$$;

revoke all on function public.staff_department_summary(bigint, text) from public;
revoke all on function public.staff_list_reservations(bigint, text) from public;
revoke all on function public.staff_complete_pickup(bigint, text, text) from public;
revoke all on function public.staff_set_sales_paused(bigint, text, boolean) from public;
grant execute on function public.staff_department_summary(bigint, text) to anon, authenticated;
grant execute on function public.staff_list_reservations(bigint, text) to anon, authenticated;
grant execute on function public.staff_complete_pickup(bigint, text, text) to anon, authenticated;
grant execute on function public.staff_set_sales_paused(bigint, text, boolean) to anon, authenticated;

commit;

-- Down (reversible; drops the new objects and columns, keeps everything else):
-- begin;
-- drop function if exists public.staff_set_sales_paused(bigint, text, boolean);
-- drop function if exists public.staff_complete_pickup(bigint, text, text);
-- drop function if exists public.staff_list_reservations(bigint, text);
-- drop function if exists public.staff_department_summary(bigint, text);
-- drop function if exists private.check_staff_pin(bigint, text);
-- drop function if exists public.set_department_staff_pin(bigint, text);
-- drop function if exists public.publish_bag_template_now(bigint, date);
-- drop function if exists public.publish_bag_templates(date);
-- drop function if exists private.publish_bag_template(bigint, date);
-- drop function if exists public.set_sales_paused(bigint, bigint, boolean);
-- drop function if exists private.apply_sales_pause(bigint, bigint, boolean);
-- drop function if exists public.ensure_default_department(bigint);
-- drop function if exists private.offer_in_department(bigint, bigint, boolean);
-- drop function if exists private.tbilisi_today();
-- drop trigger if exists offers_guard_department on public.offers;
-- drop function if exists private.guard_offer_department();
-- alter table public.offers drop column if exists paused_at, drop column if exists template_id, drop column if exists department_id;
-- drop trigger if exists bag_templates_guard_department on public.bag_templates;
-- drop function if exists private.guard_template_department();
-- drop table if exists public.bag_templates;
-- drop table if exists private.department_staff_pins;
-- alter table public.businesses drop column if exists sales_paused_on;
-- drop table if exists public.departments;
-- commit;
