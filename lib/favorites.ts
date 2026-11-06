import { supabase } from "@/lib/supabase";
import type { Favorite, Offer } from "@/lib/types";

// The signed-in customer's saved offers, newest first. Used by the website's
// /favorites page and the app's Favourites screen.

type FavoriteOfferDetails = {
  favorite_id: number;
  offer_id: number;
  business_id: number;
  title: string;
  category: string | null;
  price: number | string;
  old_price: number | string | null;
  quantity: number | null;
  pickup_date: string | null;
  pickup_start: string | null;
  pickup_end: string | null;
  active: boolean | null;
  status: string | null;
  image_url: string | null;
  business_name: string | null;
  business_address: string | null;
  business_type: string | null;
};

/** null = couldn't load. */
export async function fetchMyFavorites(
  userId: string
): Promise<Favorite[] | null> {
  const { data, error } = await supabase
    .from("favorites")
    .select(
      `
        id,
        user_id,
        offer_id,
        created_at,
        offers(
          id,
          business_id,
          title,
          category,
          price,
          old_price,
          quantity,
          pickup_date,
          pickup_start,
          pickup_end,
          active,
          status,
          image_url,
          businesses(name, address, business_type)
        )
      `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return null;

  const loadedFavorites = (data || []) as unknown as Favorite[];

  // The offers policy only exposes active offers, so a sold-out or
  // expired favorite came back with offers = null (a blank card). Fill
  // those in from get_my_favorite_offers(); until that database function
  // exists the call fails and the page behaves as before.
  if (loadedFavorites.some((favorite) => !favorite.offers)) {
    const { data: details, error: detailsError } = await supabase.rpc(
      "get_my_favorite_offers"
    );

    if (!detailsError && Array.isArray(details)) {
      const offersByFavoriteId = new Map<number, Offer>(
        (details as FavoriteOfferDetails[]).map((row) => [
          row.favorite_id,
          {
            id: row.offer_id,
            business_id: row.business_id,
            title: row.title,
            category: row.category,
            price: row.price,
            old_price: row.old_price,
            quantity: row.quantity,
            pickup_date: row.pickup_date,
            pickup_start: row.pickup_start,
            pickup_end: row.pickup_end,
            active: row.active,
            status: row.status,
            image_url: row.image_url,
            businesses: {
              name: row.business_name,
              address: row.business_address,
              business_type: row.business_type,
            },
          } as Offer,
        ])
      );

      for (const favorite of loadedFavorites) {
        if (!favorite.offers) {
          favorite.offers = offersByFavoriteId.get(favorite.id) || null;
        }
      }
    }
  }

  return loadedFavorites;
}
