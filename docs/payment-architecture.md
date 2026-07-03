# ArGadaagdo Payment Architecture

This document describes the current production payment architecture. Bank of
Georgia is the primary provider, and the old mock reservation RPC remains only
for database compatibility.

## Current Flow

1. Customer opens checkout for an active offer.
2. Customer accepts pickup and cancellation rules.
3. Frontend calls `POST /api/payments/checkout`.
4. The server validates the signed-in, email-confirmed user.
5. The server calls `create_provider_payment_order(p_offer_id, 'bog')`.
6. The RPC creates:
   - a `pending_payment` order
   - a `pending` payment
   - an inventory hold by decreasing offer quantity once
7. The server creates a Bank of Georgia checkout session.
8. Bank of Georgia confirms payment through callback or return verification.
9. The server calls `finalize_provider_payment(...)`.
10. Paid orders become `reserved` and receive a pickup code.

The inventory hold prevents overselling the last available surprise bag. If the
provider session fails, expires, is cancelled, or is refunded, inventory is
restored through RPC logic exactly once.

## Payment States

Supported states:

- `pending`
- `authorized`
- `paid`
- `failed`
- `refunded`
- `cancelled`
- `expired`

## Provider Abstraction

Providers share the same internal shape:

- provider name
- provider payment/session id
- provider status
- amount
- currency
- order id
- offer id
- user id

Provider candidates for future expansion:

- Bank of Georgia
- TBC Bank
- Stripe
- PayPal
- Apple Pay through a supported provider
- Google Pay through a supported provider

## Refund Flow

1. Customer cancels through `cancel_paid_order(p_order_id)`.
2. The refund route first validates ownership, status, and cancellation deadline.
3. For Bank of Georgia payments, the provider refund is requested.
4. Local payment and order state are updated through `cancel_paid_order`.
5. Inventory is restored exactly once through the RPC.

## Payout Preparation

Each paid order already stores:

- `amount`
- `platform_fee`
- `business_amount`

Current split:

- 10% platform fee
- 90% business revenue

Future payout architecture:

1. Include only completed, non-refunded orders.
2. Group by business.
3. Calculate weekly payout total.
4. Track payout status and provider/bank transfer reference.

No payout table exists yet.

## Receipts

Customer receipt should show:

- reservation id
- offer title
- business name
- amount
- pickup window
- payment status
- payment reference when a real provider exists

Business receipt should show:

- reservation id
- customer email
- gross amount
- platform fee
- business amount
- pickup status

## Admin Payment Panel

Admin sections:

- Payments
- Refunds
- Revenue
- Failed payments
- Pending payouts

The current admin dashboard uses order financial fields for operational
visibility. It does not initiate payouts yet.

## Pending Payment Cleanup

If a customer closes the browser or abandons Bank of Georgia checkout, the order
can remain `pending_payment` while inventory is held. The protected cron route
`/api/cron/payment-maintenance` runs `expire_pending_provider_payments(20)` to
release abandoned holds and mark expired local payments safely.
