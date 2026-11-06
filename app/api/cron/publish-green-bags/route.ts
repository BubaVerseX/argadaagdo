import { NextResponse } from "next/server";
import { isBearerSecretAuthorized } from "@/lib/requestAuth";
import { logger } from "@/lib/logger";
import { getTbilisiDateKey, getTomorrowDateKey } from "@/lib/offerLifecycle";
import { sendFavouriteBoxesPush } from "@/lib/push/notify";
import { createServiceRoleSupabaseClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// Daily Lunch Box publisher (vercel.json, 15:00 UTC = 19:00 Tbilisi). Creates
// tomorrow's offers from every active box template, and catches up today's in
// case a template was added after yesterday's run. publish_bag_templates is
// idempotent: a template never gets two offers for the same date.
export async function GET(request: Request) {
  if (!isBearerSecretAuthorized(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleSupabaseClient();
    const results: Record<string, number> = {};
    const startedAt = new Date().toISOString();

    for (const date of [getTbilisiDateKey(), getTomorrowDateKey()]) {
      const { data, error } = await supabase.rpc("publish_bag_templates", {
        p_date: date,
      });

      if (error) {
        logger.error("Lunch Box template publishing failed", {
          date,
          error: error.message,
        });
        return NextResponse.json(
          { ok: false, error: "Templates could not be published.", date },
          { status: 500 }
        );
      }

      results[date] = Number(data || 0);
    }

    // Tell people whose favourite places just got new boxes (app push).
    const { data: created } = await supabase
      .from("offers")
      .select("id, business_id, businesses(name)")
      .gte("created_at", startedAt)
      .eq("active", true)
      .order("id", { ascending: true })
      .limit(500);
    const firstOfferByBusiness = new Map<number, { id: number; name: string | null; offerId: number }>();
    for (const offer of (created || []) as unknown as {
      id: number;
      business_id: number;
      businesses: { name: string | null } | null;
    }[]) {
      if (!firstOfferByBusiness.has(offer.business_id)) {
        firstOfferByBusiness.set(offer.business_id, {
          id: offer.business_id,
          name: offer.businesses?.name ?? null,
          offerId: offer.id,
        });
      }
    }
    const push = await sendFavouriteBoxesPush(supabase, [...firstOfferByBusiness.values()]);

    return NextResponse.json({ ok: true, created: results, favouritePushes: push.sent });
  } catch (error) {
    logger.error("Lunch Box template cron failed", { error });
    return NextResponse.json(
      { ok: false, error: "Template publishing could not run." },
      { status: 500 }
    );
  }
}
