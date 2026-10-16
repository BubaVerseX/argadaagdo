// The orders columns the app may read. pickup_code is deliberately absent:
// only the service role can read it, so business staff can't complete a
// pickup without the code the customer shows them. Customers get their own
// codes from get_my_pickup_codes(). Never use select("*") on orders — it fails
// once the column grant is in place
// (supabase/migrations/20261016120200_lock_pickup_codes_and_old_refunds.sql).
export const ORDER_COLUMNS =
  "id, user_id, offer_id, status, payment_method, has_pickup_code, amount, platform_fee, business_amount, created_at, cancelled_at, cancelled_reason, completed_at, no_show_at, rated_at, quantity_restored_at";
