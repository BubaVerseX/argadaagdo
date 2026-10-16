-- Payment safety for TBC, part 2 of 2 (2026-10-16): remove the old access.
--
-- Apply only AFTER the app code that uses begin_customer_refund,
-- get_my_pickup_codes and explicit order column lists is deployed; the older
-- app code reads orders with select("*") and calls cancel_paid_order, and
-- both stop working once this runs.
--
--  b. cancel_paid_order and get_customer_refund_payment are no longer
--     callable by users: the old one-step path marked an order refunded in
--     the database without the bank ever returning the money.
--  c. Businesses (and every other non-service role) can no longer read
--     orders.pickup_code, so staff can only complete a pickup with the code
--     the customer shows. Customers read their own codes through
--     get_my_pickup_codes(). New orders columns must be added to the grant
--     below to be readable by the app.

begin;

revoke all on function public.cancel_paid_order(bigint) from public, anon, authenticated;
revoke all on function public.get_customer_refund_payment(bigint) from public, anon, authenticated;

revoke select on public.orders from anon, authenticated;
grant select (
  id,
  user_id,
  offer_id,
  status,
  payment_method,
  has_pickup_code,
  amount,
  platform_fee,
  business_amount,
  created_at,
  cancelled_at,
  cancelled_reason,
  completed_at,
  no_show_at,
  rated_at,
  quantity_restored_at,
  customer_deleted_at
) on public.orders to authenticated;

commit;
