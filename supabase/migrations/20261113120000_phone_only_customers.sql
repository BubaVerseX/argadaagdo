-- Customers can sign up with only a phone number (2026-11-13).
-- STATUS: applied in the Supabase SQL editor on 2026-11-13; NEXT_PUBLIC_PHONE_SIGNUP=true set in
-- Vercel production the same day (shows the "With phone" option).
--
-- A phone sign-up (SMS code, no email, no password) creates an auth user
-- without an email. private.handle_new_user copies that empty email into
-- public.profiles, so the column has to accept null. Nothing else changes:
-- existing rows keep their emails, businesses still sign up with email, and
-- auth.users.phone stays unique (one account per number).

alter table public.profiles alter column email drop not null;
