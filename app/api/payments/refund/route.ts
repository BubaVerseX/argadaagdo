import { NextResponse } from "next/server";
import { isEmailConfirmed } from "@/lib/auth";
import { sendReservationCancellationEmail } from "@/lib/email/events";
import { getUserErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getPaymentProvider } from "@/lib/payments/provider";
import {
  createServiceRoleSupabaseClient,
  createUserScopedSupabaseClient,
} from "@/lib/supabaseServer";

type RefundPayment = {
  payment_id: number;
  provider: string;
  provider_reference: string | null;
  amount: number | string;
};

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

    const { data: refundData, error: refundLookupError } = await userClient
      .rpc("get_customer_refund_payment", {
        p_order_id: orderId,
      })
      .maybeSingle();

    if (refundLookupError) {
      return NextResponse.json(
        { error: getRefundErrorMessage(refundLookupError.message) },
        { status: 400 }
      );
    }

    const refundPayment = refundData as RefundPayment | null;

    if (
      refundPayment?.provider === "bog" &&
      refundPayment.provider_reference
    ) {
      const provider = getPaymentProvider("bog");
      const refundResult = await provider.refundPayment({
        providerReference: refundPayment.provider_reference,
        amount: Number(refundPayment.amount),
        currency: "GEL",
      });

      if (
        refundResult.status !== "refunded" &&
        refundResult.status !== "cancelled"
      ) {
        return NextResponse.json(
          { error: "Bank refund could not be confirmed. Please try again." },
          { status: 502 }
        );
      }
    }

    const { error: cancelError } = await userClient.rpc("cancel_paid_order", {
      p_order_id: orderId,
    });

    if (cancelError) {
      return NextResponse.json(
        { error: getRefundErrorMessage(cancelError.message) },
        { status: 400 }
      );
    }

    await sendReservationCancellationEmail(
      createServiceRoleSupabaseClient(),
      orderId
    );

    return NextResponse.json({ cancelled: true });
  } catch (error) {
    logger.error("Payment refund route failed", { error });
    return NextResponse.json(
      { error: getRefundErrorMessage(error) },
      { status: 500 }
    );
  }
}
