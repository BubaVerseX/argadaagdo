-- Customers can sign up with only a phone number (2026-11-13).
-- STATUS: not yet applied. Run it in the Supabase SQL editor, then set
-- NEXT_PUBLIC_PHONE_SIGNUP=true in Vercel to show the "With phone" option.
--
-- A phone sign-up (SMS code, no email, no password) creates an auth user
-- without an email. private.handle_new_user copies that empty email into
-- public.profiles, so the column has to accept null. Nothing else changes:
-- existing rows keep their emails, businesses still sign up with email, and
-- auth.users.phone stays unique (one account per number).

alter table public.profiles alter column email drop not null;
