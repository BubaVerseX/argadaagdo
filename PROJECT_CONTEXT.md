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

### Confirmed live-Vercel env state (verified 2026-07-08 via `vercel env ls`)
**Correction to earlier notes in this file**: the `vercel` CLI *is* installed
and already authenticated in this environment (as `bublika99-4343`, project
`bidzina-abesadze-s-projects/argadaagdo`) — an earlier pass in this project
incorrectly concluded it wasn't available (that was a shell artifact: the
`timeout` command doesn't exist on this machine, and the compound command
using it masked the real `vercel` check). Re-verify tool availability
directly (`which <tool>`) before trusting a prior "not available" note in
this file — don't propagate a stale negative.

Running `vercel env ls` (no environment filter, so this covers
Production/Preview/Development together) returned **exactly four** variables
project-wide:

- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**None of the following exist in Vercel, in any environment**: `BOG_CLIENT_ID`,
`BOG_CLIENT_SECRET`, `BOG_AUTH_URL`, `BOG_API_BASE_URL`, `BOG_CALLBACK_SECRET`,
`BOG_CALLBACK_PUBLIC_KEY`, `BOG_REQUIRE_CALLBACK_SIGNATURE`,
`BOG_REFUND_PATH_TEMPLATE`, `RESEND_API_KEY`, `TRANSACTIONAL_EMAIL_FROM`,
`TRANSACTIONAL_EMAIL_REPLY_TO`, `TRANSACTIONAL_EMAILS_ENABLED`, `CRON_SECRET`,
`HEALTH_CHECK_SECRET`.

**This is a second, independent production blocker on top of the missing
migration** — fixing the DB alone is not sufficient to unbreak checkout:
- `lib/payments/bog.ts`'s `getBogConfig()` throws immediately
  ("Bank of Georgia payment credentials are not configured") without
  `BOG_CLIENT_ID`/`BOG_CLIENT_SECRET`, regardless of DB state.
- Both cron routes (`/api/cron/pickup-reminders`,
  `/api/cron/payment-maintenance`) unconditionally return 401, because
  `isCronAuthorized()` does `if (!secret) return false` when `CRON_SECRET`
  is unset — so Vercel's scheduled cron hits have been failing auth this
  whole time, independent of everything else in this file.
- No transactional email can send (`RESEND_API_KEY` missing) — reservation
  confirmations, cancellations, approvals, pickup/rating emails are all
  silently no-op-ing (the email sender logs failures but doesn't roll back
  the underlying action, per `README.md`).

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
The migration is applied, but nothing about production readiness beyond
the DB is confirmed yet. Still open, in priority order:
1. Confirm whether the Vercel project actually has real BOG credentials set
   (`BOG_CLIENT_ID`, `BOG_CLIENT_SECRET`, etc.) — the last direct check
   (2026-07-08, early pass) found **zero** of the BOG/Resend/cron env vars
   set in Vercel across all environments. That may have changed since; ask
   the user or re-run `vercel env ls` rather than trusting this note.
2. Whether the hardcoded fallback RSA public key in `bog.ts` is a real
   BOG-issued key or a scaffolding placeholder.
3. Whether any real BOG sandbox/production transaction has ever completed
   successfully end-to-end.
4. `RESEND_API_KEY` and `CRON_SECRET` are also still unconfirmed/unset in
   Vercel as of the last check — see the "design/QA pass" session notes
   below (a 2026-07-08 session generated a `CRON_SECRET` value and gave the
   user Resend signup steps, but did not set anything in Vercel itself).
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

A same-day follow-up session (branch `design-polish-and-qa`, merged to main
via PR #2, commit `7e331f5`) ran a scoped pass with explicit standing rules:
no RLS/auth/payment changes, no real data deletion, no prod env var changes
without asking. Scope was: (1) visual redesign toward "70% Apple, 30% Linear"
— off-white background, near-black text, green as a small accent only,
generous whitespace, pill buttons — page by page, no logic changes; (2)
non-payment QA pass over customer and business flows (links, console errors,
layout, a11y, mobile); (3) optional low-risk component splitting for the
largest client files, only if time allowed; (4) generating a `CRON_SECRET`
value and Resend signup steps, without touching Vercel directly. See git log
on that branch for exactly what changed.

**Later the same day**, with the user's explicit go-ahead (a new, specific
instruction overriding the "don't touch Vercel" default from earlier),
`CRON_SECRET`, `RESEND_API_KEY`, `TRANSACTIONAL_EMAIL_FROM`, and
`TRANSACTIONAL_EMAILS_ENABLED` were all set directly in Vercel production via
the `vercel` CLI, followed by a `vercel deploy --prod` to bake them into a
new deployment (env var changes don't apply to already-built deployments).
A real reservation-confirmation email was sent via Resend's live API to
confirm the pipeline works (see 2026-07-08 test-data note below). **All four
of these vars were saved as Vercel's "Sensitive" type**, meaning their values
can never be read back via `vercel env pull`/CLI/dashboard by anyone,
including future sessions — if you need to verify or rotate them, you'll
need to re-add them (ask the user for values first, per standing rules) or
have the user check Vercel's dashboard directly.

## 2026-07-08 QA/a11y/RLS-audit/health-review session

A third same-day session (branch `qa-a11y-audit-pass`) ran with payments
explicitly on hold for a few weeks (user is sorting out real business
banking) — standing rule: don't touch any payment/BOG code, env vars, or
logic at all this session, on top of the usual RLS/auth/no-deletion rules.
Findings, in brief (full detail lives in that branch's commits/PR, and in
the conversation transcript — check there for specifics rather than trusting
a paraphrase here to stay current):

- **No regressions** from the design-polish-and-qa merge — re-swept all
  routes, desktop + mobile, zero console errors/broken links/overflow.
- **Fixed**: a real WCAG contrast failure (`text-gray-400` on white/off-white
  measured ~2.5:1, below the 4.5:1 AA minimum for normal text; bumped to
  `text-gray-500` at ~4.8:1 across 6 files/16 spots) and a missing
  `aria-label` on the order review textarea (previously placeholder-only).
- **Email confirmation**: strong empirical evidence (via `auth.users`
  signup-to-confirm timing) that auto-confirm has been active since shortly
  after the very first account (2026-05-20) — every account since confirms
  in ~30-60ms, not humanly possible for a real email click. Contradicts
  `README.md`'s stated intent that confirmation "should be enabled for
  production." Not changed — flagged for the user to decide.
- **Site URL / redirect URLs**: could not be verified — this lives in
  GoTrue's own config, not any Postgres table, and no `supabase` CLI or
  Management API token was available. User needs to check the Supabase
  Dashboard directly (Authentication → URL Configuration) if this matters.
- **RLS audit**: overall design is solid (SELECT-only client access to
  `orders`/`payments`, all mutations via `SECURITY DEFINER` RPCs; `offers`
  and `businesses` correctly scoped to owner+approved-status; helper
  functions in the `private` schema are all `SECURITY DEFINER` with
  `search_path = ''` and check both ownership and approval consistently).
  **One confirmed real bug**: `businesses` has no owner UPDATE policy, only
  an admin-approval one — so the "Save profile" feature on the business
  dashboard (`app/business/dashboard/page.tsx`, direct `.update()` on
  `businesses`) silently fails for every business owner. Confirmed live with
  a test account: the request errors and the row genuinely never changes.
  Not fixed — needs the user's explicit approval to add an RLS policy.
- **Tech debt**: checked for dead code, duplicated date/status helpers, and
  overly-broad `select("*")` queries. Found nothing safe to change — an
  initial dead-code scan had a scope bug (missed root files like
  `instrumentation.ts`) and produced false positives; the corrected
  whole-repo scan found zero genuinely unused exports. `select("*")`
  tightening was judged too risky to verify safely in a codebase with zero
  test coverage (every instance either feeds the admin dashboard's
  intentionally-full record view, or merges into a shared array state with
  fully-populated sibling rows).
- **Health/monitoring**: `/api/health` checks env var presence (12 tracked
  vars, currently 4 missing — all `BOG_*`, expected) + DB + Storage
  reachability, 503 only on real "error" (not "warning"). Recommended
  (not implemented) pointing a free UptimeRobot-style monitor at it every
  5 minutes. Cron: couldn't directly test `pickup-reminders` with the real
  `CRON_SECRET` (it's a Vercel "Sensitive" var, unreadable after creation),
  but indirect evidence (health check's env-var-missing count dropping by
  exactly 3 after setting those vars) confirms the secret is really present
  in the live deployment; no scheduled invocation has occurred yet since it
  was set (daily at 12:00 UTC) to observe directly.
- **Test data inventory**: compiled full list with exact IDs (2 auth users,
  2 profiles, 1 business id=1, 2 offers id=1/2, 1 order id=1) for the user to
  review before approving any real deletion. Nothing deleted this session.
