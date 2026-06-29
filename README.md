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
- Pilot reservation flow through Supabase RPC functions
- Pickup codes for customers and manual code verification for businesses
- Customer orders, cancellation, completed pickup history, and ratings
- Admin dashboard for approvals and marketplace health
- Supabase Storage image uploads with safe fallbacks
- Mobile-friendly public pages, FAQ, support, contact, privacy, and terms pages
- Basic PWA manifest, metadata, robots, and sitemap support

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
- Vercel

## Marketplace Flow

1. A business creates an account and submits a business registration.
2. An admin reviews and approves the business.
3. The business creates a pickup-only surprise bag offer.
4. A customer browses active offers and confirms a reservation.
5. The reservation RPC creates the order, payment record, pickup code, and
   decreases offer quantity atomically.
6. The customer shows the pickup code during the pickup window.
7. The business verifies the code and completes the pickup.
8. The customer can rate the completed order.

## Database Overview

| Table | Purpose |
| --- | --- |
| `profiles` | User email, role, and reliability fields |
| `businesses` | Business ownership, details, approval state, and profile data |
| `offers` | Surprise bags, prices, pickup windows, images, status, and quantity |
| `orders` | Reservation lifecycle, pickup codes, cancellation, and rating state |
| `payments` | Pilot payment records, fees, business amount, and refund state |
| `business_ratings` | Customer ratings for completed pickups |
| `favorites` | Saved offers for customers |

Reservation inventory changes must go through:

```ts
supabase.rpc("mock_pay_and_reserve_offer", { p_offer_id: offerId })
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

Optional:

```bash
NEXT_PUBLIC_APP_VERSION=local
NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA=provided-by-vercel
```

Only public browser-safe Supabase values should use the `NEXT_PUBLIC_` prefix.
Do not commit `.env.local`.

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
- Auth redirect URLs should include the production URL and local development
  URL, for example:
  - `https://argadaagdo-silk.vercel.app`
  - `https://argadaagdo-silk.vercel.app/login`
  - `http://localhost:3000`
  - `http://localhost:3000/login`

## Vercel Deployment Notes

- Set all required environment variables in Vercel.
- Use `NEXT_PUBLIC_SITE_URL=https://argadaagdo-silk.vercel.app` for canonical
  metadata, sitemap, and robots URLs.
- The production branch should deploy from the GitHub repository that is treated
  as the source of truth.
- Run `npm run build` locally before promoting production changes.

## Screenshots

Add final pilot screenshots after the production UI is confirmed:

| Home / Offers | Customer Orders | Business Dashboard |
| --- | --- | --- |
| Add homepage screenshot | Add orders screenshot | Add dashboard screenshot |

## Future Roadmap

- Real card/bank payment integration for Georgia
- Transactional email notifications
- Stronger marketplace analytics and payouts
- Location-aware discovery for Tbilisi neighborhoods
- More complete Georgian and English localization
- Admin moderation workflows for larger pilot operations

## Product Goal

ArGadaagdo helps Tbilisi businesses turn unsold food into affordable meals
instead of waste, while giving customers a simple and trustworthy pickup
experience.
