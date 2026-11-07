begin;

-- Ratings alignment:
-- The live database uses public.business_ratings as the single source of truth.
-- This compatibility RPC keeps existing frontend review loaders working without
-- recreating the old public.ratings table.
create or replace function public.get_public_business_reviews(p_business_id bigint)
returns table(
  id bigint,
  business_id bigint,
  rating integer,
  review text,
  created_at timestamp with time zone
)
language sql
security definer
set search_path = ''
as $$
  select
    business_ratings.id,
    business_ratings.business_id,
    business_ratings.rating,
    business_ratings.comment as review,
    business_ratings.created_at
  from public.business_ratings
  where business_ratings.business_id = p_business_id
  order by business_ratings.created_at desc;
$$;

revoke all on function public.get_public_business_reviews(bigint)
from public, anon, authenticated;

grant execute on function public.get_public_business_reviews(bigint)
to anon, authenticated;

commit;
