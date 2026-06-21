# ArGadaagdo

ArGadaagdo is a pickup-only food-rescue marketplace for Tbilisi, Georgia. Local
businesses publish discounted leftover food boxes, customers reserve them
online, and pickup codes make in-store collection simple.

The project is a working MVP inspired by Too Good To Go, built to demonstrate a
real marketplace workflow: customer discovery, business operations, admin
approval, inventory-aware reservations, and realtime updates.

## Live Demo

The application is deployed on Vercel:

[`https://argadaagdo.vercel.app`](https://argadaagdo.vercel.app)

## Core Features

- Customer registration and Supabase authentication
- Business registration with an admin approval workflow
- Live offer marketplace with search and sold-out hiding
- Discounted offer images stored in Supabase Storage
- Pilot reservation flow using the `mock_pay_and_reserve_offer(p_offer_id)` RPC
- Safe cancellation/refund flow using the `cancel_paid_order(p_order_id)` RPC
- Pickup-code display for customers and verification for businesses
- Customer order history and cancellation flow
- Business dashboard for offer and reservation management
- Admin dashboard with marketplace and approval analytics
- Realtime offer and order refreshes powered by Supabase
- Responsive interface designed for mobile pickup use

## Screenshots

Add final pilot screenshots after the production UI is confirmed:

| Home / Offers | Customer Orders | Business Dashboard |
| --- | --- | --- |
| Add homepage screenshot | Add orders screenshot | Add dashboard screenshot |

## Tech Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- Supabase Auth, PostgreSQL, Storage, Realtime and RPC functions
- Vercel hosting

## Marketplace Flow

1. A customer creates an account and browses active offers.
2. A business registers and waits for admin approval.
3. An approved business creates a pickup-only rescue offer.
4. A customer confirms a pilot reservation through the database RPC function.
5. The RPC creates an order and pickup code while decreasing quantity
   atomically.
6. The customer shows their pickup code and the business completes the order.

## Database Overview

The main application tables are:

| Table | Purpose |
| --- | --- |
| `profiles` | User email and application role |
| `businesses` | Business ownership, details and approval status |
| `offers` | Available food boxes, prices, pickup windows and images |
| `orders` | Reservations, order lifecycle status and pickup code |
| `payments` | Pilot payment records, platform fee and business amount |
| `business_ratings` | Customer ratings after completed pickups |
| `favorites` | Saved offers for customers |

Reservation inventory changes must go through
`supabase.rpc("mock_pay_and_reserve_offer", { p_offer_id })`. Customers should
never update offer quantities directly when reserving.

Reservation cancellation must go through
`supabase.rpc("cancel_paid_order", { p_order_id })` so order status, refund
state and restored offer quantity stay consistent.

## Local Setup

1. Clone the repository and install dependencies.

```bash
npm install
```

2. Create local environment configuration from the example file.

```bash
cp .env.example .env.local
```

3. Set your Supabase project URL and public anon/publishable key in
   `.env.local`.

4. Start the development server.

```bash
npm run dev
```

5. Verify a production build before deployment.

```bash
npm run build
```

## Production Notes

- Row Level Security must remain enabled on all exposed Supabase tables.
- Storage upload policies should permit only appropriate business image
  uploads and should restrict file types and sizes.
- Authorization decisions must be enforced in database policies or protected
  server/database functions, not only in browser UI.
- Database migrations and policy definitions should be versioned with the
  repository before expanding beyond MVP traffic.

## Future Improvements

- Continue expanding Georgian and English translations
- Notifications for reserved and expiring pickup orders
- Business analytics and food-saved reporting
- Deeper map/location support for Tbilisi discovery
- Real bank/card payment provider integration after the pilot reservation flow
  is proven

## Product Goal

ArGadaagdo helps Tbilisi businesses turn unsold food into affordable meals
instead of waste, while providing customers with a fast and trustworthy pickup
experience.
