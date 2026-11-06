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
  const [offers, ratings] = await Promise.all([
    supabase
      .from("offers")
      .select(`*, businesses(${PUBLIC_BUSINESS_COLUMNS})`)
      .eq("active", true)
      .eq("status", "active")
      .gt("quantity", 0)
      .order("id", { ascending: false })
      .limit(FEED_LIMIT),
    supabase.rpc("get_business_rating_summary"),
  ]);

  if (offers.error) {
    return NextResponse.json({ offers: null, ratings: [] });
  }

  return NextResponse.json({
    offers: offers.data ?? [],
    ratings: ratings.data ?? [],
  });
}
