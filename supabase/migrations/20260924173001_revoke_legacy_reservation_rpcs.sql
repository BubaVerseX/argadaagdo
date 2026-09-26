-- Close off pre-payment/mock reservation RPCs that are dead code from the
-- app's perspective (no current app code, function, trigger, or view
-- references them — verified before this migration) but were still
-- EXECUTE-granted to `authenticated`, meaning any signed-up customer could
-- call them directly via /rest/v1/rpc/<name> to reserve a real offer for
-- free (reserve_offer, mock_pay_and_reserve_offer) or bypass the
-- cancellation-deadline/idempotency checks that cancel_paid_order enforces
-- (cancel_order). Revoking rather than dropping: reversible with a single
-- GRANT if ever needed again, and Supabase's own security advisor lists
-- revoke as the standard remediation for this exact finding.

revoke execute on function public.reserve_offer(bigint) from authenticated;
revoke execute on function public.mock_pay_and_reserve_offer(bigint) from authenticated;
revoke execute on function public.cancel_order(bigint) from authenticated;
