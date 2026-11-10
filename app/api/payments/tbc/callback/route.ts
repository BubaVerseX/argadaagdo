import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  isTbcCallbackIp,
  isTbcCallbackSecretValid,
  verifyTbcPayment,
} from "@/lib/payments/tbc";
import { sendReservationConfirmationEmail } from "@/lib/email/events";
import { settleRefundForPayment } from "@/lib/payments/refunds";
import { createServiceRoleSupabaseClient } from "@/lib/supabaseServer";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown, keys: string[]) {
  const record = asRecord(value);

  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate) return candidate;
    if (typeof candidate === "number") return String(candidate);
  }

  return "";
}

function extractProviderReference(payload: unknown) {
  const record = asRecord(payload);
  const body = asRecord(record.body);

  return (
    readString(record, ["PaymentId", "paymentId", "payId"]) ||
    readString(body, ["PaymentId", "paymentId", "payId"])
  );
}

function getFinalizedOrderId(value: unknown) {
  const rows = Array.isArray(value) ? value : [];
  const firstRow = asRecord(rows[0]);
  const orderId = Number(firstRow.order_id);
  const orderStatus = readString(firstRow, ["order_status"]);
  const paymentStatus = readString(firstRow, ["payment_status"]);

  if (
    Number.isFinite(orderId) &&
    orderId > 0 &&
    orderStatus === "reserved" &&
    paymentStatus === "paid"
  ) {
    return orderId;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Vercel sets x-forwarded-for to the caller's real address.
    const callerIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const fromTbc = isTbcCallbackIp(callerIp);
    // Payments created before the registered address still carry ?secret=.
    const secretValid =
      !fromTbc && isTbcCallbackSecretValid(request.nextUrl.searchParams.get("secret"));

    // One line per callback, so we can see in the logs that TBC really calls
    // back (no secret or body is logged; the address only when refused).
    logger.info("TBC callback received", { fromTbc, secretValid });

    if (!fromTbc && !secretValid) {
      logger.warn("TBC callback refused", { callerIp });
      return NextResponse.json({ error: "Unauthorized callback" }, { status: 401 });
    }

    // TBC callbacks are unsigned: only TBC's callback servers (or the old
    // shared secret) get in, and the payment state is always re-read from TBC
    // rather than trusted from the body.
    const rawBody = await request.text();
    let payload: unknown = {};

    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      // The docs only say the body holds PaymentId: accept a form body too.
      const form = Object.fromEntries(new URLSearchParams(rawBody));
      if (!form.PaymentId && !form.paymentId && !form.payId) {
        logger.warn("TBC callback body not understood", { length: rawBody.length });
        return NextResponse.json({ error: "Invalid callback body" }, { status: 400 });
      }
      payload = form;
    }

    const providerReference = extractProviderReference(payload);

    if (!providerReference) {
      return NextResponse.json(
        { error: "Provider reference is missing" },
        { status: 400 }
      );
    }

    const verifiedPayment = await verifyTbcPayment(providerReference);

    const supabase = createServiceRoleSupabaseClient();
    // Remember whether this payment was already confirmed, so a repeated
    // callback (or one that races the browser return) doesn't send the
    // confirmation email again.
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("status")
      .eq("provider", "tbc")
      .eq("provider_reference", verifiedPayment.providerReference)
      .maybeSingle();
    const wasAlreadyPaid =
      (existingPayment as { status?: string } | null)?.status === "paid";

    const { data, error } = await supabase.rpc("finalize_provider_payment", {
      p_provider: "tbc",
      p_provider_reference: verifiedPayment.providerReference,
      p_external_order_id: verifiedPayment.externalOrderId,
      p_provider_status: verifiedPayment.status,
      p_amount: verifiedPayment.amount,
    });

    if (error) {
      logger.error("TBC callback finalize failed", {
        providerReference,
        error: error.message,
      });

      return NextResponse.json({ error: "Payment could not be finalized" }, { status: 500 });
    }

    const orderId = getFinalizedOrderId(data);

    if (orderId && !wasAlreadyPaid) {
      await sendReservationConfirmationEmail(supabase, orderId).catch(
        (emailError) => {
          logger.error("Reservation confirmation email failed", {
            orderId,
            error: emailError,
          });
        }
      );
    }

    const finalizedRow = asRecord(Array.isArray(data) ? data[0] : null);

    if (readString(finalizedRow, ["payment_status"]) === "refund_required") {
      // Money was captured but the order is no longer waiting for payment
      // (e.g. the hold expired first): send it straight back.
      const settlement = await settleRefundForPayment(
        supabase,
        Number(finalizedRow.payment_id)
      );
      logger.warn("Late payment refunded automatically", {
        providerReference: verifiedPayment.providerReference,
        settlement,
      });
    }

    return NextResponse.json({ received: true, result: data });
  } catch (error) {
    logger.error("TBC callback failed", { error });
    return NextResponse.json({ error: "Payment callback failed" }, { status: 500 });
  }
}
