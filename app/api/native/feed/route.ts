import { NextResponse } from "next/server";
import {
  createPublicSupabaseClient,
  FEED_LIMIT,
  PUBLIC_BUSINESS_COLUMNS,
} from "@/lib/nativePublicData";

// Public offers for the app home, regenerated at most every 30 seconds. The
// client still hides whatever expired since then; checkout re-reads live.
export const dynamic = "force-static";
export const revalidate = 30;

export async function GET() {
  const supabase = createPublicSupabaseClient();
  const loadOffers = (businessColumns: string) =>
    supabase
      .from("offers")
      .select(`*, businesses(${businessColumns})`)
      .eq("active", true)
      .eq("status", "active")
      .gt("quantity", 0)
      .order("id", { ascending: false })
      .limit(FEED_LIMIT);

  // Coordinates for the map pins and "nearest first"
  // (supabase/migrations/20261106150000_business_location.sql). Until that
  // migration is applied the columns don't exist, so fall back to the rest.
  const [withLocation, ratings] = await Promise.all([
    loadOffers(`${PUBLIC_BUSINESS_COLUMNS}, latitude, longitude`),
    supabase.rpc("get_business_rating_summary"),
  ]);
  const offers = withLocation.error ? await loadOffers(PUBLIC_BUSINESS_COLUMNS) : withLocation;

  if (offers.error) {
    return NextResponse.json({ offers: null, ratings: [] });
  }

  return NextResponse.json({
    offers: offers.data ?? [],
    ratings: ratings.data ?? [],
  });
}
