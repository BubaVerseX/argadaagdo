import { NextResponse } from "next/server";
import { isBearerSecretAuthorized } from "@/lib/requestAuth";
import { logger } from "@/lib/logger";
import { sendFavouriteBoxesPush } from "@/lib/push/notify";
import { createServiceRoleSupabaseClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// Called every 10 minutes by the database (pg_cron → private.run_marketplace_tick
// → pg_net) whenever new boxes haven't been announced yet. Publishing itself
// runs inside the database (public.publish_due_bag_templates, each template
// at its own publish time); it is repeated here so a manual call also works.
// Then every new box is announced once to people who saved that place.
export async function GET(request: Request) {
  const authorized =
    isBearerSecretAuthorized(request, process.env.MARKETPLACE_TICK_SECRET) ||
    isBearerSecretAuthorized(request, process.env.CRON_SECRET);

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleSupabaseClient();

    const { data: published, error: publishError } = await supabase.rpc(
      "publish_due_bag_templates"
    );

    if (publishError) {
      logger.error("Lunch Box template publishing failed", { error: publishError.message });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: fresh, error: freshError } = await supabase
      .from("offers")
      .select("id, business_id, businesses(name)")
      .is("favourites_notified_at", null)
      .eq("active", true)
      .gte("created_at", since)
      .order("id", { ascending: true })
      .limit(500);

    if (freshError) {
      logger.error("New boxes could not be listed", { error: freshError.message });
      return NextResponse.json({ ok: false, error: "New boxes could not be listed." }, { status: 500 });
    }

    const offers = (fresh || []) as unknown as {
      id: number;
      business_id: number;
      businesses: { name: string | null } | null;
    }[];

    if (offers.length === 0) {
      return NextResponse.json({ ok: true, published: Number(published || 0), favouritePushes: 0 });
    }

    // Mark first, so a slow push run is never repeated by the next tick.
    const { error: markError } = await supabase
      .from("offers")
      .update({ favourites_notified_at: new Date().toISOString() })
      .in(
        "id",
        offers.map((offer) => offer.id)
      );

    if (markError) {
      logger.error("New boxes could not be marked as announced", { error: markError.message });
      return NextResponse.json({ ok: false, error: "New boxes could not be marked." }, { status: 500 });
    }

    const firstOfferByBusiness = new Map<number, { id: number; name: string | null; offerId: number }>();
    for (const offer of offers) {
      if (!firstOfferByBusiness.has(offer.business_id)) {
        firstOfferByBusiness.set(offer.business_id, {
          id: offer.business_id,
          name: offer.businesses?.name ?? null,
          offerId: offer.id,
        });
      }
    }

    const push = await sendFavouriteBoxesPush(supabase, [...firstOfferByBusiness.values()]);

    return NextResponse.json({
      ok: true,
      published: Number(published || 0),
      announced: offers.length,
      favouritePushes: push.sent,
    });
  } catch (error) {
    logger.error("New box announcement failed", { error });
    return NextResponse.json({ ok: false, error: "New boxes could not be announced." }, { status: 500 });
  }
}
