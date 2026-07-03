# ArGadaagdo

ArGadaagdo is a pickup-only food-rescue marketplace for Tbilisi, Georgia.
Local food businesses publish discounted surprise bags, customers reserve them
online, and pickup codes make in-store collection clear and simple.

The project is a production-demo MVP inspired by Too Good To Go. It includes
customer discovery, business onboarding, admin approval, inventory-aware
reservations, pickup verification, ratings, favorites, and pilot-ready trust
pages.

## Live Demo

Production beta URL:

[https://argadaagdo-silk.vercel.app](https://argadaagdo-silk.vercel.app)

## Core Features

- Customer signup, login, persistent sessions, and protected routes
- Business registration with admin approval
- Business dashboard for offers, reservations, pickup verification, and reviews
- Public marketplace with categories, sorting, favorites, and offer detail pages
- Bank of Georgia checkout session preparation through server route handlers
- Payment-first reservation flow through Supabase RPC functions
- Pickup codes for customers and manual code verification for businesses
- Customer orders, cancellation, completed pickup history, and ratings
- Admin dashboard for approvals and marketplace health
- Supabase Storage image uploads with safe fallbacks
- Mobile-friendly public pages, FAQ, support, contact, privacy, and terms pages
- Basic PWA manifest, metadata, robots, and sitemap support
- Production health endpoint and operations runbook

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth
- Supabase PostgreSQL with RLS
- Supabase Storage
- Supabase Realtime
- Supabase RPC functions
- Resend transactional email
- Vercel

## Marketplace Flow

1. A business creates an account and submits a business registration.
2. An admin reviews and approves the business.
3. The business creates a pickup-only surprise bag offer.
4. A customer browses active offers and confirms a reservation.
5. The payment RPC creates a pending order and payment hold while decreasing
   offer quantity atomically.
6. Bank of Georgia confirms payment through a verified server callback.
7. The order becomes reserved and the pickup code is created.
8. The customer shows the pickup code during the pickup window.
9. The business verifies the code and completes the pickup.
10. The customer can rate the completed order.

## Database Overview

| Table | Purpose |
| --- | --- |
| `profiles` | User email, role, and reliability fields |
| `businesses` | Business ownership, details, approval state, and profile data |
| `offers` | Surprise bags, prices, pickup windows, images, status, and quantity |
| `orders` | Pending payment, reservation lifecycle, pickup codes, cancellation, and rating state |
| `payments` | Provider payment state, fees, business amount, references, and refund state |
| `business_ratings` | Customer ratings for completed pickups |
| `favorites` | Saved offers for customers |

Payment-first inventory holds must go through:

```ts
supabase.rpc("create_provider_payment_order", {
  p_offer_id: offerId,
  p_provider: "bog",
})
```

Payment callbacks must be finalized server-side through:

```ts
supabase.rpc("finalize_provider_payment", {
  p_provider: "bog",
  p_provider_reference: providerReference,
  p_external_order_id: externalOrderId,
  p_provider_status: providerStatus,
  p_amount: amount,
})
```

The old mock reservation RPC remains in the database for compatibility, but the
customer checkout should use the provider session route:

```ts
POST /api/payments/checkout
```

Customer cancellation must go through:

```ts
supabase.rpc("cancel_paid_order", { p_order_id: orderId })
```

Pickup completion must go through:

```ts
supabase.rpc("complete_pickup", {
  p_order_id: orderId,
  p_pickup_code: pickupCode,
})
```

Customers should never directly update offer quantity or order status from the
frontend.

## Project Structure

```text
app/                 Next.js routes, layouts, metadata, robots and sitemap
components/          Shared UI and marketplace components
components/business/ Business dashboard components
lib/                 Supabase client, helpers, validation, logging and domain logic
public/              Public app assets and PWA icons
supabase/migrations/ Versioned database migrations
types/               Shared TypeScript domain types
```

## Environment Variables

Create `.env.local` from `.env.example`.

```bash
cp .env.example .env.local
```

Required:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
NEXT_PUBLIC_SITE_URL=https://argadaagdo-silk.vercel.app
```

Server-only payment variables:

```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
BOG_CLIENT_ID=your-bank-of-georgia-client-id
BOG_CLIENT_SECRET=your-bank-of-georgia-client-secret
BOG_AUTH_URL=https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token
BOG_API_BASE_URL=https://api.bog.ge
BOG_CALLBACK_SECRET=use-a-long-random-callback-secret
BOG_CALLBACK_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
BOG_REQUIRE_CALLBACK_SIGNATURE=true
BOG_REFUND_PATH_TEMPLATE=/payments/v1/payment/refund/{order_id}
```

Server-only email variables:

```bash
RESEND_API_KEY=re_your_resend_api_key
TRANSACTIONAL_EMAIL_FROM="ArGadaagdo <support@argadaagdo.ge>"
TRANSACTIONAL_EMAIL_REPLY_TO=support@argadaagdo.ge
TRANSACTIONAL_EMAILS_ENABLED=true
CRON_SECRET=use-a-long-random-cron-secret
```

Optional public build variables:

```bash
NEXT_PUBLIC_APP_VERSION=local
NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA=provided-by-vercel
```

Only public browser-safe values should use the `NEXT_PUBLIC_` prefix. Never
expose `SUPABASE_SERVICE_ROLE_KEY`, `BOG_CLIENT_SECRET`,
`BOG_CALLBACK_SECRET`, `BOG_CALLBACK_PUBLIC_KEY`, `RESEND_API_KEY`, or
`CRON_SECRET` to the browser. Do not commit `.env.local`.

## Local Development

Install dependencies:

```bash
npm install
```

Start the local app:

```bash
npm run dev
```

Run checks before shipping:

```bash
npm run lint
npm run build
```

## Supabase Setup Notes

- Keep Row Level Security enabled on public tables.
- Apply migrations in order before testing a fresh Supabase project.
- Keep sensitive actions inside RPC functions or RLS-protected policies.
- The `offer-images` storage bucket must exist and allow approved businesses to
  upload offer images according to the project storage policies.
- Email confirmation should be enabled for production.
- Configure Supabase Auth email delivery with the same Resend SMTP sender used
  by the app. Supabase Auth should send account verification, resend
  verification, and password reset emails.
- Auth redirect URLs should include the production URL and local development
  URL, for example:
  - `https://argadaagdo-silk.vercel.app`
  - `https://argadaagdo-silk.vercel.app/login`
  - `http://localhost:3000`
  - `http://localhost:3000/login`

## Transactional Email System

ArGadaagdo uses Resend for marketplace emails sent from Next.js route handlers.
The app sends:

- Reservation confirmation after verified payment finalizes an order
- Reservation cancellation after `cancel_paid_order` succeeds
- Business approval after an admin approves a business
- Pickup completed after `complete_pickup` succeeds
- Rating reminder after pickup completion
- Pickup reminder through `/api/cron/pickup-reminders`
- Pending payment cleanup through `/api/cron/payment-maintenance`

Supabase Auth remains responsible for account verification and password reset
emails. Configure Supabase Authentication SMTP with the verified Resend sender
domain so those auth emails are delivered through the same production provider.

The email sender uses deterministic Resend idempotency keys and retries
transient provider failures. Email delivery failures are logged but do not roll
back successful reservations, cancellations, approvals, or pickups.

## Vercel Deployment Notes

- Set all required environment variables in Vercel.
- Use `NEXT_PUBLIC_SITE_URL=https://argadaagdo-silk.vercel.app` for canonical
  metadata, sitemap, and robots URLs.
- Configure the Bank of Georgia merchant callback URL as:
  `https://argadaagdo-silk.vercel.app/api/payments/bog/callback?secret=<BOG_CALLBACK_SECRET>`
- Configure successful and failed payment redirects to use the generated
  checkout session URLs returned by ArGadaagdo.
- Set `RESEND_API_KEY`, `TRANSACTIONAL_EMAIL_FROM`,
  `TRANSACTIONAL_EMAIL_REPLY_TO`, and `CRON_SECRET` in Vercel.
- Set `HEALTH_CHECK_SECRET` in Vercel for detailed authenticated health checks.
- The Vercel crons in `vercel.json` call `/api/cron/pickup-reminders` once per
  day and `/api/cron/payment-maintenance` every 30 minutes. Vercel sends
  `Authorization: Bearer $CRON_SECRET`; keep that secret set in production.
- Use `/api/health` for public uptime checks. Use
  `Authorization: Bearer $HEALTH_CHECK_SECRET` for detailed operational checks.
- The production branch should deploy from the GitHub repository that is treated
  as the source of truth.
- Run `npm run build` locally before promoting production changes.

## Operations Runbook

Production recovery, backup expectations, deployment checks and pilot readiness
steps live in:

[docs/production-reliability.md](docs/production-reliability.md)

## Screenshots

Add final pilot screenshots after the production UI is confirmed:

| Home / Offers | Customer Orders | Business Dashboard |
| --- | --- | --- |
| Add homepage screenshot | Add orders screenshot | Add dashboard screenshot |

## Future Roadmap

- Provider refund automation and payout reporting
- Delivery webhooks for email bounce/complaint tracking
- Stronger marketplace analytics and payouts
- Location-aware discovery for Tbilisi neighborhoods
- More complete Georgian and English localization
- Admin moderation workflows for larger pilot operations

## Product Goal

ArGadaagdo helps Tbilisi businesses turn unsold food into affordable meals
instead of waste, while giving customers a simple and trustworthy pickup
experience.
