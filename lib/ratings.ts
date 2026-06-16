import type { RatingSummary } from "@/lib/offerLifecycle";
import { supabase } from "@/lib/supabase";
import type { PublicBusinessReview } from "@/lib/types";

export async function loadBusinessRatingSummaries() {
  const { data, error } = await supabase.rpc("get_business_rating_summary");

  if (error) {
    return {} as Record<number, RatingSummary>;
  }

  return ((data || []) as RatingSummary[]).reduce<Record<number, RatingSummary>>(
    (summaryMap, summary) => {
      summaryMap[Number(summary.business_id)] = {
        business_id: Number(summary.business_id),
        average_rating: Number(summary.average_rating || 0),
        rating_count: Number(summary.rating_count || 0),
      };
      return summaryMap;
    },
    {}
  );
}

export async function loadPublicBusinessReviews(businessId: number) {
  const { data, error } = await supabase.rpc("get_public_business_reviews", {
    p_business_id: businessId,
  });

  if (error) return [] as PublicBusinessReview[];

  return (data || []) as PublicBusinessReview[];
}
