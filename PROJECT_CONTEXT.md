# ArGadaagdo — Project Handoff / Context

Read this file first, before exploring the codebase. It exists so a fresh
Claude Code session doesn't have to rediscover the same things by grepping
around. Update it when the architecture materially changes.

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
- `app/api/cron/payment-maintenance/route.ts` — Vercel cron (every 30 min
  per `vercel.json`) calls `expire_pending_provider_payments(20)`; this will
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
(`security-audit-throwaway-<timestamp>@example.com`, both password
`AuditThrowaway123!`, both plain `customer` role, **zero** orders/payments
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
