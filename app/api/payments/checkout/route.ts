import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  getPaymentProvider,
  normalizePaymentProvider,
} from "@/lib/payments/provider";
import {
  createUserScopedSupabaseClient,
} from "@/lib/supabaseServer";
import { isEmailConfirmed } from "@/lib/auth";
import { getUserErrorMessage } from "@/lib/errors";

type PendingPaymentOrder = {
  order_id: number;
  payment_id: number;
  external_order_id: string;
  amount: number | string;
  platform_fee: number | string;
  business_amount: number | string;
};

type CheckoutOffer = {
  id: number;
  title: string;
  price: number | string;
  businesses?: {
    name?: string | null;
  } | null;
};

function extractBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function getCheckoutErrorMessage(error: unknown) {
  return getUserErrorMessage(
    error,
    "Secure checkout could not be started. Please try again."
  );
}

export async function POST(request: Request) {
  let pendingPayment: PendingPaymentOrder | null = null;
  let userClient: ReturnType<typeof createUserScopedSupabaseClient> | null =
    null;

  try {
    const accessToken = extractBearerToken(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Please sign in to reserve this offer." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const offerId = Number(body.offerId);
    const providerId = normalizePaymentProvider(body.provider);

    if (!Number.isFinite(offerId) || offerId <= 0) {
      return NextResponse.json(
        { error: "This offer is not available for checkout." },
        { status: 400 }
      );
    }

    const provider = getPaymentProvider(providerId);
    userClient = createUserScopedSupabaseClient(accessToken);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Please sign in to reserve this offer." },
        { status: 401 }
      );
    }

    if (!isEmailConfirmed(user)) {
      return NextResponse.json(
        { error: "Please verify your email before using ArGadaagdo." },
        { status: 403 }
      );
    }

    const { data: offerData, error: offerError } = await userClient
      .from("offers")
      .select("id, title, price, businesses(name)")
      .eq("id", offerId)
      .maybeSingle();

    if (offerError || !offerData) {
      return NextResponse.json(
        { error: "This offer is no longer available." },
        { status: 404 }
      );
    }

    const { data: rpcData, error: rpcError } = await userClient
      .rpc("create_provider_payment_order", {
        p_offer_id: offerId,
        p_provider: providerId,
      })
      .single();

    if (rpcError || !rpcData) {
      return NextResponse.json(
        { error: getCheckoutErrorMessage(rpcError?.message) },
        { status: 400 }
      );
    }

    pendingPayment = rpcData as PendingPaymentOrder;
    const offer = offerData as CheckoutOffer;

    const session = await provider.createPaymentSession({
      paymentId: pendingPayment.payment_id,
      orderId: pendingPayment.order_id,
      offerId: offer.id,
      offerTitle: offer.title,
      businessName: offer.businesses?.name || "ArGadaagdo business",
      amount: Number(pendingPayment.amount),
      currency: "GEL",
      externalOrderId: pendingPayment.external_order_id,
    });

    const { error: attachError } = await userClient.rpc(
      "attach_provider_payment_reference",
      {
        p_payment_id: pendingPayment.payment_id,
        p_provider_reference: session.providerReference,
      }
    );

    if (attachError) {
      logger.warn("Provider payment reference could not be attached", {
        paymentId: pendingPayment.payment_id,
        providerReference: session.providerReference,
        error: attachError.message,
      });
    }

    return NextResponse.json({
      provider: session.provider,
      redirectUrl: session.redirectUrl,
      paymentId: pendingPayment.payment_id,
      orderId: pendingPayment.order_id,
    });
  } catch (error) {
    logger.error("Payment checkout session failed", { error });

    if (pendingPayment && userClient) {
      await userClient.rpc("record_provider_payment_failure", {
        p_payment_id: pendingPayment.payment_id,
        p_reason: "provider_session_failed",
      });
    }

    return NextResponse.json(
      { error: getCheckoutErrorMessage(error) },
      { status: 500 }
    );
  }
}
