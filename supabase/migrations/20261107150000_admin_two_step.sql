-- Admin 2-step sign-in (check-2 #13, 2026-11-07).
-- STATUS: applied to production (Frankfurt) on 2026-11-07 with the owner's OK,
-- after the admin page could set up and ask for the code (AdminTwoStep).
--
-- Admin rights (every admin RPC and RLS policy goes through private.is_admin)
-- now need a session that passed a TOTP code: JWT claim aal = 'aal2'.
-- Supabase Auth has TOTP enroll/verify enabled. Recovery if the admin loses
-- the authenticator: delete the factor in Supabase → Authentication → Users.

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  )
  and coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2';
$$;

-- Down: re-create private.is_admin without the aal check (20261016101117).
