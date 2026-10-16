import { NextResponse } from "next/server";
import { isBearerSecretAuthorized } from "@/lib/requestAuth";
import { logger } from "@/lib/logger";
import { settleRefundForPayment } from "@/lib/payments/refunds";
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
        // Must stay longer than the TBC checkout session TTL (12 min, see
        // lib/payments/tbc.ts) plus a margin: expiring a hold while the bank
        // page is still payable lets a customer pay for a cancelled order
        // (which is then refunded automatically, but still worth avoiding).
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

    // Finish refunds whose bank call failed or timed out earlier (customer
    // cancellations and late payments). Each one is re-checked with the bank
    // first, so a refund that already went through is only recorded.
    const { data: refundRows, error: refundListError } = await supabase
      .from("payments")
      .select("id")
      .eq("status", "refund_required")
      .order("created_at", { ascending: true })
      .limit(25);

    if (refundListError) {
      logger.error("Outstanding refunds could not be listed", {
        error: refundListError.message,
      });
    }

    const refundResults: Record<string, number> = {};

    for (const row of (refundRows || []) as { id: number }[]) {
      const settlement = await settleRefundForPayment(supabase, row.id);
      refundResults[settlement] = (refundResults[settlement] || 0) + 1;
    }

    if ((refundResults.failed || 0) + (refundResults.pending || 0) > 0) {
      logger.error("Some refunds are still outstanding", { refundResults });
    }

    return NextResponse.json({
      ok: true,
      expiredPendingPayments: expiredPayments || 0,
      marketplaceProcessed: !marketplaceError,
      refunds: refundResults,
    });
  } catch (error) {
    logger.error("Payment maintenance cron failed", { error });
    return NextResponse.json(
      { ok: false, error: "Payment maintenance could not run." },
      { status: 500 }
    );
  }
}
