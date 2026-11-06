-- Demo refresh keeps deliberately switched-off demo boxes off (2026-11-06).
-- STATUS: applied to production (Frankfurt) on 2026-11-06 with the owner's OK.
-- The two leftover "Walkthrough Green Bag M" boxes (offers 27, 28) were set
-- inactive so App Review sees only "Demo surprise bag (free, App Review)";
-- refresh_review_demo_offers used to switch every 0 GEL demo box back on.

begin;

create or replace function public.refresh_review_demo_offers()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  refreshed_count integer;
begin
  update public.offers
  set
    pickup_date = timezone('Asia/Tbilisi'::text, now())::date + 1,
    pickup_start = '18:00',
    pickup_end = '21:00',
    quantity = 20,
    active = true,
    status = 'active'
  from public.businesses
  where businesses.id = offers.business_id
    and businesses.is_review_demo
    and offers.price = 0
    -- Demo boxes switched off on purpose stay off.
    and offers.status <> 'inactive';

  get diagnostics refreshed_count = row_count;
  return refreshed_count;
end;
$$;

update public.offers
set active = false, status = 'inactive'
where id in (27, 28)
  and title like 'Walkthrough%'
  and business_id in (select id from public.businesses where is_review_demo);

commit;
