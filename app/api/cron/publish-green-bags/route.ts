import { NextResponse } from "next/server";
import { isBearerSecretAuthorized } from "@/lib/requestAuth";
import { logger } from "@/lib/logger";
import { getTbilisiDateKey, getTomorrowDateKey } from "@/lib/offerLifecycle";
import { createServiceRoleSupabaseClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// Daily Green Bag publisher (vercel.json, 15:00 UTC = 19:00 Tbilisi). Creates
// tomorrow's offers from every active bag template, and catches up today's in
// case a template was added after yesterday's run. publish_bag_templates is
// idempotent: a template never gets two offers for the same date.
export async function GET(request: Request) {
  if (!isBearerSecretAuthorized(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleSupabaseClient();
    const results: Record<string, number> = {};

    for (const date of [getTbilisiDateKey(), getTomorrowDateKey()]) {
      const { data, error } = await supabase.rpc("publish_bag_templates", {
        p_date: date,
      });

      if (error) {
        logger.error("Green Bag template publishing failed", {
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

    return NextResponse.json({ ok: true, created: results });
  } catch (error) {
    logger.error("Green Bag template cron failed", { error });
    return NextResponse.json(
      { ok: false, error: "Template publishing could not run." },
      { status: 500 }
    );
  }
}
