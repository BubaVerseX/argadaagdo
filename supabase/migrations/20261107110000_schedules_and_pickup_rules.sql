-- Per-template schedules + one pickup rule (owner decisions of 2026-11-07).
-- STATUS: applied to production (Frankfurt) on 2026-11-07 with the owner's OK.
--
-- 1. Schedules (like Too Good To Go): each template has its own days, publish
--    time (same day or the day before), pickup window, quantity and price.
--    pg_cron runs private.run_marketplace_tick() every 10 minutes, which
--    publishes every template whose publish moment has passed, then expires
--    offers and marks missed pickups. It then asks the website (pg_net) to
--    send "new box" pushes, if a secret named marketplace_tick_secret exists
--    in the vault. No Vercel cron is needed for publishing any more.
--    A publication log makes each template publish at most once per date, so
--    a box the business deleted is not re-created ten minutes later.
-- 2. Pickup: missing the pickup window means no refund. The order is marked
--    a missed pickup as soon as the window ends (was 30 min later), and the
--    customer's "collected" slider closes at the window end (was +2 h).
--    The business may still hand the box over: for 12 hours after the window
--    it can complete a missed order with the code (dashboard or staff page),
--    which also takes back the missed-pickup penalty.
-- Cancel rule unchanged: until 2 h before pickup starts (payment functions
-- are not touched).

begin;

-- 1. Schedules --------------------------------------------------------------------

alter table public.bag_templates
  add column if not exists publish_time text not null default '10:00',
  add column if not exists publish_days_before smallint not null default 0;

alter table public.bag_templates
  drop constraint if exists bag_templates_publish_time_format,
  drop constraint if exists bag_templates_publish_days_before_range,
  drop constraint if exists bag_templates_publish_before_pickup_end;

alter table public.bag_templates
  add constraint bag_templates_publish_time_format
    check (publish_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  add constraint bag_templates_publish_days_before_range
    check (publish_days_before in (0, 1)),
  add constraint bag_templates_publish_before_pickup_end
    check (publish_days_before = 1 or publish_time < left(pickup_end, 5));

-- A template created without a schedule (business sign-up's first box, older
-- clients) whose window ends before the default 10:00 goes live the evening
-- before instead of failing the check above.
create or replace function private.default_template_schedule()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.publish_days_before = 0 and new.publish_time >= left(new.pickup_end, 5) then
    new.publish_days_before := 1;
    new.publish_time := '19:00';
  end if;
  return new;
end;
$$;

drop trigger if exists bag_templates_default_schedule on public.bag_templates;
create trigger bag_templates_default_schedule
before insert on public.bag_templates
for each row execute function private.default_template_schedule();

create table if not exists private.bag_template_publications (
  template_id bigint not null references public.bag_templates (id) on delete cascade,
  pickup_date date not null,
  offer_id bigint,
  published_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (template_id, pickup_date)
);

alter table private.bag_template_publications enable row level security;
revoke all on table private.bag_template_publications from public, anon, authenticated;

insert into private.bag_template_publications (template_id, pickup_date, offer_id, published_at)
select offers.template_id, offers.pickup_date, min(offers.id), min(offers.created_at)
from public.offers
join public.bag_templates on bag_templates.id = offers.template_id
where offers.template_id is not null
  and offers.pickup_date is not null
group by offers.template_id, offers.pickup_date
on conflict do nothing;

-- Same checks as before, plus the publication log. p_manual = the owner's
-- "Today" / "Tomorrow" button, which may re-create a box they deleted.
drop function if exists private.publish_bag_template(bigint, date);

create or replace function private.publish_bag_template(
  p_template_id bigint,
  p_date date,
  p_manual boolean default false
)
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
  if not p_manual and exists (
    select 1 from private.bag_template_publications
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
  insert into private.bag_template_publications (template_id, pickup_date, offer_id)
  values (p_template_id, p_date, new_offer_id)
  on conflict (template_id, pickup_date)
  do update set offer_id = excluded.offer_id, published_at = excluded.published_at;
  return new_offer_id;
end;
$$;

revoke all on function private.publish_bag_template(bigint, date, boolean) from public, anon, authenticated;

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
  return private.publish_bag_template(p_template_id, p_date, true);
end;
$$;

-- Publishes every template whose publish moment (Tbilisi time) has passed,
-- for today and tomorrow. Safe to run any number of times.
create or replace function public.publish_due_bag_templates()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := private.tbilisi_today();
  template_row record;
  target_date date;
  created integer := 0;
begin
  if (select auth.uid()) is not null then
    raise exception 'Only the scheduler can run the template job';
  end if;
  for template_row in
    select bag_templates.id, bag_templates.publish_time, bag_templates.publish_days_before
    from public.bag_templates
    join public.businesses on businesses.id = bag_templates.business_id
    where bag_templates.active
      and businesses.approved
    order by bag_templates.id
  loop
    foreach target_date in array array[today, today + 1]
    loop
      if (
        ((target_date - template_row.publish_days_before) + template_row.publish_time::time)::timestamp
          at time zone 'Asia/Tbilisi'
      ) <= now() then
        if private.publish_bag_template(template_row.id, target_date) is not null then
          created := created + 1;
        end if;
      end if;
    end loop;
  end loop;
  return created;
end;
$$;

revoke all on function public.publish_due_bag_templates() from public, anon, authenticated;
grant execute on function public.publish_due_bag_templates() to service_role;

-- "New box" pushes: the website marks each offer once it has been announced.
alter table public.offers
  add column if not exists favourites_notified_at timestamp with time zone;

update public.offers
set favourites_notified_at = timezone('utc'::text, now())
where favourites_notified_at is null;

-- 2. Pickup rule ------------------------------------------------------------------

-- Missed pickup as soon as the window ends (was 30 minutes later).
create or replace function public.process_expired_marketplace()
returns table(expired_offers integer, no_show_orders integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_offer_count integer := 0;
  no_show_order_count integer := 0;
  reserved_order record;
begin
  -- Unpaid checkouts older than 40 minutes give their box back. Runs before
  -- the sold-out/expiry updates below so a released box is counted again.
  perform public.expire_pending_provider_payments(40);

  update public.offers
  set
    active = false,
    status = 'sold_out'
  where coalesce(status, 'active') = 'active'
    and coalesce(quantity, 0) <= 0;

  update public.offers
  set
    active = false,
    quantity = 0,
    status = 'expired'
  where coalesce(status, 'active') in ('active', 'sold_out')
    and private.pickup_end_at(pickup_date, pickup_end::text) < now();

  get diagnostics expired_offer_count = row_count;

  for reserved_order in
    select
      orders.id,
      orders.user_id
    from public.orders
    join public.offers on offers.id = orders.offer_id
    where orders.status = 'reserved'
      and private.pickup_end_at(offers.pickup_date, offers.pickup_end::text) < now()
  loop
    update public.orders
    set
      status = 'no_show',
      no_show_at = coalesce(no_show_at, timezone('utc'::text, now()))
    where id = reserved_order.id
      and status = 'reserved';

    if found then
      no_show_order_count := no_show_order_count + 1;

      update public.profiles
      set no_show_count = no_show_count + 1
      where id = reserved_order.user_id;

      perform private.apply_reliability_delta(reserved_order.user_id, -15);
    end if;
  end loop;

  return query select expired_offer_count, no_show_order_count;
end;
$$;

-- Customer slider: from 1 h before the window until the window ends.
create or replace function public.collect_my_order(p_order_id bigint)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order record;
  window_start timestamp with time zone;
  window_end timestamp with time zone;
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;
  select
    orders.id,
    orders.user_id,
    orders.status,
    orders.pickup_code,
    offers.pickup_date,
    offers.pickup_start,
    offers.pickup_end
  into target_order
  from public.orders
  join public.offers on offers.id = orders.offer_id
  where orders.id = p_order_id
    and orders.user_id = (select auth.uid())
  for update of orders;
  if not found then
    raise exception 'Order not found';
  end if;
  if target_order.status = 'completed' then
    return 'already_collected';
  end if;
  if target_order.status not in ('reserved', 'confirmed') or target_order.pickup_code is null then
    raise exception 'Only reserved orders can be collected';
  end if;
  window_start := private.pickup_start_at(target_order.pickup_date, target_order.pickup_start::text) - interval '1 hour';
  window_end := private.pickup_end_at(target_order.pickup_date, target_order.pickup_end::text);
  if now() < window_start or now() > window_end then
    raise exception 'Pickup window is not open';
  end if;
  update public.orders
  set
    status = 'completed',
    completed_at = timezone('utc'::text, now()),
    customer_collected_at = timezone('utc'::text, now())
  where id = p_order_id;
  update public.profiles
  set completed_pickup_count = completed_pickup_count + 1
  where id = target_order.user_id;
  perform private.apply_reliability_delta(target_order.user_id, 1);
  return 'collected';
end;
$$;

-- Late handover: a missed order can still be completed by the business for
-- 12 hours after the window. Completing it takes back the missed-pickup
-- penalty (count and -15) before the usual +1.
create or replace function private.late_handover_open(p_pickup_date date, p_pickup_end text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select now() <= private.pickup_end_at(p_pickup_date, p_pickup_end) + interval '12 hours';
$$;

revoke all on function private.late_handover_open(date, text) from public, anon, authenticated;

create or replace function private.finish_pickup(p_order_id bigint, p_user_id uuid, p_was_no_show boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.orders
  set
    status = 'completed',
    completed_at = timezone('utc'::text, now())
  where id = p_order_id;

  if p_was_no_show then
    update public.profiles
    set no_show_count = greatest(no_show_count - 1, 0)
    where id = p_user_id;
    perform private.apply_reliability_delta(p_user_id, 15);
  end if;

  update public.profiles
  set completed_pickup_count = completed_pickup_count + 1
  where id = p_user_id;

  perform private.apply_reliability_delta(p_user_id, 1);
end;
$$;

revoke all on function private.finish_pickup(bigint, uuid, boolean) from public, anon, authenticated;

create or replace function public.complete_pickup(p_order_id bigint, p_pickup_code text)
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
    orders.pickup_code_failed_attempts,
    offers.pickup_date,
    offers.pickup_end
  into target_order
  from public.orders
  join public.offers on offers.id = orders.offer_id
  where orders.id = p_order_id
    and orders.status in ('reserved', 'no_show')
  for update of orders;

  if not found then
    raise exception 'Reserved order not found';
  end if;

  if target_order.status = 'no_show'
    and not private.late_handover_open(target_order.pickup_date, target_order.pickup_end::text) then
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

  perform private.finish_pickup(p_order_id, target_order.user_id, target_order.status = 'no_show');

  return 'completed';
end;
$$;

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
    and (
      orders.status = 'reserved'
      or (
        orders.status = 'no_show'
        and private.late_handover_open(offers.pickup_date, offers.pickup_end::text)
      )
    )
    and orders.pickup_code = code
    and orders.pickup_code_failed_attempts < max_attempts
    and offers.pickup_date between private.tbilisi_today() - 1 and private.tbilisi_today() + 1;
  if matches is null or cardinality(matches) = 0 then
    if private.note_staff_failure(p_department_id, v_device_key) then
      return 'locked';
    end if;
    return 'invalid_code';
  end if;
  if cardinality(matches) > 1 then
    return 'ambiguous';
  end if;
  select orders.id, orders.user_id, orders.status into target_order
  from public.orders
  where orders.id = matches[1] and orders.status in ('reserved', 'no_show')
  for update;
  if not found then
    return 'invalid_code';
  end if;
  perform private.finish_pickup(target_order.id, target_order.user_id, target_order.status = 'no_show');
  return 'completed';
end;
$$;

-- The customer keeps seeing the code of a missed order while the business
-- can still hand it over.
create or replace function public.get_my_pickup_codes()
returns table(order_id bigint, pickup_code text)
language sql
stable
security definer
set search_path = ''
as $$
  select orders.id, orders.pickup_code
  from public.orders
  join public.offers on offers.id = orders.offer_id
  where orders.user_id = (select auth.uid())
    and orders.pickup_code is not null
    and (
      orders.status in ('reserved', 'confirmed')
      or (
        orders.status = 'no_show'
        and private.late_handover_open(offers.pickup_date, offers.pickup_end::text)
      )
    );
$$;

-- 3. The 10-minute tick -------------------------------------------------------------

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create or replace function private.run_marketplace_tick()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  tick_secret text;
begin
  begin
    perform public.publish_due_bag_templates();
  exception when others then
    raise warning 'publish_due_bag_templates failed: %', sqlerrm;
  end;

  begin
    perform public.process_expired_marketplace();
  exception when others then
    raise warning 'process_expired_marketplace failed: %', sqlerrm;
  end;

  if exists (
    select 1 from public.offers
    where favourites_notified_at is null
      and active
      and created_at > timezone('utc'::text, now()) - interval '1 day'
  ) then
    select decrypted_secret into tick_secret
    from vault.decrypted_secrets
    where name = 'marketplace_tick_secret'
    limit 1;

    if tick_secret is not null then
      perform net.http_get(
        url := 'https://argadaagdo.ge/api/cron/publish-green-bags',
        headers := jsonb_build_object('Authorization', 'Bearer ' || tick_secret),
        timeout_milliseconds := 30000
      );
    end if;
  end if;
end;
$$;

revoke all on function private.run_marketplace_tick() from public, anon, authenticated;

select cron.schedule('marketplace-tick', '*/10 * * * *', 'select private.run_marketplace_tick()');

commit;

-- Down (manual):
--   select cron.unschedule('marketplace-tick');
--   restore process_expired_marketplace / collect_my_order / complete_pickup /
--   staff_collect / get_my_pickup_codes from 20261101110702, 20261101160000
--   and 20261016101117; drop private.finish_pickup, private.late_handover_open,
--   private.run_marketplace_tick, public.publish_due_bag_templates,
--   private.bag_template_publications; re-create the 2-argument
--   private.publish_bag_template; drop the new bag_templates/offers columns.
