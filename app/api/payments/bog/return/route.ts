import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { absoluteSiteUrl } from "@/lib/site";
import { sendReservationConfirmationEmail } from "@/lib/email/events";
import { verifyBogPayment } from "@/lib/payments/bog";
import { createServiceRoleSupabaseClient } from "@/lib/supabaseServer";

type PaymentLookup = {
  id: number;
  provider_reference: string | null;
};

type FinalizedPaymentRow = {
  order_id?: number | string | null;
  order_status?: string | null;
  payment_status?: string | null;
};

function redirectToOrders(status: "success" | "pending" | "failed") {
  return NextResponse.redirect(absoluteSiteUrl(`/orders?payment=${status}`));
}

function getFinalizedOrderId(value: unknown) {
  const rows = Array.isArray(value) ? (value as FinalizedPaymentRow[]) : [];
  const firstRow = rows[0];
  const orderId = Number(firstRow?.order_id);

  if (
    Number.isFinite(orderId) &&
    orderId > 0 &&
    firstRow?.order_status === "reserved" &&
    firstRow?.payment_status === "paid"
  ) {
    return orderId;
  }

  return null;
}

export async function GET(request: NextRequest) {
  const paymentId = Number(request.nextUrl.searchParams.get("payment_id"));

  if (!Number.isFinite(paymentId) || paymentId <= 0) {
    return redirectToOrders("failed");
  }

  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id, provider_reference")
      .eq("id", paymentId)
      .maybeSingle();

    if (paymentError || !payment) {
      return redirectToOrders("failed");
    }

    const paymentRecord = payment as PaymentLookup;

    if (!paymentRecord.provider_reference) {
      return redirectToOrders("pending");
    }

    const verifiedPayment = await verifyBogPayment(
      paymentRecord.provider_reference
    );

    const { data: finalizeData, error: finalizeError } = await supabase.rpc(
      "finalize_provider_payment",
      {
        p_provider: "bog",
        p_provider_reference: verifiedPayment.providerReference,
        p_external_order_id: verifiedPayment.externalOrderId,
        p_provider_status: verifiedPayment.status,
        p_amount: verifiedPayment.amount,
      }
    );

    if (finalizeError) {
      logger.error("Bank of Georgia return finalize failed", {
        paymentId,
        error: finalizeError.message,
      });
      return redirectToOrders("pending");
    }

    const orderId = getFinalizedOrderId(finalizeData);

    if (orderId) {
      await sendReservationConfirmationEmail(supabase, orderId);
    }

    return redirectToOrders(
      verifiedPayment.status === "paid" || verifiedPayment.status === "authorized"
        ? "success"
        : "failed"
    );
  } catch (error) {
    logger.error("Bank of Georgia return handling failed", { paymentId, error });
    return redirectToOrders("pending");
  }
}
