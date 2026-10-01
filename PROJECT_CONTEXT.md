# ArGadaagdo — Project Handoff / Context

Read this file first, before exploring the codebase. It exists so a fresh
Claude Code session doesn't have to rediscover the same things by grepping
around. Update it when the architecture materially changes.

## 🆕 2026-10-01 full audit + fix session — read this first

A full audit (web app, iOS/Android wrappers, live Supabase read-only,
Vercel) found ~90 issues. Code fixes are on branch
`claude/keen-knuth-niinm2` (not merged at the time of writing — production
deploys from `main`, so nothing is live until it is merged). Key facts the
older notes below don't know:

- **Checkout is broken in production**: on 2026-09-30 a migration was
  applied directly to the live DB (`switch_payments_to_tbc_and_add_payout_accounts`,
  now copied into `supabase/migrations/`) that makes
  `create_provider_payment_order` accept only `'tbc'`, while all app code
  sends `'bog'`. Decide BOG vs TBC before any other payment work.
- **Repo ≠ production**: production runs older versions of several RPCs;
  repo migrations 06-03…06-17 were only partly applied live, and two live
  migrations were never committed (both now committed verbatim). Compare
  `pg_proc.prosrc` with the repo before trusting either.
- **Pending DB migration, NOT applied**:
  `supabase/migrations/20261001120000_audit_fixes.sql` — tested on a local
  replica; fixes no-show date check, reactivated paused offers, stale
  payment holds (released after 40 min instead of only by the daily cron),
  duplicate holds, text pickup-time validation, safe offer delete, owner
  transfer lock, pending-owner edits, business visibility of customer
  profiles. Apply only with the founder's OK (standing rule below).
- Infra: Supabase project is in Sydney and Vercel functions in Washington
  DC (~1 s DB queries, health-check timeouts) — move both near Georgia.
  Vercel Hobby = daily crons only (see `vercel.json`).
- Native: `@capacitor/app` + `@capacitor/browser` added and synced; run
  `npm ci && npx cap sync` before any native build. In-app account
  deletion is still missing (Apple/Google requirement).
- The repo is public: never commit passwords or keys here.

## 🔁 Resume-work note — start here if you're picking this up cold after a break

Written 2026-09-27, right before the founder shut their laptop down for an
indeterminate stretch (weeks to months) to handle real-world business
registration and banking. Everything as of this note is merged to `main`,
deployed to production, and verified live — see the full status section
immediately below for the detailed proof. Nothing is stuck mid-work.

**What's blocking further progress — exactly three things, none of them code:**
1. **Domain purchase** (`argadaagdo.ge` not yet registered)
2. **TBC/BOG bank payment integration** (naming question unresolved — see
   below — plus real banking credentials, which the founder is obtaining
   through the real-world process this break is for)
3. **Apple Developer / Google Play Console account purchases** (needed to
   build and test the native app wrapper for real)

**The very first useful action once each unblocks:**
- **Once the domain is bought**: don't start writing code. Start at
  `docs/domain-day-checklist.md` — it's a complete, already-researched
  runbook (DNS, `NEXT_PUBLIC_SITE_URL`, Supabase Auth URL config, Resend
  domain verification, Capacitor `server.url`) traced through this exact
  codebase already. Just execute it top to bottom.
- **Once TBC vs. BOG is decided and real banking API credentials exist**:
  first re-read the "Bank payment integration" section below in full — do
  not assume "the code looks done so it must work," that assumption has
  been wrong before in this project. The concrete first step is populating
  the `BOG_*` environment variables in Vercel Production (see
  `.env.example` for the full list) — `lib/payments/bog.ts` and the DB-side
  RPCs are already built and the migration is already applied, so once real
  credentials exist the path to a working checkout is short. If the
  provider turns out to genuinely be TBC and not BOG, `lib/payments/`
  needs a second provider implementation added to the existing
  `PaymentProvider` abstraction in `lib/payments/provider.ts` — don't bolt
  TBC logic onto `bog.ts` directly.
- **Once a paid Apple/Google developer account exists**: the Capacitor
  scaffolding, icons, and splash screens are already done (see the
  "native app store readiness" history further down) — the next step is
  simply doing a real native build and running the permissions/behavior
  audit against an actual installed app instead of inferring it from
  config, then following `docs/app-store-submission.md`'s submission
  checklist.

**Two small, low-priority loose ends found during the 2026-09-27
pre-shutdown check, safe to ignore indefinitely but worth knowing about:**
- Two old branches exist on GitHub that were pushed but never merged and
  never had a PR opened: `qa-a11y-audit-pass` (2026-07-08) and
  `docs/wrap-up-session-notes` (2026-07-13). Checked both line by line —
  nothing is at risk: the RLS migration in `qa-a11y-audit-pass` was already
  independently re-tracked via the merged `20260710120000_track_business_owner_update_policy.sql`;
  its color-contrast fix is moot (superseded by the August redesign, which
  removed every class it touched); its `PROJECT_CONTEXT.md` edits are long
  superseded. The one genuinely still-missing piece: **the order
  review textarea in `components/orders/OrderCard.tsx` has no
  `aria-label` and relies on placeholder text alone as its accessible
  name** (confirmed still true against current `main` on 2026-09-27) — a
  real one-line a11y fix, just never reapplied after the branch it was on
  never merged. Low priority, safe to leave for whenever someone's doing
  UI/a11y polish next.

## 📍 Project status as of 2026-09-27 — read this before anything else

**This is the closing entry for the "native app store readiness" push.** If
you're picking this project up after a gap of weeks or months, this section
is written so you don't have to reconstruct anything from git log or the
(very long) session-by-session history further down this file. Everything
below this section is historical detail kept for archaeology — this part is
the current truth.

**The project is correctly paused. There is nothing broken, nothing
half-merged, and nothing waiting on a decision except the three items listed
under "Only remaining blockers" below.**

### Fully built and verified live in production (`https://argadaagdo-silk.vercel.app`)
- **Core marketplace loop**: browse offers, offer detail, checkout (correctly
  stops *before* payment with a clean generic error, since BOG isn't
  configured — this is expected, not broken, see blockers below), orders,
  profile/settings, business dashboard (offer creation, reservation
  management, analytics), admin dashboard (approvals, marketplace-wide
  analytics), business ratings/reviews. All manually QA'd across customer,
  business, and admin roles, in English and Georgian, at mobile widths.
- **Favorites**: heart-toggle works on both the offers grid *and* the offer
  detail page (the detail page was the actual gap; the grid already had it —
  a 2026-09-25 QA note claiming the grid was missing it too was stale/wrong,
  confirmed by reading git history and testing live). Auth-gated: logged-out
  taps redirect to sign-in. Verified end-to-end against production data this
  session (DB row created/removed, reflected on `/favorites`, EN + KA, both
  surfaces) — see PR #14, merged as commit `7d27515`.
- **Business dashboard stats no longer double-count no-shows**: a single
  no-show order used to land in both the "Cancelled" and "No-show" buckets
  (found 2026-09-25). Root cause was a shared `isCancelledOrderStatus()`
  helper that treats `no_show` as a subset of "cancelled" — used correctly
  in most places, but wrong wherever a "Cancelled" count and a separate
  "No-show" count were displayed side by side. Fixed in **two** places (not
  just the one originally reported): the Reservation Summary card + its
  filter tabs, and the separate Revenue & Insights KPI grid
  (`lib/analytics.ts` → `BusinessRevenueInsights.tsx`), which had the
  identical bug. Admin dashboard was already correct, no change needed.
  Verified live in production this session with a fresh
  reserved/cancelled/no-show order set — correct 1/0/1/1 buckets summing to
  the true total of 3, in both widgets. Same PR #14.
- **Security**: the three legacy free-reservation RPCs
  (`reserve_offer`, `mock_pay_and_reserve_offer`, `cancel_order`) had
  `EXECUTE` revoked from `authenticated` back on 2026-09-24. Re-confirmed
  live in production this session with a fresh throwaway account's genuine
  JWT — all three still return `403 42501 permission denied`.
- **RLS**: all 7 public tables have `rls_enabled: true`, no advisor findings
  outside intentional design (verified multiple times across sessions).
- **Native app store scaffolding**: Capacitor config correct
  (`com.argadaagdo.app`, `server.url` → production), real branded
  icons/splash screens (no more default blue "X"), permissions audit clean
  (Android: `INTERNET` only; iOS: no usage-description keys; no
  camera/location/push code anywhere in the app — nothing to justify to App
  Review).
- **Mobile responsive**: the offers-grid CSS Grid overflow bug (every card
  overflowing at every mobile width, not just the originally-reported 428px)
  is fixed and verified at 375/390/428, EN/KA.
- **Deploy pipeline**: confirmed working end-to-end this session — PR merge
  → Vercel's GitHub integration auto-deploys → `argadaagdo-silk.vercel.app`
  and its sibling aliases re-point to the new deployment, all within about a
  minute, verified by matching the deployment's `githubCommitSha` to the
  actual merge commit (not just "it looks new").
- **No console errors** found on the homepage, offers page, or any
  authenticated page checked (business dashboard, `/favorites`) across this
  and prior sessions.

### Intentionally deferred (not bugs — deliberate scope decisions, with reasons)
- **Multi-business dashboard mixing** (found 2026-09-25): if one owner
  account has 2+ approved businesses, the dashboard header can show one
  business's name while the stats/offers list below still show another
  business's data. Not fixed — only affects an owner running multiple
  locations, which doesn't exist among real users yet.
- **Admin dashboard Georgian translation gap**: nav and hero translate, but
  almost all analytics content (section headings, stat labels/descriptions,
  loading state) stays in English regardless of language toggle. Cosmetic,
  large, not fixed — customer- and business-facing pages translate
  correctly, this is admin-only.
- **No automated test suite anywhere** — verification has always meant
  manual QA plus `npm run lint` / `npm run build`. A deliberate MVP-stage
  trade-off, not an oversight anyone forgot to address.
- **No error tracking or product analytics** (no Sentry/PostHog/GA/etc.) —
  if something breaks in production, nobody gets paged; you'd have to notice
  or go looking at `/api/health` / Vercel's log drain.
- **Supabase Auth leaked-password protection (HaveIBeenPwned check) is
  disabled** — a one-toggle Supabase advisor recommendation, not enabled
  because it's an Auth-config change and every session's standing rule
  requires asking first before touching Auth config.
- **Small, low-priority known issues, none blocking**: a Georgian nav-bar
  sliver overflow on `/privacy` at exactly 375px (~5px, self-correcting into
  the pill's own margin); a handful of English-only strings on the public
  `/login` page in Georgian ("Forgot password?" etc.); in-page anchor nav
  on the business dashboard updates the URL but doesn't scroll to section;
  the "kg of food saved" metric is a flat 0.6kg/box estimate, not measured
  per offer.

### Only remaining blockers
These are the three things — and the *only* three things — standing between
this project and a real launch. Nothing else needs a decision, a credential,
or a purchase to move forward:

1. **Domain purchase** — `argadaagdo.ge` is still not registered on the
   Vercel account. The app runs fine on `argadaagdo-silk.vercel.app` in the
   meantime. `docs/domain-day-checklist.md` has the full day-of runbook
   (DNS, `NEXT_PUBLIC_SITE_URL`, Supabase Auth URL config, Resend domain
   verification, Capacitor `server.url` — all traced through the codebase
   already, nothing left to investigate, just to execute once the domain is
   bought).
2. **Bank payment integration (BOG vs. TBC — unresolved naming question,
   flagged repeatedly, never actually resolved)**: the code
   (`lib/payments/bog.ts`, the full provider abstraction, the DB-side RPCs)
   is built and the migration is applied — but every `BOG_*` environment
   variable is still completely unset in Vercel Production, so checkout
   cannot complete a real payment today. Separately, the user's own framing
   across multiple sessions has referred to "TBC bank," but everything
   actually built targets **Bank of Georgia (BOG)** — a different bank. This
   was never resolved because payments have been explicitly out-of-scope
   for every session that touched this project. Whoever picks this up next
   should resolve BOG-vs-TBC *first*, before chasing credentials for either.
   Also still open once that's resolved: whether the hardcoded fallback RSA
   callback-signature public key in `bog.ts` is real or a placeholder,
   whether `RESEND_API_KEY`/`CRON_SECRET` (present in Vercel but never
   independently triggered/verified) actually work, and getting a real
   sandbox/production BOG transaction to complete end-to-end at least once.
3. **Developer account purchases** — no paid Apple Developer or Google Play
   Console account exists yet, so the native app wrapper has never been
   built or tested as an actual installed app; everything checked against
   it is inferred from the Capacitor config (thin `server.url` wrapper, no
   native-only surface) rather than a first-hand check of a running build.

## ⚠️ Standing rule — read before touching anything

**Never touch RLS policies, auth (Supabase Auth config, session handling,
role/permission checks), or delete real data — in the database, in Supabase
Storage, or in any deployed environment — without asking the user first.**
This applies even if a task seems to require it as a side effect (e.g. "just
disable RLS to debug this query" or "drop and recreate the test user"). Ask,
don't act. This is a live production app (see below), so mistakes here are
not easily reversible.

## What this project is

ArGadaagdo is a pickup-only food-rescue marketplace for Tbilisi, Georgia
(Too Good To Go model). Businesses list discounted surprise bags; customers
pay online and pick up in person with a code. It's a production-demo MVP,
currently live at `https://argadaagdo-silk.vercel.app`.

Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Supabase
(Auth + Postgres + RLS + Storage + Realtime + RPC), Resend for transactional
email, Vercel for hosting/cron. No test framework is configured anywhere in
the repo (no `*.test.*` / `*.spec.*` files, no Jest/Vitest/Playwright config)
— verification currently means manual QA plus `npm run lint` / `npm run build`.

**Correction (2026-07-08, later pass)**: an earlier version of this note said
`node_modules/next/dist/docs/` doesn't exist — that was wrong. It exists and
contains real Next.js 16 docs (including an "AI agent hint" comment in
`index.md`, apparently shipped intentionally for coding agents). Version
installed is `16.2.6`. Checked `01-app/02-guides/upgrading/version-16.md` for
breaking changes before doing styling work: nothing there affects
client-component styling/JSX (the async `params`/`searchParams`/`cookies`/
`headers` breaking change matters only if you touch dynamic-route data
fetching, which none of the design/QA work in this pass did). Re-check that
doc if a future task touches `app/*/[id]/page.tsx` data fetching, `sitemap`,
or `opengraph-image` files.

## File structure

```
app/                      Next.js App Router routes
  api/payments/           BOG checkout, callback, return, refund routes
  api/cron/               Vercel cron: pickup-reminders, payment-maintenance
  api/health/             Public + authenticated health/monitoring endpoint
  checkout/[id]/          Customer checkout page
  offers/[id]/            Offer detail / reservation entry point
  orders/, favorites/, profile/, settings/   Customer account area
  business/dashboard/, business/register/    Business side
  admin/                  Admin dashboard (approvals, payments panel)
components/               Shared UI; business/, admin/, growth/, analytics/, orders/ subfolders
lib/                      Supabase clients, domain logic, validation, logging
lib/payments/             Provider abstraction (types.ts, provider.ts, bog.ts)
docs/                     payment-architecture.md, production-reliability.md
supabase/migrations/      Ordered SQL migrations (source of truth for schema + RPCs)
types/                    Shared TS domain types
```

`README.md` is fairly detailed and up to date (env vars, DB overview, deploy
notes, marketplace flow) — check it before re-deriving things by hand.
`docs/payment-architecture.md` specifically documents the payment design.

## Bank of Georgia payment integration — current state

**Update (2026-07-08, later pass): the migration is now applied.** A
follow-up session re-ran the RPC-existence check directly against Postgres
via the Supabase MCP tools (not just PostgREST probing) and confirmed
`create_provider_payment_order`, `finalize_provider_payment`, and
`expire_pending_provider_payments` all exist live in `public`, all
`security definer`, with the expected signatures. The functions were found
to already be live in the database (applied by some other means — dashboard
SQL editor or direct connection — not through the tracked migration
history), so that session additionally inserted a row into
`supabase_migrations.schema_migrations` for version `20260630120000` so the
migration history matches reality. **No schema/DDL was re-run** — only the
tracking-table bookkeeping was fixed. Bottom line: the DB-side blocker
described below is resolved; the code that follows was accurate at the time
it was written and is kept for history.

### Historical: confirmed live-DB state (verified 2026-07-08, early pass, against the live Supabase REST API — now stale, see update above)
No CLI/DB credentials (no `supabase`/`psql`, no service-role key) were
available in-session, so existence was checked by calling each RPC through
PostgREST (`POST {SUPABASE_URL}/rest/v1/rpc/<name>`) with the anon key and
reading the error code: a `PGRST202` "not found in the schema cache" error
means the function doesn't exist; a `42501 permission denied for function`
error means it exists but the calling role lacks grant. A deliberately
made-up function name was used as a control and produced the identical
`PGRST202` shape.

- `create_provider_payment_order` — **did not exist yet** (`PGRST202`) — now exists, see update above
- `finalize_provider_payment` — **did not exist yet** (`PGRST202`) — now exists, see update above
- `expire_pending_provider_payments` — **did not exist yet** (`PGRST202`) — now exists, see update above
- `attach_provider_payment_reference` — did not exist yet at that check (not re-verified in the later pass)
- `record_provider_payment_failure` — did not exist yet at that check (not re-verified in the later pass)
- `get_customer_refund_payment` — did not exist yet at that check (not re-verified in the later pass)
- `cancel_paid_order` — exists (`42501`, pre-dates this migration)
- `complete_pickup` — exists (`42501`, pre-dates this migration)
- `mock_pay_and_reserve_offer` — exists (`42501`, the old mock RPC)
- `reserve_offer` — exists (`42501`, even older RPC)
- `process_expired_marketplace` — exists and runs (200 OK)

**This session's standing rule (2026-07-08 design/QA pass): payment/BOG code
and RLS/auth logic are explicitly off-limits — being handled separately by
the user. Don't touch `lib/payments/`, `app/api/payments/`, RLS policies, or
auth logic in this pass even if you notice something that looks wrong.**

### Confirmed live-Vercel env state (re-verified 2026-09-24 — supersedes the 2026-07-08 snapshot below)
**Correction to earlier notes in this file**: the `vercel` CLI *is* installed
and already authenticated in this environment (as `bublika99-4343`, project
`bidzina-abesadze-s-projects/argadaagdo`) — an earlier pass in this project
incorrectly concluded it wasn't available (that was a shell artifact: the
`timeout` command doesn't exist on this machine, and the compound command
using it masked the real `vercel` check). Re-verify tool availability
directly (`which <tool>`) before trusting a prior "not available" note in
this file — don't propagate a stale negative.

**Update (2026-09-24): the 2026-07-08 snapshot below is now stale in an
important way.** Re-running `vercel env ls` today shows several variables
that the 2026-07-08 pass found completely absent are now set in Production
(added ~78-81 days before this check, i.e. shortly after that earlier
session — nobody wrote it back into this file at the time, which is exactly
the kind of drift this file exists to prevent):

- `NEXT_PUBLIC_SITE_URL` — Production *and* Preview
- `SUPABASE_SERVICE_ROLE_KEY` — Production *and* Preview
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Production, Preview
- `RESEND_API_KEY` — Production
- `TRANSACTIONAL_EMAIL_FROM` — Production
- `TRANSACTIONAL_EMAILS_ENABLED` — Production (note: `lib/email/send.ts` treats
  this as enabled-by-default anyway unless explicitly `"false"`, so its mere
  presence doesn't tell you much either way)
- `CRON_SECRET` — Production

Cross-checked against `/api/health` (public endpoint,
`https://argadaagdo-silk.vercel.app/api/health`), which today reports
`"status":"warning"` with `"4 production variable(s) should be configured
before launch"` — and `lib/monitoring.ts`'s `envRequirements` list makes it
possible to name exactly which 4 without needing `HEALTH_CHECK_SECRET` (which
still isn't set, but is `productionCritical: false` so doesn't count toward
that "4"): the remaining gap is **only the BOG variables**, still completely
unset in any environment — `BOG_CLIENT_ID`, `BOG_CLIENT_SECRET`,
`BOG_AUTH_URL`, `BOG_API_BASE_URL`, `BOG_CALLBACK_SECRET`,
`BOG_CALLBACK_PUBLIC_KEY`, `BOG_REQUIRE_CALLBACK_SIGNATURE`,
`BOG_REFUND_PATH_TEMPLATE`, and also still-unset `HEALTH_CHECK_SECRET` and
`TRANSACTIONAL_EMAIL_REPLY_TO` (optional/non-critical ones).

**What this means, practically:**
- Checkout still can't complete a real payment — `lib/payments/bog.ts`'s
  `getBogConfig()` still throws without `BOG_CLIENT_ID`/`BOG_CLIENT_SECRET`.
  This part of the 2026-07-08 finding is unchanged.
- The cron routes (`/api/cron/pickup-reminders`, `/api/cron/payment-maintenance`)
  may now actually be authenticating successfully, since `CRON_SECRET` is set
  — this **could not be verified in this session** (would need the actual
  secret value or `HEALTH_CHECK_SECRET`, neither of which this session pulled
  or was given — pulling `SUPABASE_SERVICE_ROLE_KEY`/other secrets via
  `vercel env pull` was in fact attempted and **blocked by the coding
  agent's own sandbox** as credential materialization). Don't assume either
  way — check Vercel's cron run logs directly, or ask the user.
- Transactional email **may** now actually be sending (`RESEND_API_KEY` is
  set) — also unverified in this session for the same reason. Whether it's a
  real, working Resend key (vs. a placeholder) was not confirmed. If a future
  session needs to know for sure, the honest way is to trigger one real
  action that sends an email (e.g. a reservation) and check it arrives —
  don't infer "configured" means "works."
- **A separate naming question surfaced this session, worth resolving before
  more payment work happens**: the user's own framing of "what's left" refers
  to "TBC bank" payment integration, but everything actually built in this
  repo (`lib/payments/bog.ts`, all the `BOG_*` env vars, `docs/payment-architecture.md`)
  is for **Bank of Georgia (BOG)**, a different bank than TBC Bank. Either the
  user means BOG informally, or the intended provider changed at some point
  and the code was never updated to match. This wasn't resolved in this
  session (payments are explicitly out of scope) — flag it to the user
  directly rather than assuming either interpretation.

### Historical snapshot (2026-07-08, kept for history — see "Update" above for what's changed)
Running `vercel env ls` on 2026-07-08 (no environment filter, so this covered
Production/Preview/Development together) returned **exactly four** variables
project-wide: `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — with none of
the BOG/Resend/cron/health variables present at all. That is no longer an
accurate picture of Resend/cron (see "Update" above); it remained accurate
for BOG as of 2026-09-24.

Don't add or change any Vercel environment variables without asking the user
first — same standing-rule logic as the database: this is live production
configuration, not local scratch state.

### Done (real implementation, not mocked)
- `lib/payments/bog.ts` — full BOG client: OAuth2 token fetch, create
  checkout session (`POST /payments/v1/ecommerce/orders`), verify payment
  (`GET /payments/v1/receipt/{ref}`), refund (`POST` to a configurable
  refund path template), callback secret check, and RSA-SHA256 callback
  signature verification against a public key.
- `lib/payments/provider.ts` + `types.ts` — clean provider abstraction
  (`PaymentProvider` interface) even though only `"bog"` is implemented
  today; README lists TBC/Stripe/PayPal/Apple/Google Pay as future
  candidates, none of which exist in code yet.
- `app/api/payments/checkout/route.ts` — validates signed-in + email-verified
  user, calls `create_provider_payment_order` RPC, creates a BOG session,
  attaches the provider reference; rolls back (`record_provider_payment_failure`)
  if session creation fails.
- `app/api/payments/bog/callback/route.ts` — verifies callback secret +
  signature, re-verifies payment status directly with BOG (doesn't trust
  the callback body alone), finalizes via RPC, sends confirmation email.
- `app/api/payments/bog/return/route.ts` — browser-redirect fallback path,
  same verify-then-finalize pattern, redirects to `/orders?payment=...`.
- `app/api/payments/refund/route.ts` — validates ownership/deadline via
  `get_customer_refund_payment` RPC, calls BOG refund API, then
  `cancel_paid_order` RPC.
- DB layer, **as written in migration file**
  `supabase/migrations/20260630120000_real_payment_integration_bog.sql`
  (⚠️ this migration is NOT applied to the live database — see confirmed
  state above) — `create_provider_payment_order`,
  `attach_provider_payment_reference`, `record_provider_payment_failure`,
  `get_customer_refund_payment`, `finalize_provider_payment`,
  `expire_pending_provider_payments`. As designed, inventory is decremented
  at hold time and restored exactly once on failure/expiry/refund;
  `finalize_provider_payment` is service-role-only so browser clients can't
  mark a payment paid directly; all functions are `security definer` with
  `search_path = ''` and explicit grants/revokes. This is good design on
  paper — it just isn't live yet.
- `app/api/cron/payment-maintenance/route.ts` — Vercel cron (once a day at
  03:00 UTC per `vercel.json`; it was every 30 min before the Hobby-plan
  change) calls `expire_pending_provider_payments(40)`; this will
  currently fail the same way (function not found) until the migration is
  applied.
- `lib/monitoring.ts` / `/api/health` — checks presence of `BOG_CLIENT_ID`,
  `BOG_CLIENT_SECRET`, `BOG_CALLBACK_SECRET`, `BOG_REQUIRE_CALLBACK_SIGNATURE`
  as part of operational health reporting. Note this only checks env vars
  are set, not that the DB-side RPCs the code depends on actually exist.
- The old mock RPC (`mock_pay_and_reserve_offer`, plus an even older
  `reserve_offer`) is confirmed still live in the DB — right now it is the
  *only* working reservation path, even though the frontend/checkout code
  no longer calls it and calls the (missing) provider RPCs instead.

### Stubbed / hardcoded / needs attention
- `lib/payments/bog.ts` has a **hardcoded fallback RSA public key**
  (`defaultBogCallbackPublicKey`) used when `BOG_CALLBACK_PUBLIC_KEY` isn't
  set in env. Nobody currently knows (from the repo alone) whether this is
  a real BOG-issued key or a placeholder generated during scaffolding —
  verify this against BOG's actual documentation/dashboard before relying
  on signature verification in production. If it's not genuinely BOG's key,
  callback signature checks will silently pass or fail incorrectly.
- Refund path is driven by `BOG_REFUND_PATH_TEMPLATE` env var with a guessed
  default (`/payments/v1/payment/refund/{order_id}`) — this specific
  endpoint shape has not obviously been confirmed against BOG's real API
  docs from inside this repo.
- No payout automation: `docs/payment-architecture.md` explicitly says "No
  payout table exists yet" — admin panel shows financial fields for
  visibility only, doesn't initiate business payouts.
- No automated tests anywhere for the payment flow (or anything else) — all
  the correctness claims above come from code review, not test runs.

### Missing / unconfigured (verify before assuming it works)
- ~~The live database is missing the entire `20260630120000` migration~~ —
  **resolved 2026-07-08, see "Update" above.** The RPCs are confirmed live.
- **Local `.env.local` has no BOG variables at all** — only Supabase URL/anon
  key are set. Locally, any checkout attempt will throw "Bank of Georgia
  payment credentials are not configured." You cannot exercise the BOG flow
  locally without adding `BOG_CLIENT_ID`/`BOG_CLIENT_SECRET`/etc. (see
  `.env.example` for the full list).
  - `.env.local` also contains a `VERCEL_OIDC_TOKEN` (secret) — don't cat
    that file in full when reporting things back to the user.
- Whether **production Vercel env vars actually contain real BOG
  credentials** (vs. placeholders) was not verified in this pass — the
  Vercel CLI isn't available in this environment, so this needs to be
  checked in the Vercel dashboard directly, or by asking the user. Moot
  until the migration above is applied, since the checkout RPC will fail
  before BOG is ever called.
- No evidence in-repo of an actual completed sandbox/production transaction
  against BOG's API — this integration reads as "correctly built against
  BOG's documented API shape" rather than "confirmed working against BOG,"
  and it cannot have completed successfully in its current state given the
  missing migration.

### Suggested next task for a fresh session working on this
The migration is applied, and (as of 2026-09-24) Resend/cron env vars are
now set too — see the "Update (2026-09-24)" note above. Still open, in
priority order:
1. **Resolve the BOG-vs-TBC naming question first** (see above) — no point
   chasing BOG credentials if the user actually wants a different provider.
2. If BOG is still the intended provider: get real `BOG_CLIENT_ID` /
   `BOG_CLIENT_SECRET` / `BOG_CALLBACK_SECRET` / `BOG_REQUIRE_CALLBACK_SIGNATURE`
   (and ideally the rest of the `BOG_*` set) into Vercel Production — as of
   2026-09-24 these are still the only production-critical vars missing per
   `/api/health`.
3. Whether the hardcoded fallback RSA public key in `bog.ts` is a real
   BOG-issued key or a scaffolding placeholder.
4. Whether any real BOG sandbox/production transaction has ever completed
   successfully end-to-end.
5. Whether `RESEND_API_KEY` and `CRON_SECRET` — now present in Vercel as of
   2026-09-24 — actually work (real key, cron logs showing successful auth)
   rather than just being set. Trigger a real send / check real cron run
   logs; don't infer from presence alone.
Don't assume "code looks complete" means "integration is verified" — this
file exists because that assumption was wrong once already. And remember:
payment/BOG code is off-limits to modify without the user's explicit go-ahead
(see standing rule above) — this is about verifying config, not writing code.

## Database

See `README.md`'s Database Overview table for the seven core tables
(`profiles`, `businesses`, `offers`, `orders`, `payments`, `business_ratings`,
`favorites`). Migrations in `supabase/migrations/` are the source of truth
and are meant to be applied in filename order. RLS is enabled on public
tables — see the standing rule above before changing any of this.

## 2026-07-08 design polish + QA session

A same-day follow-up session (branch `design-polish-and-qa`) ran a scoped
pass with explicit standing rules: no RLS/auth/payment changes, no real data
deletion, no prod env var changes without asking. Scope was: (1) visual
redesign toward "70% Apple, 30% Linear" — off-white background, near-black
text, green as a small accent only, generous whitespace, pill buttons —
page by page, no logic changes; (2) non-payment QA pass over customer and
business flows (links, console errors, layout, a11y, mobile); (3) optional
low-risk component splitting for the largest client files, only if time
allowed; (4) generating a `CRON_SECRET` value and Resend signup steps,
without touching Vercel directly. See git log on that branch / the PR it
opened for exactly what changed — this section intentionally doesn't
duplicate that detail so it doesn't rot; check the branch's commit history
for specifics.

## 2026-09-24 native app store readiness session

Branch `feature/native-app-store-readiness`. Goal: get as close to
"ready to build and submit" for iOS/Android as possible *without* a paid
Apple Developer or Google Play Console account (user doesn't have either
yet). Payments/TBC out of scope, untouched. Full detail, exact store
listing copy drafts, and the day-one submission checklist are in
`docs/app-store-submission.md` — this note is intentionally short so it
doesn't rot; read that doc rather than re-deriving any of this.

Headline findings for a future session to know without re-checking:
- Capacitor scaffolding (from an even earlier session) was already correct
  — `com.argadaagdo.app` v1.0, `server.url` pointing at
  `argadaagdo-silk.vercel.app`. `argadaagdo.ge` is **still not registered**
  on the Vercel account as of this session (re-verify before assuming
  otherwise — same "don't trust a stale note" lesson as the payment section
  above).
- iOS/Android icons and splash screens were still Capacitor's **default
  unbranded placeholder** (blue "X") until this session — now replaced with
  the real logo. Regenerate via `npx capacitor-assets generate
  --iconBackgroundColor '#5c7a5c' --splashBackgroundColor '#ece4d6'` if the
  logo ever changes; source files are in `assets/`.
- Permissions audit came back clean: Android requests only `INTERNET`, iOS
  has no usage-description keys, no camera/location/push code exists
  anywhere in the app. Nothing to justify to App Review.

## ⚠️ TEMPORARY TEST DATA in the production database (added 2026-09-24)

**The production Supabase project currently contains fake seed data,
created at the user's explicit request so real browsing/checkout
screenshots could be captured for the app store listing (see
`docs/app-store-submission.md`, "Test data" under section 5). This is
temporary and should be deleted before real pilot businesses onboard, so
it never gets confused with real data.**

Before this, every `public` table (`profiles`, `businesses`, `offers`,
`orders`, `favorites`, `payments`, `business_ratings`) had **zero rows** —
this was a completely empty production database. The rows below are the
only data of any kind in it right now:

- **Test customer**: `auth.users`/`public.profiles` id
  `fc1494b5-3606-4db9-bd06-3c0f22937d58`, email
  `test.customer.storeshots@example.com`. Password deliberately **not**
  recorded in this repo (shared with the user directly instead — a
  plaintext password in git history is bad practice even for a scoped test
  account); reset via Supabase Dashboard → Authentication → Users if it's
  needed again and lost. Created via the real signup API (not a raw SQL
  insert), so it's a normal, fully-functional account — just not a real
  person. Came back pre-confirmed on signup: **this
  project has email confirmation disabled at the Supabase Auth level**,
  independent of this test-data note — worth knowing generally, since it
  means any real signup today is instantly usable with no confirmation
  email step.
- **Test businesses** (`public.businesses`, both fictional, `approved =
  true`): id `2` "Old Town Bakery", id `3` "Vake Corner Cafe".
- **Test offers** (`public.offers`, both `active`): id `4` "Surprise Pastry
  Box" (business `2`), id `5` "Surprise Lunch Bag" (business `3`), pickup
  date `2026-09-25` — will show as expired after that date unless re-seeded.

No payment/BOG code was exercised to create or use any of this — the test
account only ever views checkout's pre-payment summary screen.

**To remove it** (do this before real businesses start onboarding):

```sql
delete from public.offers where id in (4, 5);
delete from public.businesses where id in (2, 3);
delete from public.profiles where id = 'fc1494b5-3606-4db9-bd06-3c0f22937d58';
```

Then delete the auth user via Supabase Dashboard → Authentication → Users
→ search `test.customer.storeshots@example.com` → Delete user (cleaner
than raw SQL against `auth.users`).

## 2026-09-24 wrap-up session — pausing on domain + TBC/BOG only

Branch `feature/native-app-store-readiness` (same branch as the native-app
session above). Goal per the user: get everything *except* buying
`argadaagdo.ge` and the bank payment integration genuinely finished, then
pause. Five things were done:

**1. Fixed the flagged 428px offer-card overflow bug — and it was bigger
than it looked.** The original note (in `docs/app-store-submission.md`)
described this as a minor, 428px-specific cosmetic issue. Root cause
turned out to be a real CSS Grid "blowout": the offers grid
(`app/offers/page.tsx`, the `mt-4 grid gap-5 sm:gap-6 md:grid-cols-2
xl:grid-cols-3` container) had **no base `grid-cols-1`**, so below the `md`
breakpoint the grid's implicit column sized itself to content instead of
the viewport. One card's title+address+"boxes left" row (a `flex
items-start justify-between` row with a `shrink-0` chip next to a
`min-w-0`/`truncate` address) has a large *intrinsic* max-content
contribution even though it renders fine at a definite width — and CSS
Grid's intrinsic-sizing pass doesn't know about that truncation trick, so
the column blew out to ~448px regardless of actual viewport width. Result:
every offer card overflowed at **every** mobile width, not just 428 —
confirmed **worse** at 375px (~89-117px overflow, English/Georgian
respectively) and 390px (~74-102px) than at 428px (~36-64px), which is
presumably just where a prior session happened to be looking (that width
matches the iOS 6.5" App Store screenshot size). Fix: added `grid-cols-1` to
that one container (`app/offers/page.tsx`). Verified with Playwright at
375/390/428, EN/KA, against both localhost and the live production site,
plus a stress test with artificially long title/address/quantity text to
confirm the fix holds for future content, not just today's two seeded
offers — zero overflow in all cases after the fix. This is the **only code
change** from this session; everything else below is documentation/audit.

**2. Full QA sweep (guest + attempted authenticated) at 375/390/428, EN/KA.**
Automated with Playwright (`playwright` is already a devDependency) rather
than the Claude-in-Chrome browser tool, which wasn't connected this
session. Findings:
- The offers-grid bug above (now fixed).
- No console errors, no failed network requests (4xx/5xx), and no other
  layout overflow found across `/`, `/offers`, `/offers/4`, `/offers/5`,
  `/businesses`, `/businesses/2`, `/businesses/3`, `/discover`, `/about`,
  `/contact`, `/faq`, `/for-businesses`, `/login`, `/privacy`, `/terms`,
  `/support`, `/business/register`, `/offline` — in either language, at any
  of the three widths, both against production and against a local build
  with the fix applied.
- The homepage "trust marquee" (verified/rated/pickup-only strip) reports as
  "overflowing" by a large margin in any naive DOM-overflow check — this is
  **intentional**: `.trust-marquee` has `overflow: hidden` with a
  `linear-gradient` edge mask, and `.trust-marquee__track` is a
  `width: max-content` flex row driven by a 28s CSS scroll animation
  (`app/globals.css`). Confirmed by reading the CSS, not a bug.
- **Minor, real, unresolved**: on `/privacy` specifically, in Georgian, at
  375px width, the fixed bottom tab bar (`components/Navbar.tsx`, the
  `.soft-raised.flex.w-full.max-w-md` pill) overflows its available track by
  ~5px (was ~5-21px across repeated runs/widths — borderline/inconsistent,
  possibly webfont-loading timing). Root cause identified precisely: all
  five Georgian tab labels (`მთავარი`, `დათვალიერება`, `აღმოჩენა`, `მეტი`,
  `შესვლა`) are single, unhyphenatable words with no internal spaces, so
  `flex-1` can't shrink them below their natural width — their summed
  min-content (~332px) plus gaps/padding (~364px total) narrowly exceeds
  the ~343px available track at exactly 375px viewport width. This is real
  but tiny (the pill is centered, so the overflow mostly eats into its own
  margin rather than visibly clipping content) and only shows up in
  Georgian at the single narrowest supported width. **Deliberately not
  fixed this session** — every fix considered (shrinking padding/gaps site
  wide, truncating tab labels, shrinking Georgian-specific font size) is a
  shared-component change with its own trade-offs, and this felt like the
  wrong thing to rush through in a "wrap up and pause" session. Worth a
  proper look next time someone's doing UI polish.
- **Authenticated-route coverage (`/orders`, `/favorites`, `/profile`,
  `/settings`, `/checkout/4`, `/checkout/5`, `/business/dashboard`,
  `/admin`) could not be completed this session** — the test account's
  password (`test.customer.storeshots@example.com`) that the user provided
  twice did not work (Supabase returned "Email or password is incorrect"
  both times, confirmed via a careful field-by-field retry, not a scripting
  bug). Pulling `SUPABASE_SERVICE_ROLE_KEY` via `vercel env pull` to reset
  it through the Auth Admin API was attempted and **blocked by the coding
  agent's own sandbox as credential materialization** — correctly, since
  that's a live production secret. The user was asked to reset the
  password directly in Supabase Dashboard → Authentication → Users instead.
  **Whatever the outcome of that was by the time this session ended, check
  the actual conversation transcript rather than assuming either way** —
  this file can't know which happened.

**3. This file (`PROJECT_CONTEXT.md`) — corrected, see the "Update
(2026-09-24)" note in the payments/env section above.** Headline: the
2026-07-08 snapshot claiming `RESEND_API_KEY`/`CRON_SECRET`/
`TRANSACTIONAL_EMAIL_FROM` were unset in Vercel was **stale** — they were
actually added ~78-81 days before this session (i.e. shortly after that
snapshot was written) and nobody updated this file. Re-verified live via
`vercel env ls` (read-only) and cross-checked against `/api/health`'s
"4 production variable(s) should be configured" warning plus
`lib/monitoring.ts`'s requirement list, which named the remaining 4 as
exactly the BOG variables — nothing else. Also surfaced: the user's own
framing this session referred to "TBC bank" as the still-pending payment
integration, but everything actually built (`lib/payments/bog.ts`, every
`BOG_*` env var, `docs/payment-architecture.md`) is for **Bank of Georgia
(BOG)**, a different bank — unresolved naming mismatch, flagged to the user
directly, not guessed at.

**4. Domain-day checklist written**: `docs/domain-day-checklist.md`. Covers,
in order: Vercel domain + DNS, updating `NEXT_PUBLIC_SITE_URL` (traced to
confirm it's the *only* env var needed to fix metadata/OG tags, sitemap,
robots, every transactional email link, and BOG callback/return URLs — all
go through `lib/site.ts`'s `absoluteSiteUrl()`), Supabase Auth URL
Configuration (confirmed no OAuth provider exists to also update — email/
password only), Resend domain verification, Capacitor `server.url` +
`npx cap sync` (with a caveat that this only matters once a real native
build/submission happens, which hasn't yet), doc reference updates, and an
end-to-end verification checklist. Every literal reference to
`argadaagdo-silk.vercel.app` in the repo was found by grep, not by memory —
listed in the checklist doc itself so it can be re-run on the actual day.

**5. Full honest completeness audit** (beyond payments/domain, which are
explicitly excluded per the user's framing):
- **No automated tests exist anywhere** (already known, restated for
  completeness) — verification is `npm run lint` / `npm run build` / manual
  QA only.
- **No external error tracking or product analytics** — grepped for
  Sentry/PostHog/Mixpanel/Amplitude/GA/Plausible and found none. Errors are
  only visible via `lib/logger.ts`'s structured console output (captured by
  Vercel's own log drain) and `/api/health`. If something breaks in
  production, nobody gets alerted — you'd have to notice or go looking.
- ~~**The old mock reservation RPC is still live and callable in
  production**~~ — **fixed in a follow-up same-day session, see
  "2026-09-24 security fix" below.**
- **Supabase Auth: leaked-password protection is disabled** (HaveIBeenPwned
  check) — a one-toggle, non-breaking improvement Supabase's own advisor
  flagged. Not changed this session (Auth config, per the standing rule).
- **RLS coverage is genuinely complete**: verified via Supabase's advisor +
  a direct table listing that all 7 public tables have `rls_enabled: true`
  and there are no "RLS disabled" lint findings. The security advisor's
  other findings (multiple permissive policies per table for
  admin/owner/user roles, several `SECURITY DEFINER` RPCs callable by
  `anon`/`authenticated`) read as **intentional design**, not oversights —
  that's how this app's role-based access and RPC-mediated business logic
  is supposed to work — with the one exception of the mock RPC above.
- **The "kg of food saved" impact metric is a flat estimate**
  (`estimatedKgSavedPerBox = 0.6` in `lib/analytics.ts`), not measured per
  offer. Reasonable as a simplifying assumption for an MVP, but it's an
  assumption, not real data — worth knowing if that number ever gets quoted
  publicly as if it were measured.
- **Business analytics/revenue insights are real**, computed from actual
  order/offer data passed into pure functions in `lib/analytics.ts` — not
  fabricated numbers, confirmed by reading the code path.
- **In-app notifications are session-only**: `lib/notifications.ts`
  dispatches a `window` `CustomEvent` consumed live in the same tab
  (presumably by `components/NotificationCenter.tsx`) — there's no
  `notifications` table and nothing persists across a reload or another
  device. This is a real, working feature for what it does, but it's not
  the same thing as "notification history" or push notifications (of which
  there are none — confirmed no push/camera/location code exists anywhere,
  consistent with the native-app session's permissions audit above).
  Calling this a "placeholder" (as one internal debug log message does) is
  leftover phrasing from scaffolding, not an accurate description of a
  finished, working feature — but it is a narrower feature than the name
  might suggest.
- Everything else previously flagged as open in this file (BOG credentials,
  BOG callback public key authenticity, no confirmed real BOG transaction,
  payout automation, RESEND_API_KEY/CRON_SECRET *working* vs. merely
  *present*) is unchanged from what's already written above — restating it
  here would just duplicate, not add signal.

**Bottom line**: after this session, the only things genuinely deferred are
domain purchase and the bank payment integration (BOG vs. TBC — see the
naming note above) — plus the handful of small, explicitly-listed items in
this section (the Georgian nav-bar sliver overflow, the exposed mock RPC,
missing error tracking, disabled leaked-password protection, and unverified
authenticated-route QA). None of those are things this session invented —
they were either already true and undocumented, or are small enough that
rushing a fix without the user's explicit steer felt like the wrong call
for a pause-the-project session. Read the actual chat transcript for this
session's final summary to the user rather than re-deriving it from this
file alone.

## 2026-09-24 security fix — closed off legacy free-reservation RPCs

Same-day follow-up to the wrap-up session above, explicitly flagged by the
user as priority (not routine cleanup) after reading the audit finding
about `mock_pay_and_reserve_offer` above.

**Audited three legacy RPCs, not just the one originally flagged**, since
the user asked to check for "any other leftover/legacy RPCs from earlier
payment iterations that might have the same problem":

- `reserve_offer(bigint)` — the original pre-payment reservation path
  (from `20260526110120_secure_marketplace_rls_and_rpcs.sql`). Inserts a
  real `orders` row, `status='reserved'`, `payment_method='cash'`, **with
  no payment check whatsoever**.
- `mock_pay_and_reserve_offer(bigint)` — the mock-payment path (created/
  replaced across three migrations, most recently
  `20260616120000_expire_stale_reserved_orders.sql`). Same free-reservation
  problem, plus it inserts a fake `payments` row (`status='paid'`,
  `provider='mock'`) that could be mistaken for a real payment in
  admin/analytics.
- `cancel_order(bigint)` — the original pre-payment cancellation path,
  superseded by `cancel_paid_order`. Not a free-reservation bug, but it's
  missing the 2-hour cancellation-deadline check and the
  `quantity_restored_at` idempotency guard that `cancel_paid_order` has —
  a real (lower-severity) bypass of the cancellation-window business rule.

**Verified before touching anything** that nothing legitimate depends on
any of the three: grepped all app code for `.rpc(` calls (none call these
three — confirmed exactly which RPCs the app *does* call:
`attach_provider_payment_reference`, `cancel_paid_order`, `complete_pickup`,
`create_provider_payment_order`, `expire_pending_provider_payments`,
`finalize_provider_payment`, `get_business_rating_summary`,
`get_customer_refund_payment`, `get_public_business_reviews`,
`mark_order_no_show`, `process_expired_marketplace`, `rate_business`,
`record_provider_payment_failure`); checked live (not just migration
files, given this project's history of DB objects existing outside tracked
migrations) whether any *other* function's source, any trigger, or any
view references them — none do (`public` schema has zero views; all 9
non-internal triggers are storage/realtime/auth-signup infrastructure,
unrelated).

**Fix applied**: revoked `EXECUTE` on all three from `authenticated` —
deliberately **revoke, not drop** (Supabase's own security advisor lists
revoke as the standard remediation for this finding class; it's instantly
reversible with one `GRANT` if ever needed, whereas drop would need the
full function body reconstructed from migration history to undo, for no
extra security benefit since nothing depends on them). Applied via a
tracked migration (`revoke_legacy_reservation_rpcs`, applied through
`apply_migration`, not raw `execute_sql`, specifically so this shows up in
`list_migrations` like every other schema change — this project has
already had drift once between the live DB and tracked migration history,
no reason to add to it). One correction to the original framing: `anon` was
never granted `EXECUTE` on any of these — the real exposure was any
**signed-up customer account**, trivial to create since email confirmation
is disabled.

**Verified both before and after** using a fresh throwaway account (real
signup via `/auth/v1/signup`, immediately usable since email confirmation
is off) to get a genuine `authenticated` JWT — deliberately called each RPC
with a nonexistent offer/order id (`999999`) rather than a real seeded
offer, so the demonstration never actually created a reservation or
touched the real test data:
- **Before**: all three returned `400 P0001` with their own business-logic
  message (`"Offer sold out"`, `"Offer is not available"`, `"Reservation
  cannot be cancelled"`) — proving they were reachable and executing.
- **After**: all three returned `403 42501 permission denied for function
  <name>` — confirmed with a *second*, brand-new throwaway account (not the
  same JWT), proving the fix applies to any current or future account, not
  just a cached session.
- Also re-checked live grants on every RPC the app actually calls
  (`create_provider_payment_order`, `cancel_paid_order`, `complete_pickup`,
  `rate_business`, `mark_order_no_show`, `get_business_rating_summary`,
  `get_public_business_reviews`, `process_expired_marketplace`,
  `attach_provider_payment_reference`, `record_provider_payment_failure`,
  `get_customer_refund_payment`) — all unchanged, still correctly granted.
  `finalize_provider_payment` and `expire_pending_provider_payments` remain
  service-role-only, as designed.

**Left over from this fix, for whoever picks this up next**: two throwaway
audit accounts now exist in `auth.users`
(`security-audit-throwaway-<timestamp>@example.com`, password not recorded
here — this repository is public, so these accounts should be deleted or
have their passwords rotated; both plain `customer` role, **zero** orders/payments
— the nonexistent-offer-id trick above means neither ever created any real
data). Harmless to leave, but delete them via Supabase Dashboard →
Authentication → Users if you'd rather not have them around — the user
explicitly asked this session to prefer the Dashboard's own tools over raw
SQL against `auth.users` for anything auth-related, so that preference
applies here too; not deleted via SQL in this session for that reason.

**Not done in this fix** (unchanged from the wrap-up session's audit):
resetting `test.customer.storeshots@example.com`'s password — the user
asked for the Dashboard's own "Reset Password" flow instead of the
`pgcrypto`-against-`auth.users` approach that was offered, so that's a
manual step on the user's side, not something this session did.

## 2026-09-25 full authenticated QA pass (customer, business, admin)

Branch `feature/native-app-store-readiness`, same branch as the sessions
above. Goal per the user: a genuine, exhaustive pre-launch test pass across
all three roles (customer, business, admin), now that authenticated routes
could finally be reached. Payments/TBC still explicitly out of scope.

**Drift correction, found before any testing started**: this file's
"TEMPORARY TEST DATA" section (above) implied the only pre-2026-09-24 state
was an empty database. That was wrong — a live query of `public.profiles`
and `public.businesses` at the start of this session found **~13 additional
accounts and 1 additional business** left over from the 2026-07-08 QA
session, none of which that session's own write-up (further above)
mentioned creating. Specifically: a `qa-test-business-20260708@example.com`
account owning an already-`approved` business ("QA Test Bakery", id 1, with
one real historical `no_show` order on it from `qa-test-customer-20260708@
example.com`), plus ~9 more disposable `qa-test-customer-*` accounts from
what look like mobile-nav/error-check QA scripts, plus the founder's own
real accounts (`abesadze.bidzina@gmail.com` = admin,
`argadaagdosupport@gmail.com` / `alinavanempel@googlemail.com` = business,
`bublika99@gmail.com` and others = customer) that were never documented
here at all. Lesson restated for whoever reads this next: query the DB
directly rather than trusting this file's data-state claims at face value —
this is the second time undocumented drift has been found here.

**Test credentials used this session** (passwords shared with the user
directly, not recorded here, consistent with this file's existing practice):
- **Customer**: `test.customer.storeshots@example.com` — see "password
  lockout" note below.
- **Business**: `qa-test-business-20260708@example.com` (the pre-existing
  account found above, reused rather than creating a new one; password was
  reset this session). Owns "QA Test Bakery" (business id 1, approved).
- **Admin**: `qa-test-admin-20260924@example.com` — created fresh this
  session via the real customer signup flow, then promoted with a single
  `update public.profiles set role = 'admin' ...` (a data write, not an
  RLS/auth-config change; the real admin account,
  `abesadze.bidzina@gmail.com`, was deliberately left untouched since it
  reads as the founder's personal account). **This account was deleted
  again during this session's own cleanup** (see below) — recreate it the
  same way (signup + one SQL role update) if a future session needs admin
  access.

**Customer-account password lockout, resolved (not a wrong-password issue)**:
`test.customer.storeshots@example.com` failed login with "Email or password
is incorrect" several times early in this session, matching the exact
failure the 2026-09-24 wrap-up session hit twice with this same account. The
user authorized resetting it directly via SQL
(`extensions.crypt(...)` against `auth.users.encrypted_password`) rather
than the Dashboard's Reset Password flow this time. The new password
**still failed** immediately after the reset — but a direct SQL check
(`encrypted_password = crypt('<pw>', encrypted_password)`) proved the hash
matched the exact password being typed, ruling out a bad reset. After
pausing further attempts (to avoid deepening whatever was blocking it) and
doing ~15 minutes of business/admin-side testing instead, a retry with the
identical credentials succeeded. **Working theory**: Supabase Auth applies
a temporary account-level lockout/cooldown after repeated failed password
attempts (this account had accumulated several across two sessions), and
returns the same generic "invalid credentials" error during the cooldown to
avoid leaking lockout state — rather than a 429/rate-limit-specific error.
Not confirmed against Supabase's docs, but it's the only explanation
consistent with a cryptographically-verified-correct password being
rejected and then accepted ~15 minutes later with zero other changes.
**If a future session hits the same "correct password still rejected"
symptom, wait rather than keep resetting the password.**

### Task 1 — Customer journey (`test.customer.storeshots@example.com`)
Sign in, browse offers, offer detail, checkout, orders, profile, settings,
sign out — all walked through end to end.
- **Sign in / browse / offer detail / orders / profile / settings / sign
  out**: all worked correctly. Profile display-name edit saved and
  persisted. Settings hub page correctly links out to profile/notifications/
  privacy/account sections.
- **Checkout correctly stops before payment**, exactly as it should: filled
  the reservation summary, required the "I understand pickup and
  cancellation rules" checkbox before enabling "Pay and reserve", then on
  submit showed a clean, generic "Reservation could not be completed.
  Please try again." (not a leaked internal error) since BOG credentials
  aren't configured. Verified at the DB level, not just in the UI: the
  attempt did create an `orders` row (`status='cancelled'`,
  `quantity_restored_at` set within under a second) — meaning the
  hold-then-roll-back-on-payment-failure path is real and correctly wired,
  not just that nothing visibly happened. Offer quantity was unaffected
  (stayed at 2 before and after).
- **Bug — no way to favorite an offer**: despite a full "Favorites" feature
  existing (`/favorites` page, nav link, `favorite_count`/`Saved`/
  `Available`/`Unavailable` stats, a `favorites` table), **no heart/save/
  favorite control exists anywhere in the customer-facing UI** — not on the
  offer detail page, not on offer cards in `/offers`, not on `/discover`.
  Checked via the accessibility tree (`read_page`/`find`), not just
  visually, on all three surfaces. The `/favorites` page itself works and
  correctly shows "Saved: 0", so the read side of the feature is intact —
  only the "add to favorites" entry point is missing. This is a genuine
  functional gap, not a rendering bug tied to test data.

### Task 2 — Business journey (`qa-test-business-20260708@example.com`)
- **Dashboard, profile edit, offer creation, reservation history**: all
  worked. Business-profile edit (the RLS fix from the earlier session) is
  confirmed still working — edited the phone number, got "Business profile
  updated," reloaded, change persisted. Created a real new offer ("QA Test
  Surprise Bag", ₾6.50, qty 2, pickup 25 Sep 18:00–19:30) through the full
  form; it published immediately and was correctly visible to the customer
  account on `/offers` and `/discover`. (This offer and the one throwaway
  reservation created while testing checkout were deleted in this session's
  cleanup — see below.)
- **Bug — reservation-summary double-counts no-shows**: the dashboard's
  "Reservation Summary" card for "QA Test Bakery" showed "Total
  Reservations: 1" but a breakdown of "Reserved: 0, Collected: 0,
  Cancelled: 1, No-show: 1" — summing to 2 against a total of 1. Verified
  against the DB directly: there is exactly **one** order, with
  `status = 'no_show'`. The UI is counting that single no-show order into
  *both* the "Cancelled" and "No-show" buckets. Real, reproducible,
  independent of any test data created this session (this order predates
  this session, from 2026-07-08).
- **Bug — multi-business dashboard mixes business identity and stats**:
  registering a second business under the *same* owner account (done to
  test Task 3's admin-approval flow — see below) exposed a real bug once
  approved: the dashboard's welcome header switched to showing the
  newly-approved business's name ("Welcome back, QA Approval Test Cafe")
  while the stat cards directly below it ("My offers: 4", "Active offers:
  1") and the "My offers" list underneath both still showed data belonging
  to the *other* business ("QA Test Bakery"'s offers, including the
  "QA Test Surprise Bag" created in Task 2). The "Create offer" form's own
  Business dropdown correctly lists and distinguishes both businesses, so
  the app clearly intends to support one owner with multiple businesses —
  the header/stats section just doesn't correctly scope to whichever
  business context is actually selected. A real business owner running two
  locations would see this exact confusion.
- **Minor**: clicking the in-page "Offers" / "Orders" nav shortcuts (hash
  anchors like `#business-offers`, `#business-reservations`) updates the
  URL but does not scroll the page to that section — had to use
  element-search + scroll-to instead. Cosmetic, not a functional bug.
- **Minor**: the file-upload control for offer images reads "Datei
  auswählen / Keine ausgewählt" (German) regardless of the site's EN/KA
  toggle — this is the browser's native file-input label taking its
  language from the OS/browser locale, not an app translation bug, but
  worth knowing so it isn't mistaken for one.

### Task 3 — Admin journey (`qa-test-admin-20260924@example.com`)
- **Business approval**: registered a brand-new business ("QA Approval Test
  Cafe") through the real `/business/register` wizard while signed in as
  the business test account (attaches to whichever account is currently
  signed in — no separate signup step), confirmed it appeared in the admin
  "Pending businesses" queue with full submitted details, clicked
  "Approve," got "Business approved," and confirmed on reload that
  "Pending Businesses" dropped from 1 to 0 and "Approved Businesses" rose
  from 3 to 4. Full loop verified, not just the click.
- **Minor / polish**: the approval card's review-reason panel includes the
  visible copy "Current database stores approval as approved or pending.
  Notes help the operator decide what to tell the business manually." —
  reads like an internal implementation note that leaked into user-facing
  admin UI rather than being deleted before shipping. Not a functional bug,
  but worth a copy pass.
- **Dashboard stats**: reviewed the full admin analytics dashboard
  (businesses/offers/orders/customers/revenue/activity sections) against
  the DB directly — every number checked out correctly against the live
  data (`Total Businesses: 4`, `Admins: 2`, `Customers`/`Business Accounts`
  counts, etc.), no fabricated numbers found.
- **Bug — most of the admin dashboard is not translated to Georgian**:
  switching to ქართული translates the page's hero title/subtitle and the
  bottom nav labels, but essentially everything else — every analytics
  section heading ("MARKETPLACE OVERVIEW", "Pilot operations snapshot"),
  every stat card label and its description ("Total Businesses", "All
  submitted business profiles", "Approved Businesses", "Financial and
  operational insight," etc.), and the "Loading admin dashboard..." loading
  state — stays in English. This is a real, large i18n gap specific to the
  admin dashboard (the customer- and business-facing pages checked this
  session translate correctly; only admin's analytics content doesn't).

### Task 4 — Cross-cutting checks
- **Legacy RPC revoke still holds**: checked live grants directly (not just
  trusting the earlier fix) — `reserve_offer`, `mock_pay_and_reserve_offer`,
  and `cancel_order` all still show `has_function_privilege(...) = false`
  for both `authenticated` and `anon`. The 2026-09-24 security fix is
  intact.
- **No console errors** observed across any authenticated page visited
  this session (customer, business, admin), checked via the browser's
  console log, not just visual inspection.
- **Mobile widths + Georgian on authenticated pages**: the Claude-in-Chrome
  browser tool's window-resize did not reliably shrink an *existing* tab's
  actual rendering viewport in this environment (the OS window resized but
  `window.innerWidth` stayed at the desktop value) — resizing before
  opening a *fresh* tab worked correctly, so mobile testing this session
  used that workaround rather than true 375/390/428 spot-checks on every
  authenticated page. What *was* checked at an accurate ~390px-equivalent
  mobile viewport, in both languages: `/login`, the business dashboard, and
  the admin dashboard — no new overflow bugs found on any of them, in
  either language (the previously-documented Georgian nav-bar sliver on
  `/privacy` is a guest-page issue and wasn't re-checked here). This is
  narrower coverage than a full 375/390/428 × EN/KA × every-authenticated-
  page matrix — treat authenticated-route mobile layout as "spot-checked,
  not exhaustively verified" rather than fully cleared.
- **Minor i18n gap on the public `/login` page**: in Georgian, "Need help
  signing in?", "Forgot password?", "Need to verify your email?", and
  "Resend verification email" all stay in English while the surrounding
  copy translates correctly. Noticed incidentally while testing mobile
  layout; not one of the previously-known/fixed issues.
- **Native app wrapper**: not independently tested (no paid Apple/Google
  developer account exists to produce an actual build, per the
  native-app-store-readiness session above). The wrapper is a thin
  Capacitor `server.url` pointing at this exact production URL with no
  native chrome, camera/location/push code, or other native-only surface
  (confirmed by the permissions audit in the native-app session) — so
  everything checked against the live URL this session is what the wrapper
  would show. This is an inference from the Capacitor config, not a
  first-hand check of a running native build.

### Cleanup performed this session
Per the user's explicit go-ahead, both this session's own throwaway data
*and* the undocumented 2026-07-08 leftovers (see drift note above) were
cleaned up:
- **Deleted**: 9 disposable `qa-test-customer-*` accounts from the
  2026-07-08 session (`-mobilenav-*` ×4, `-mobilesweep-*` ×2,
  `-errcheck*` ×2, `-navcheck-*` ×1) and the 2
  `security-audit-throwaway-*` accounts from the RPC-revoke fix — all
  confirmed to have zero orders/favorites/payments before deletion. Deleted
  via SQL (`public.profiles` → `auth.identities` → `auth.users`, in that
  order), not the Dashboard, per the same one-off exception the user
  granted for the password reset above.
- **Deleted**: this session's own throwaway admin test account
  (`qa-test-admin-20260924@example.com`), the throwaway business created to
  test admin approval ("QA Approval Test Cafe", business id 4, 0 offers),
  the throwaway offer created to test the business dashboard ("QA Test
  Surprise Bag", offer id 6), and the one order it produced while testing
  checkout failure (`order id 2`, already `cancelled` with quantity
  restored).
- **Kept, deliberately**: `qa-test-customer-20260708@example.com` — looked
  like another disposable throwaway but actually owns the one real
  historical `no_show` order that "QA Test Bakery"'s reservation-history
  features (and the double-counting bug above) depend on; deleting it would
  have silently erased that test fixture. `qa-test-business-20260708@
  example.com` (now the designated reusable business test account, password
  reset this session — treat it like `test.customer.storeshots@
  example.com`: a standing fixture, not a one-off) and its "QA Test Bakery"
  business/offers. `test.customer.storeshots@example.com` itself. All of
  the founder's own real accounts found during the drift check above were
  left completely untouched.
- **Not touched**: `abesadze.bidzina@gmail.com` (real admin account),
  `argadaagdosupport@gmail.com` / `alinavanempel@googlemail.com` (real
  business accounts), and other real personal customer accounts — none of
  these were part of this session's test-data scope.
- **Pre-existing, unrelated to this session**: `auth.users` has 2 more rows
  than `public.profiles` after cleanup (13 vs. 11) — this gap existed
  before any of this session's changes (deletions removed equal counts from
  both tables) and wasn't investigated further; flagging in case a future
  session wants to know why 2 auth users have no profile row.

### Bottom line for "would you hesitate to call this app-store-ready?"
Two real functional bugs (missing favorite-button UI, reservation-summary
double-counting) and one real data-modeling bug (multi-business dashboard
mixing) were found and are **unfixed** — none were touched this session per
the "QA/audit pass, not a fix pass" framing, consistent with how prior
sessions in this file have handled findings. The admin-dashboard i18n gap is
cosmetic but large. None of these are payment- or security-related, and
none block a first submission for a single-business pilot (the
multi-business bug only manifests for an owner with more than one
business, which doesn't exist among real users yet). See the chat
transcript's final message to the user for the direct, prioritized answer
to their app-store-readiness question — this file intentionally doesn't
duplicate that judgment call.
