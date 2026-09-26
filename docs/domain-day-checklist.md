# Domain day — exact checklist for switching to argadaagdo.ge

Read this top to bottom the moment `argadaagdo.ge` is purchased. It's written
so you can follow it yourself without asking what's next. Everything here is
**out of scope for any AI session to do unattended** — env var changes,
Supabase Auth config, and native app config are all things prior sessions
were told to ask before touching, so treat every step below as something to
do deliberately (yourself, or by asking a session to do that one specific
step) rather than something to hand over wholesale.

Every reference to the current URL in the repo was found with:

```
grep -rn "argadaagdo-silk\.vercel\.app" --include="*.ts" --include="*.tsx" \
  --include="*.json" --include="*.md" --include="*.mjs" .
```

— re-run that yourself on domain day in case something changed between now
and then; don't trust this list blindly if a lot of time has passed.

## 1. Vercel: add the domain

1. Vercel dashboard → project `argadaagdo` → **Settings → Domains** → add
   `argadaagdo.ge` (and `www.argadaagdo.ge` if you want the www variant —
   recommend adding both and letting Vercel redirect one to the other).
2. Vercel will show you the **exact DNS records to add** on the domain's own
   page once you add it — these can differ by account/region, so use what
   Vercel actually displays, not a memorized value. As of today that's
   typically an `A` record to `76.76.21.21` for the apex domain and a
   `CNAME` to `cname.vercel-dns.com` for `www`, but **confirm against what
   Vercel shows you that day**.
3. Add those records at your registrar/DNS provider for `argadaagdo.ge`.
4. Wait for DNS to propagate (Vercel's domain page shows a live
   "Valid Configuration" check) and for Vercel to auto-issue the TLS cert.
5. Decide which is canonical (apex or `www`) and let Vercel redirect the
   other — do this in the Domains UI, don't hand-roll a redirect.

## 2. Vercel: update `NEXT_PUBLIC_SITE_URL`

This is the single highest-leverage step — nearly everything else in the
codebase derives from this one env var via `lib/site.ts`'s `siteUrl` /
`absoluteSiteUrl()`, confirmed used by:

- `app/layout.tsx` — `metadataBase`, Open Graph `url` (this alone fixes
  relative OG-image/canonical-URL resolution too, no separate step needed)
- `app/sitemap.ts`, `app/robots.ts` — sitemap/robots URLs
- `lib/email/templates.ts`, `lib/email/events.ts` — every transactional
  email's action link (`actionUrl`, `supportUrl`)
- `lib/payments/bog.ts`, `app/api/payments/bog/return/route.ts` — BOG
  callback URL and success/fail redirect URLs (payments are out of scope to
  build/change right now, but this env var still feeds them, so get this
  right even before BOG itself is live)

Steps:

1. Vercel dashboard → **Settings → Environment Variables** → edit
   `NEXT_PUBLIC_SITE_URL` → set to `https://argadaagdo.ge` (no trailing
   slash, matching the existing value's format) for the **Production**
   environment. Leave Preview/Development pointing at whatever they
   currently use (or also update if you want previews to match — not
   required).
2. Redeploy (env var changes require a new deployment to take effect for
   already-built pages/edge config — trigger one from the dashboard or push
   a commit).
3. This is a **prod env var change** — per this repo's standing rule, don't
   let an AI session do this step silently; do it yourself or explicitly
   tell the session to do this one specific edit.

## 3. Supabase: Auth URL Configuration

Supabase Dashboard → your project → **Authentication → URL Configuration**:

1. Update **Site URL** to `https://argadaagdo.ge`.
2. Add `https://argadaagdo.ge/**` (and `https://www.argadaagdo.ge/**` if you
   kept both live) to **Redirect URLs**. Keep the existing
   `https://argadaagdo-silk.vercel.app/**` entry too, at least for a
   transition period — the Vercel URL keeps working after adding a custom
   domain, and you may still use it for local testing / the native app
   shell until Capacitor is repointed (step 5).
3. The only in-app redirect that depends on this is the password-reset flow
   (`app/login/page.tsx`, `resetPasswordForEmail` with
   `redirectTo: window.location.origin + "/login?mode=reset-password"`) —
   it's already built from `window.location.origin` dynamically, so no code
   change is needed, only the Supabase allow-list update above. There is no
   OAuth provider configured (email/password only, confirmed by grepping
   `app/login/page.tsx` and `lib/auth.ts` for `signInWithOAuth` — nothing
   found), so there's no separate Google/Apple OAuth console to update.
4. This touches Auth config — same standing rule as above, don't let an AI
   session do this unattended; confirm you're doing it, or explicitly direct
   a session to do exactly this.

## 4. Resend: domain verification

Currently `RESEND_API_KEY` / `TRANSACTIONAL_EMAIL_FROM` /
`TRANSACTIONAL_EMAILS_ENABLED` aren't set in Vercel at all (as of the
2026-07-08 check in `PROJECT_CONTEXT.md` — re-verify with `vercel env ls`
since that may have changed). If you haven't already set these up:

1. Resend dashboard → **Domains** → add `argadaagdo.ge` (or a subdomain like
   `mail.argadaagdo.ge` if you'd rather keep transactional mail on a
   subdomain).
2. Add the DKIM/SPF (and DMARC, recommended) DNS records Resend's dashboard
   shows you — again, use what Resend displays that day, not a memorized
   value.
3. Wait for Resend to mark the domain verified.
4. Set `TRANSACTIONAL_EMAIL_FROM` (e.g. `ArGadaagdo <noreply@argadaagdo.ge>`)
   and `RESEND_API_KEY` in Vercel env vars, and `TRANSACTIONAL_EMAILS_ENABLED=true`
   once ready to actually send. `TRANSACTIONAL_EMAIL_REPLY_TO` is optional.
5. Send yourself a real test email (e.g. trigger a reservation confirmation)
   before considering this done — "verified in the dashboard" isn't the same
   as "a real send succeeded."

## 5. Native app: repoint Capacitor at the new domain

`capacitor.config.ts` already has a dated TODO comment for this. The app
wraps the **live deployed site** (it can't be statically exported — see the
comment in that file), so:

1. Edit `capacitor.config.ts` → `server.url` → change from
   `'https://argadaagdo-silk.vercel.app'` to `'https://argadaagdo.ge'`.
2. Run `npx cap sync` to regenerate the native-side copies of this config —
   don't hand-edit `ios/App/App/capacitor.config.json` or
   `android/app/src/main/assets/capacitor.config.json` directly, they're
   generated from `capacitor.config.ts`.
3. **This only matters once you actually build and submit native
   binaries** — as of this session there's no paid Apple Developer or
   Google Play Console account yet, so nothing has been submitted. If that's
   still true on domain day, this step can wait until you're actually ready
   to build for submission (app binaries hardcode this URL at build time —
   changing it later means a new build + new store submission, unlike the
   web app which redeploys instantly). If you *have* since submitted an app
   using the `.vercel.app` URL, this becomes a required update-and-resubmit.

## 6. Update documentation references (cosmetic, do last)

Not functionally required (nothing reads these at runtime) but keeps the
repo trustworthy. Update the literal `argadaagdo-silk.vercel.app` mentions
in:

- `PROJECT_CONTEXT.md` (the "What this project is" line, and the native app
  session note)
- `README.md` (live URL, `NEXT_PUBLIC_SITE_URL` example, BOG callback
  example, health-check URLs)
- `docs/app-store-packaging.md`, `docs/app-store-submission.md` (including
  the privacy-policy-URL line — only relevant once an actual App Store
  Connect / Play Console listing exists, which it doesn't yet)
- `docs/production-reliability.md` (health-check curl examples)
- `scripts/capture-store-screenshots.mjs` (`BASE_URL` constant — only
  matters if you re-run it to recapture store screenshots against the new
  domain)

## 7. Verify end-to-end before calling it done

1. Visit `https://argadaagdo.ge` directly — confirm it loads, TLS is valid,
   and it's the real app (not a Vercel "domain not configured" page).
2. Check `https://argadaagdo.ge/sitemap.xml` and `/robots.txt` — URLs inside
   should say `argadaagdo.ge`, not the old Vercel URL.
3. View source / check social share preview — Open Graph `url` and
   `metadataBase`-resolved image URLs should say `argadaagdo.ge`.
4. Trigger one real transactional email (e.g. a test reservation) and check
   the link inside points at `argadaagdo.ge`.
5. Do a real password-reset flow end-to-end (request reset → click the
   emailed link → land back on `/login?mode=reset-password` on the new
   domain, not blocked by Supabase's redirect allow-list).
6. If BOG is live by then: confirm a real checkout's callback/return URLs
   resolve to `argadaagdo.ge`, not the old domain (this depends on the same
   `NEXT_PUBLIC_SITE_URL` var from step 2 — no separate payment-code change
   needed for the domain switch itself, though BOG integration/credentials
   remain their own separate, still-open item — see `PROJECT_CONTEXT.md`).
