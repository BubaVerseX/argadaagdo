-- Make rejecting a business a real, saved state.
--
-- A rejected business has approved = false and rejected_at set. It leaves the
-- pending queue until the owner resubmits, which clears both rejection columns.

alter table public.businesses
  add column if not exists rejected_at timestamptz,
  add column if not exists rejection_reason text;

alter table public.businesses
  add constraint businesses_rejection_has_reason_check
  check (
    (rejected_at is null and rejection_reason is null)
    or (
      rejected_at is not null
      -- Explicit: a NULL reason would otherwise make this check evaluate to
      -- NULL, and a CHECK that evaluates to NULL passes.
      and rejection_reason is not null
      and char_length(btrim(rejection_reason)) between 1 and 500
    )
  );

alter table public.businesses
  add constraint businesses_not_both_approved_and_rejected_check
  check (not (approved is true and rejected_at is not null));

-- The existing "Owners can update pending businesses" policy lets owners edit a
-- rejected application, and resubmitting uses that same update. This trigger
-- limits what they can do to the rejection columns: clear both, or leave them.
create or replace function private.guard_business_rejection()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if (select auth.uid()) is null or (select private.is_admin()) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.rejected_at is not null or new.rejection_reason is not null then
      raise exception 'Only admins can reject a business';
    end if;

    return new;
  end if;

  if new.rejected_at is not distinct from old.rejected_at
    and new.rejection_reason is not distinct from old.rejection_reason
  then
    return new;
  end if;

  if new.rejected_at is null and new.rejection_reason is null then
    return new;
  end if;

  raise exception 'Only admins can reject a business';
end;
$function$;

revoke all on function private.guard_business_rejection() from public, anon, authenticated;

create trigger businesses_guard_rejection
  before insert or update on public.businesses
  for each row
  execute function private.guard_business_rejection();
