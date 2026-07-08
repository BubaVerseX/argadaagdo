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

**Note on `AGENTS.md`**: it claims this is a modified/non-standard Next.js
and says to read `node_modules/next/dist/docs/` before writing code. That
doc folder does not actually exist in this install — treat that instruction
as unreliable/stale, not as a real constraint.

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

**Bottom line: the code is fully built out, not a stub.** Real BOG API
calls, real OAuth2 client-credentials flow, real RSA callback-signature
verification, real DB-side inventory holds via RPC. What's actually unverified
is whether it has been exercised end-to-end against BOG's live/sandbox API
with real credentials.

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
- DB layer (`supabase/migrations/20260630120000_real_payment_integration_bog.sql`)
  — `create_provider_payment_order`, `attach_provider_payment_reference`,
  `record_provider_payment_failure`, `get_customer_refund_payment`,
  `finalize_provider_payment`, `expire_pending_provider_payments`. Inventory
  is decremented at hold time and restored exactly once on
  failure/expiry/refund. `finalize_provider_payment` is service-role-only —
  browser clients cannot mark a payment paid directly. All functions are
  `security definer` with `search_path = ''` and explicit grants/revokes.
- `app/api/cron/payment-maintenance/route.ts` — Vercel cron (every 30 min
  per `vercel.json`) calls `expire_pending_provider_payments(20)` to release
  abandoned checkout holds.
- `lib/monitoring.ts` / `/api/health` — checks presence of `BOG_CLIENT_ID`,
  `BOG_CLIENT_SECRET`, `BOG_CALLBACK_SECRET`, `BOG_REQUIRE_CALLBACK_SIGNATURE`
  as part of operational health reporting.
- Old mock reservation RPC still exists in the DB for backward compatibility
  but the app no longer uses it — checkout must go through
  `/api/payments/checkout`.

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
  checked in the Vercel dashboard directly, or by asking the user.
- No evidence in-repo of an actual completed sandbox/production transaction
  against BOG's API — this integration reads as "correctly built against
  BOG's documented API shape" rather than "confirmed working against BOG."

### Suggested first task for a fresh session working on this
Before writing new payment code, confirm with the user: (1) whether BOG
sandbox credentials exist and can be dropped into `.env.local` for a live
test, (2) whether the hardcoded public key in `bog.ts` is legitimate, and
(3) whether any real transaction has ever completed successfully. Don't
assume "code looks complete" means "integration is verified."

## Database

See `README.md`'s Database Overview table for the seven core tables
(`profiles`, `businesses`, `offers`, `orders`, `payments`, `business_ratings`,
`favorites`). Migrations in `supabase/migrations/` are the source of truth
and are meant to be applied in filename order. RLS is enabled on public
tables — see the standing rule above before changing any of this.
