-- ArGadaagdo security fix:
-- Remove the direct table-update path that allowed business owners to mark
-- orders completed without verifying the customer's pickup code.
--
-- Completion must happen through:
--   public.complete_pickup(p_order_id, p_pickup_code)
--
-- This intentionally does not change SELECT policies. Business owners can
-- still view reservations and pickup codes for their own offers.

drop policy if exists "Business owners can complete reserved orders"
on public.orders;
