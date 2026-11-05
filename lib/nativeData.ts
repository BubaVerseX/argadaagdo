"use client";

import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import {
  compareMarketplaceOffers,
  isOfferReservable,
  type RatingSummary,
} from "@/lib/offerLifecycle";
import { supabase } from "@/lib/supabase";
import type { Offer, PublicBusinessReview } from "@/lib/types";
import { useEffect, useState } from "react";

// Data for the app screens. Public data only is cached here (memory and
// localStorage); orders, profile and business data are never cached.

export type NativeOffer = Offer & {
  businesses?:
    | (NonNullable<Offer["businesses"]> & { approved?: boolean | string | null })
    | null;
};

type FeedResponse = {
  offers: NativeOffer[] | null;
  ratings: RatingSummary[];
};

export type NativeFeed = {
  offers: NativeOffer[];
  ratings: Record<number, RatingSummary>;
};

const FEED_STORAGE_KEY = "argadaagdo-native-feed-v1";
const FEED_STORAGE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const BUSINESS_COLUMNS = "name, address, business_type";

let feedInMemory: NativeFeed | null = null;
let expiryStarted = false;

function normaliseFeed(response: FeedResponse): NativeFeed | null {
  if (!response.offers) return null;

  const ratings = (response.ratings || []).reduce<Record<number, RatingSummary>>(
    (map, row) => {
      map[Number(row.business_id)] = {
        business_id: Number(row.business_id),
        average_rating: Number(row.average_rating || 0),
        rating_count: Number(row.rating_count || 0),
      };
      return map;
    },
    {}
  );

  return { offers: response.offers, ratings };
}

/** Reservable offers, best first. Applied on every read: cached copies age. */
export function visibleOffers(feed: NativeFeed | null) {
  if (!feed) return [];
  return feed.offers
    .filter((offer) => isOfferReservable(offer))
    .sort((first, second) =>
      compareMarketplaceOffers(first, second, feed.ratings)
    );
}

function readStoredFeed(): NativeFeed | null {
  try {
    const stored = window.localStorage.getItem(FEED_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { at: number; feed: NativeFeed };
    return Date.now() - parsed.at < FEED_STORAGE_MAX_AGE_MS ? parsed.feed : null;
  } catch {
    return null;
  }
}

function storeFeed(feed: NativeFeed) {
  feedInMemory = feed;
  try {
    window.localStorage.setItem(
      FEED_STORAGE_KEY,
      JSON.stringify({ at: Date.now(), feed })
    );
  } catch {
    // Storage is only a speed-up.
  }
}

export function getCachedFeed() {
  if (!feedInMemory) feedInMemory = readStoredFeed();
  return feedInMemory;
}

export function getCachedOffer(offerId: number) {
  return getCachedFeed()?.offers.find((offer) => offer.id === offerId) ?? null;
}

// The feed comes from the cached public route. A request the boot script in
// app/layout.tsx already started is used instead of starting a second one.
async function fetchPublicFeed(): Promise<NativeFeed | null> {
  const bootWindow = window as unknown as {
    __nativeFeed?: Promise<FeedResponse | null>;
  };
  const bootRequest = bootWindow.__nativeFeed;
  bootWindow.__nativeFeed = undefined;

  const response =
    (bootRequest ? await bootRequest : null) ??
    (await fetch("/api/native/feed")
      .then((result) => (result.ok ? (result.json() as Promise<FeedResponse>) : null))
      .catch(() => null));

  return response ? normaliseFeed(response) : null;
}

// RLS can show a signed-in account offers the public route can't, such as the
// App Review demo bag, so a stored session also reads its own view directly.
async function fetchSignedInOffers(): Promise<NativeOffer[] | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const { data, error } = await supabase
    .from("offers")
    .select(`*, businesses(${BUSINESS_COLUMNS})`)
    .eq("active", true)
    .eq("status", "active")
    .gt("quantity", 0)
    .order("id", { ascending: false })
    .limit(60);

  return error ? null : ((data || []) as NativeOffer[]);
}

/** Expired offers are still swept from the client, but nothing waits for it. */
export function sweepExpiredOffersOnce() {
  if (expiryStarted) return;
  expiryStarted = true;
  void processExpiredMarketplace();
}

/** Stale-while-revalidate: cached public offers at once, then the fresh ones. */
export function useNativeFeed() {
  const [feed, setFeed] = useState<NativeFeed | null>(getCachedFeed);
  const [loading, setLoading] = useState(feed === null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    sweepExpiredOffersOnce();

    void (async () => {
      const [publicFeed, signedInOffers] = await Promise.all([
        fetchPublicFeed(),
        fetchSignedInOffers().catch(() => null),
      ]);

      if (!active) return;

      if (publicFeed) storeFeed(publicFeed);

      const nextFeed: NativeFeed | null =
        signedInOffers && (publicFeed || feedInMemory)
          ? {
              offers: signedInOffers,
              ratings: (publicFeed ?? feedInMemory)!.ratings,
            }
          : signedInOffers
          ? { offers: signedInOffers, ratings: {} }
          : publicFeed;

      // The signed-in view stays in this component's state; only the public
      // feed goes into the shared cache.
      if (nextFeed) {
        setFeed(nextFeed);
        setFailed(false);
      } else {
        setFailed(true);
      }

      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [attempt]);

  function retry() {
    setLoading(true);
    setFailed(false);
    setAttempt((current) => current + 1);
  }

  return { feed, loading, failed, retry };
}

export type NativeOfferDetail = {
  offer: NativeOffer | null;
  rating: RatingSummary | null;
  reviews: PublicBusinessReview[];
};

const detailRequests = new Map<number, Promise<NativeOfferDetail>>();

async function fetchOfferDetail(offerId: number): Promise<NativeOfferDetail> {
  const response = await fetch(`/api/native/offers/${offerId}`);
  const detail: NativeOfferDetail = response.ok
    ? await response.json()
    : { offer: null, rating: null, reviews: [] };

  if (detail.offer) return detail;

  // Not public (the App Review demo bag): RLS decides what this session sees.
  const { data } = await supabase
    .from("offers")
    .select(`*, businesses(${BUSINESS_COLUMNS}, approved)`)
    .eq("id", offerId)
    .maybeSingle();

  return { ...detail, offer: (data as NativeOffer | null) ?? null };
}

/** Called on touch, so the data is usually there before the page opens. */
export function prefetchOfferDetail(offerId: number) {
  const existing = detailRequests.get(offerId);
  if (existing) return existing;

  const request = fetchOfferDetail(offerId).catch(
    (): NativeOfferDetail => ({ offer: null, rating: null, reviews: [] })
  );

  detailRequests.set(offerId, request);
  setTimeout(() => detailRequests.delete(offerId), 20_000);

  return request;
}
