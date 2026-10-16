import { NextResponse } from "next/server";
import { isEmailConfirmed } from "@/lib/auth";
import { sendReservationCancellationEmail } from "@/lib/email/events";
import { getUserErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  settleRequiredRefund,
  type RefundablePayment,
} from "@/lib/payments/refunds";
import {
  createServiceRoleSupabaseClient,
  createUserScopedSupabaseClient,
} from "@/lib/supabaseServer";

const REFUND_PROCESSING_MESSAGE =
  "Your reservation is cancelled. The bank is still processing your refund; it will reach your account automatically.";

function extractBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function getRefundErrorMessage(error: unknown) {
  return getUserErrorMessage(
    error,
    "Reservation could not be cancelled. Please try again."
  );
}

export async function POST(request: Request) {
  try {
    const accessToken = extractBearerToken(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Please sign in to cancel this order." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const orderId = Number(body.orderId);

    if (!Number.isFinite(orderId) || orderId <= 0) {
      return NextResponse.json(
        { error: "This order is not available for cancellation." },
        { status: 400 }
      );
    }

    const userClient = createUserScopedSupabaseClient(accessToken);
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Please sign in to cancel this order." },
        { status: 401 }
      );
    }

    if (!isEmailConfirmed(user)) {
      return NextResponse.json(
        { error: "Please verify your email before using ArGadaagdo." },
        { status: 403 }
      );
    }

    // Phase 1: lock the order (refund_pending) and put the box back on sale.
    // A retry for an order that is already locked returns the same refund.
    const { data: refundData, error: beginError } = await userClient
      .rpc("begin_customer_refund", {
        p_order_id: orderId,
      })
      .maybeSingle();

    if (beginError) {
      return NextResponse.json(
        { error: getRefundErrorMessage(beginError.message) },
        { status: 400 }
      );
    }

    const refundPayment = refundData as RefundablePayment | null;
    const serviceClient = createServiceRoleSupabaseClient();

    // Phases 2 and 3: refund at the bank, then record it. If the bank can't
    // confirm it now, the order stays locked and the payment-maintenance
    // cron finishes the refund; the customer's reservation is cancelled
    // either way.
    const settlement = refundPayment
      ? await settleRequiredRefund(serviceClient, refundPayment)
      : "refunded";

    // The cancellation is already committed — an email problem must not be
    // reported to the customer as a failed cancellation.
    try {
      await sendReservationCancellationEmail(serviceClient, orderId);
    } catch (emailError) {
      logger.error("Reservation cancellation email failed", {
        orderId,
        error: emailError,
      });
    }

    if (settlement !== "refunded") {
      return NextResponse.json({
        cancelled: true,
        refundPending: true,
        message: REFUND_PROCESSING_MESSAGE,
      });
    }

    return NextResponse.json({ cancelled: true });
  } catch (error) {
    logger.error("Payment refund route failed", { error });
    return NextResponse.json(
      { error: getRefundErrorMessage(error) },
      { status: 500 }
    );
  }
}
