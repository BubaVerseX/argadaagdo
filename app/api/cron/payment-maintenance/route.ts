import { NextResponse } from "next/server";
import { isBearerSecretAuthorized } from "@/lib/requestAuth";
import { logger } from "@/lib/logger";
import { createServiceRoleSupabaseClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function isCronAuthorized(request: Request) {
  return isBearerSecretAuthorized(request, process.env.CRON_SECRET);
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleSupabaseClient();
    const { data: expiredPayments, error: paymentError } = await supabase.rpc(
      "expire_pending_provider_payments",
      {
        // Must stay longer than the BOG checkout session TTL (20 min, see
        // lib/payments/bog.ts) plus a margin: expiring a hold while the bank
        // page is still payable lets a customer pay for a cancelled order.
        p_older_than_minutes: 40,
      }
    );

    if (paymentError) {
      logger.error("Pending payment expiration failed", {
        error: paymentError.message,
      });

      return NextResponse.json(
        {
          ok: false,
          error: "Pending payments could not be expired.",
        },
        { status: 500 }
      );
    }

    const { error: marketplaceError } = await supabase.rpc(
      "process_expired_marketplace"
    );

    if (marketplaceError) {
      logger.warn("Marketplace expiration failed during payment maintenance", {
        error: marketplaceError.message,
      });
    }

    return NextResponse.json({
      ok: true,
      expiredPendingPayments: expiredPayments || 0,
      marketplaceProcessed: !marketplaceError,
    });
  } catch (error) {
    logger.error("Payment maintenance cron failed", { error });
    return NextResponse.json(
      { ok: false, error: "Payment maintenance could not run." },
      { status: 500 }
    );
  }
}
