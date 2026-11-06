import { NextResponse } from "next/server";
import {
  createPublicSupabaseClient,
  PUBLIC_BUSINESS_COLUMNS,
} from "@/lib/nativePublicData";

// One public offer, its business rating and reviews, for the app's offer page.
export const dynamic = "force-static";
export const revalidate = 20;

export function generateStaticParams() {
  return [];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const offerId = Number((await params).id);

  if (!Number.isInteger(offerId) || offerId <= 0) {
    return NextResponse.json({ offer: null, rating: null, reviews: [] });
  }

  const supabase = createPublicSupabaseClient();
  const { data: offer } = await supabase
    .from("offers")
    .select(`*, businesses(${PUBLIC_BUSINESS_COLUMNS}, approved)`)
    .eq("id", offerId)
    .maybeSingle();

  if (!offer) {
    return NextResponse.json({ offer: null, rating: null, reviews: [] });
  }

  const [ratings, reviews] = await Promise.all([
    supabase.rpc("get_business_rating_summary"),
    supabase.rpc("get_public_business_reviews", {
      p_business_id: offer.business_id,
    }),
  ]);
  const rating =
    ((ratings.data ?? []) as { business_id: number }[]).find(
      (row) => Number(row.business_id) === Number(offer.business_id)
    ) ?? null;

  return NextResponse.json({ offer, rating, reviews: reviews.data ?? [] });
}
