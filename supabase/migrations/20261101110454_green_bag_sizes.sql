-- Green Bag model, stage 1 (2026-11-01): sizes and "until stopped" bags.
-- STATUS: applied to production on 2026-11-01 (recorded as version 20261101110454).
-- never reads these columns, and both have defaults.
--
-- "Surprise bag" becomes "Green Bag" (მწვანე ჩანთა) in the UI only. The
-- offers.category column keeps its name; new values are Bakery, Fruit & veg,
-- Dairy, Deli, Mixed (old values stay and are shown under the nearest tag by
-- lib/offerCategories.ts). offers.size is the S / M / L size with its own
-- price. offers.unlimited_quantity marks template bags sold "until stopped":
-- the daily job gives them a large quantity and the UI hides the count.

begin;

alter table public.offers
  add column if not exists size text
    check (size is null or size in ('S', 'M', 'L')),
  add column if not exists unlimited_quantity boolean not null default false;

comment on column public.offers.size is
  'Green Bag size S / M / L. Null on offers created before sizes existed.';
comment on column public.offers.unlimited_quantity is
  'Sold until the business stops sales for the day; the remaining count is not shown.';

commit;

-- Down (reversible):
-- begin;
-- alter table public.offers drop column if exists size;
-- alter table public.offers drop column if exists unlimited_quantity;
-- commit;
