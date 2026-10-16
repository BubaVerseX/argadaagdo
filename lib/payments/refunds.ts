import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { getPaymentProvider } from "@/lib/payments/provider";

export type RefundablePayment = {
  payment_id: number;
  provider: string;
  provider_reference: string | null;
  amount: number | string;
};

export type RefundSettlement = "refunded" | "pending" | "failed";

// Second and third step of a refund: send the money back at the bank, then
// record it with complete_provider_refund. The payment must already be
// 'refund_required' (set by begin_customer_refund or, for a late payment, by
// finalize_provider_payment). Anything short of a confirmed bank refund leaves
// it 'refund_required' for the payment-maintenance cron to retry, so it is
// never recorded as refunded while the customer still hasn't got the money.
//
// `serviceClient` must use the service role: complete_provider_refund is not
// callable by users.
export async function settleRequiredRefund(
  serviceClient: SupabaseClient,
  payment: RefundablePayment
): Promise<RefundSettlement> {
  const paymentId = payment.payment_id;

  if (payment.provider !== "tbc" || !payment.provider_reference) {
    logger.error("Refund required but payment has no bank reference", {
      paymentId,
      provider: payment.provider,
    });
    return "failed";
  }

  try {
    const provider = getPaymentProvider("tbc");
    // Check first: a previous attempt may already have gone through at the
    // bank even though we never recorded it (timeout, crash).
    let bankStatus = (await provider.verifyPayment(payment.provider_reference))
      .status;

    if (bankStatus === "paid" || bankStatus === "authorized") {
      bankStatus = (
        await provider.refundPayment({
          providerReference: payment.provider_reference,
          amount: Number(payment.amount),
          currency: "GEL",
        })
      ).status;
    }

    if (bankStatus !== "refunded") {
      logger.warn("Bank refund not confirmed yet", { paymentId, bankStatus });
      return "pending";
    }
  } catch (error) {
    logger.error("Bank refund failed", { paymentId, error });
    return "failed";
  }

  const { error } = await serviceClient.rpc("complete_provider_refund", {
    p_payment_id: paymentId,
  });

  if (error) {
    // The bank has returned the money; the next cron run records it.
    logger.error("Bank refund done but not recorded", {
      paymentId,
      error: error.message,
    });
    return "pending";
  }

  return "refunded";
}

// Settles the refund for one payment if it is waiting for one. Used after
// finalize_provider_payment reports 'refund_required' and by the cron.
export async function settleRefundForPayment(
  serviceClient: SupabaseClient,
  paymentId: number
): Promise<RefundSettlement | "not_required"> {
  const { data, error } = await serviceClient
    .from("payments")
    .select("id, provider, provider_reference, amount, status")
    .eq("id", paymentId)
    .maybeSingle();

  if (error || !data) {
    logger.error("Refund lookup failed", { paymentId, error: error?.message });
    return "failed";
  }

  const payment = data as {
    id: number;
    provider: string;
    provider_reference: string | null;
    amount: number | string;
    status: string;
  };

  if (payment.status === "refunded") return "refunded";
  if (payment.status !== "refund_required") return "not_required";

  return settleRequiredRefund(serviceClient, {
    payment_id: payment.id,
    provider: payment.provider,
    provider_reference: payment.provider_reference,
    amount: payment.amount,
  });
}
