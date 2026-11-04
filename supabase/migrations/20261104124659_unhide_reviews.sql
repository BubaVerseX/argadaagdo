-- Let admins undo a hide. Admins have no UPDATE rights on business_ratings, so
-- this goes through a function, the same way hiding does.
--
-- The reports behind the hide become 'dismissed': an admin has now decided the
-- review stays up, so they shouldn't come back as open or still read as 'hidden'.

create or replace function public.admin_unhide_review(p_review_id bigint)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not (select private.is_admin()) then
    raise exception 'Only admins can unhide reviews';
  end if;

  update public.business_ratings
  set hidden = false
  where id = p_review_id;

  if not found then
    raise exception 'Review not found';
  end if;

  update public.review_reports
  set status = 'dismissed'
  where review_id = p_review_id
    and status = 'hidden';
end;
$function$;

revoke all on function public.admin_unhide_review(bigint) from public, anon;
grant execute on function public.admin_unhide_review(bigint) to authenticated;
