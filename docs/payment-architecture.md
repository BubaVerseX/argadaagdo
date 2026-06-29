# ArGadaagdo Payment Preparation

This document prepares the marketplace for real online payments without changing the current reservation flow.

## Current Flow

1. Customer opens checkout for an active offer.
2. Customer accepts pickup and cancellation rules.
3. Frontend calls `mock_pay_and_reserve_offer(p_offer_id)`.
4. The RPC creates:
   - `orders` row
   - `payments` row
   - pickup code
   - inventory decrease
5. If quantity reaches zero, the offer becomes sold out.

Current payment rows use:

- `status = paid`
- `provider = mock`
- `provider_reference = mock_*`

## Future Flow

1. Customer opens checkout.
2. ArGadaagdo creates a pending payment session with a provider.
3. Customer completes payment with the provider.
4. Provider confirms success through a secure callback or webhook.
5. ArGadaagdo creates or confirms the reservation only after provider success.
6. Customer receives pickup code.

Reservation inventory should never be reduced before payment success in the real provider flow.

## Payment States

Prepared future states:

- `pending`
- `authorized`
- `paid`
- `failed`
- `refunded`
- `cancelled`
- `expired`

Current database constraint supports:

- `paid`
- `refunded`
- `failed`
- `cancelled`

A future migration should add `pending`, `authorized`, and `expired` before real provider sessions are stored.

## Provider Abstraction

Future providers can share the same internal shape:

- provider name
- provider payment/session id
- provider status
- amount
- currency
- order id
- offer id
- user id

Provider candidates:

- Bank of Georgia
- TBC Bank
- Stripe
- PayPal
- Apple Pay through a supported provider
- Google Pay through a supported provider

## Refund Flow

Current cancellation:

1. Customer cancels through `cancel_paid_order(p_order_id)`.
2. RPC validates customer ownership, status, and deadline.
3. Order becomes refunded.
4. Payment becomes refunded.
5. Inventory is restored exactly once.

Future real refund:

1. Validate cancellation eligibility.
2. Request provider refund.
3. Store provider refund reference.
4. Mark local payment as refunded.
5. Restore inventory exactly once.

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

## Receipt Preparation

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

Prepared admin sections:

- Payments
- Refunds
- Revenue
- Failed payments
- Pending payouts

The current admin dashboard uses order financial fields for preparation only. It does not process real money.
