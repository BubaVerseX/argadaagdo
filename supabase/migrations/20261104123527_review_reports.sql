-- Let signed-in users report public reviews, and let admins hide them.
--
-- Reviews live in public.business_ratings (there is no "reviews" table), so
-- review_reports.review_id points there and the hidden flag is added there.

alter table public.business_ratings
  add column if not exists hidden boolean not null default false;

comment on column public.business_ratings.hidden is
  'Hidden by an admin after a report. Hidden reviews are left out of every public read.';

create table public.review_reports (
  id bigint generated always as identity primary key,
  review_id bigint not null references public.business_ratings (id) on delete cascade,
  -- Cascade: deleting an account removes that person's reports and their free
  -- text, in line with the privacy policy's promise about deleted comments.
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null
    constraint review_reports_reason_check
    check (reason in ('offensive', 'spam', 'false', 'other')),
  comment text
    constraint review_reports_comment_length_check
    check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  status text not null default 'open'
    constraint review_reports_status_check
    check (status in ('open', 'hidden', 'dismissed')),
  constraint review_reports_one_per_user unique (review_id, reporter_id)
);

create index review_reports_reporter_id_idx
  on public.review_reports (reporter_id);

alter table public.review_reports enable row level security;

-- New public tables get broad default grants on Supabase. Start from nothing.
revoke all on table public.review_reports from public, anon, authenticated;
grant select on table public.review_reports to authenticated;
grant insert (review_id, reporter_id, reason, comment)
  on table public.review_reports to authenticated;
grant update (status) on table public.review_reports to authenticated;

create policy "Users can report reviews as themselves"
  on public.review_reports
  for insert
  to authenticated
  with check (
    reporter_id = (select auth.uid())
    and status = 'open'
  );

create policy "Admins can view review reports"
  on public.review_reports
  for select
  to authenticated
  using ((select private.is_admin()));

create policy "Admins can update review reports"
  on public.review_reports
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- Admins have no UPDATE rights on business_ratings, so hiding goes through this
-- function. It also closes every open report of that review in one step.
create or replace function public.admin_hide_reported_review(p_report_id bigint)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  target_review_id bigint;
begin
  if not (select private.is_admin()) then
    raise exception 'Only admins can hide reviews';
  end if;

  select review_reports.review_id
  into target_review_id
  from public.review_reports
  where review_reports.id = p_report_id;

  if not found then
    raise exception 'Report not found';
  end if;

  update public.business_ratings
  set hidden = true
  where id = target_review_id;

  update public.review_reports
  set status = 'hidden'
  where review_id = target_review_id
    and status = 'open';
end;
$function$;

revoke all on function public.admin_hide_reported_review(bigint) from public, anon;
grant execute on function public.admin_hide_reported_review(bigint) to authenticated;

-- The only two public reads of reviews. Both bodies match production apart from
-- the hidden filter, and create or replace keeps their existing grants.
create or replace function public.get_public_business_reviews(p_business_id bigint)
returns table (
  id bigint,
  business_id bigint,
  rating integer,
  review text,
  created_at timestamp with time zone
)
language sql
security definer
set search_path to ''
as $function$
  select
    business_ratings.id,
    business_ratings.business_id,
    business_ratings.rating,
    business_ratings.comment as review,
    business_ratings.created_at
  from public.business_ratings
  where business_ratings.business_id = p_business_id
    and not business_ratings.hidden
  order by business_ratings.created_at desc;
$function$;

create or replace function public.get_business_rating_summary()
returns table (
  business_id bigint,
  average_rating numeric,
  rating_count bigint
)
language sql
security definer
set search_path to ''
as $function$
  select
    business_ratings.business_id,
    round(avg(business_ratings.rating)::numeric, 2) as average_rating,
    count(*) as rating_count
  from public.business_ratings
  where not business_ratings.hidden
  group by business_ratings.business_id;
$function$;
