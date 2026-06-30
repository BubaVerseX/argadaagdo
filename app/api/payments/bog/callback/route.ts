import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  isBogCallbackSecretValid,
  verifyBogCallbackSignature,
  verifyBogPayment,
} from "@/lib/payments/bog";
import { sendReservationConfirmationEmail } from "@/lib/email/events";
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
    readString(record, ["order_id", "id", "payment_id"]) ||
    readString(body, ["order_id", "id", "payment_id"])
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
    const secret = request.nextUrl.searchParams.get("secret");

    if (!isBogCallbackSecretValid(secret)) {
      return NextResponse.json({ error: "Unauthorized callback" }, { status: 401 });
    }

    const rawBody = await request.text();
    const callbackSignature = request.headers.get("Callback-Signature");

    if (!verifyBogCallbackSignature(rawBody, callbackSignature)) {
      return NextResponse.json(
        { error: "Invalid callback signature" },
        { status: 401 }
      );
    }

    const payload = rawBody ? JSON.parse(rawBody) : {};
    const providerReference = extractProviderReference(payload);

    if (!providerReference) {
      return NextResponse.json(
        { error: "Provider reference is missing" },
        { status: 400 }
      );
    }

    const verifiedPayment = await verifyBogPayment(providerReference);

    const supabase = createServiceRoleSupabaseClient();
    const { data, error } = await supabase.rpc("finalize_provider_payment", {
      p_provider: "bog",
      p_provider_reference: verifiedPayment.providerReference,
      p_external_order_id: verifiedPayment.externalOrderId,
      p_provider_status: verifiedPayment.status,
      p_amount: verifiedPayment.amount,
    });

    if (error) {
      logger.error("Bank of Georgia callback finalize failed", {
        providerReference,
        error: error.message,
      });

      return NextResponse.json({ error: "Payment could not be finalized" }, { status: 500 });
    }

    const orderId = getFinalizedOrderId(data);

    if (orderId) {
      await sendReservationConfirmationEmail(supabase, orderId);
    }

    return NextResponse.json({ received: true, result: data });
  } catch (error) {
    logger.error("Bank of Georgia callback failed", { error });
    return NextResponse.json({ error: "Payment callback failed" }, { status: 500 });
  }
}
