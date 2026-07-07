"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Notice from "@/components/Notice";
import OfferImage from "@/components/OfferImage";
import { LoadingState } from "@/components/LoadingState";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import {
  formatMoney,
  formatPickupWindow,
  getOfferDateKey,
  getRatingLabel,
  getTbilisiDateKey,
  isOfferReservable,
  type RatingSummary,
} from "@/lib/offerLifecycle";
import { loadBusinessRatingSummaries } from "@/lib/ratings";
import { supabase } from "@/lib/supabase";
import type { Business, Offer } from "@/lib/types";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DiscoverOffer = Offer & {
  businesses?: Pick<Business, "name" | "address" | "business_type"> | null;
};

type DiscoverBusiness = Pick<
  Business,
  "id" | "name" | "business_type" | "address" | "approved"
>;

const DISCOVER_LIMIT = 80;

function getOfferEndSortValue(offer: Offer) {
  return `${getOfferDateKey(offer)}T${offer.pickup_end || "23:59"}`;
}

function DiscoverOfferCard({
  offer,
  rating,
  language,
}: {
  offer: DiscoverOffer;
  rating?: RatingSummary;
  language: "en" | "ka";
}) {
  return (
    <Link
      href={`/offers/${offer.id}`}
      className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
    >
      <div className="relative h-44 bg-green-100">
        <OfferImage
          src={offer.image_url}
          alt={offer.title}
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-black text-green-800 shadow-sm">
          {offer.category || "Other"}
        </span>
      </div>
      <div className="p-5">
        <p className="text-xs font-black uppercase tracking-widest text-green-700">
          {offer.businesses?.name || "Local business"}
        </p>
        <h3 className="mt-2 text-xl font-black text-gray-950">{offer.title}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-green-50 px-3 py-1.5 text-sm font-black text-green-800">
            {formatMoney(offer.price)}
          </span>
          <span className="rounded-full bg-[#F7F6EF] px-3 py-1.5 text-sm font-black text-gray-700">
            {formatPickupWindow(offer, language)}
          </span>
          <span className="rounded-full bg-yellow-50 px-3 py-1.5 text-sm font-black text-yellow-800">
            {getRatingLabel(rating, language)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function DiscoverClient() {
  const { language } = useLanguage();
  const [offers, setOffers] = useState<DiscoverOffer[]>([]);
  const [businesses, setBusinesses] = useState<DiscoverBusiness[]>([]);
  const [ratingSummaries, setRatingSummaries] = useState<
    Record<number, RatingSummary>
  >({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDiscoverData() {
      await processExpiredMarketplace();

      const [offerResult, businessResult, summaries] = await Promise.all([
        supabase
          .from("offers")
          .select("*, businesses(name, address, business_type)")
          .eq("active", true)
          .gt("quantity", 0)
          .order("id", { ascending: false })
          .limit(DISCOVER_LIMIT),
        supabase
          .from("businesses")
          .select("id, name, business_type, address, approved")
          .eq("approved", true)
          .order("id", { ascending: false })
          .limit(DISCOVER_LIMIT),
        loadBusinessRatingSummaries(),
      ]);

      if (!active) return;

      if (offerResult.error || businessResult.error) {
        setMessage("Discover could not be loaded. Please try again.");
        setOffers([]);
        setBusinesses([]);
        setLoading(false);
        return;
      }

      setOffers(((offerResult.data || []) as DiscoverOffer[]).filter(isOfferReservable));
      setBusinesses((businessResult.data || []) as DiscoverBusiness[]);
      setRatingSummaries(summaries);
      setLoading(false);
    }

    void loadDiscoverData();

    return () => {
      active = false;
    };
  }, []);

  const todayKey = getTbilisiDateKey();
  const discoverSections = useMemo(() => {
    const popularToday = offers
      .filter((offer) => getOfferDateKey(offer) === todayKey)
      .sort((first, second) => {
        const firstRating = ratingSummaries[first.business_id]?.average_rating || 0;
        const secondRating = ratingSummaries[second.business_id]?.average_rating || 0;
        return secondRating - firstRating;
      })
      .slice(0, 4);
    const newestOffers = offers.slice(0, 4);
    const endingSoon = [...offers]
      .sort((first, second) =>
        getOfferEndSortValue(first).localeCompare(getOfferEndSortValue(second))
      )
      .slice(0, 4);
    const bestRatedBusinesses = [...businesses]
      .sort((first, second) => {
        const firstRating = ratingSummaries[first.id]?.average_rating || 0;
        const secondRating = ratingSummaries[second.id]?.average_rating || 0;
        return secondRating - firstRating;
      })
      .slice(0, 4);

    return {
      popularToday,
      newestOffers,
      endingSoon,
      bestRatedBusinesses,
    };
  }, [businesses, offers, ratingSummaries, todayKey]);

  return (
    <main className="app-shell">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="premium-surface rounded-3xl p-5 sm:rounded-[2rem] sm:p-8 md:rounded-[2.5rem] md:p-12">
            <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
              Discover
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-6xl">
              Find your next surprise bag.
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-gray-600 sm:text-lg sm:leading-8">
              Browse popular offers, newest drops, best-rated businesses and
              pickup windows ending soon.
            </p>
          </div>

          {message && (
            <div className="mt-5">
              <Notice tone="error">{message}</Notice>
            </div>
          )}

          {loading && (
            <div className="mt-6">
              <LoadingState
                title="Loading discover..."
                description="Finding active surprise bags and verified businesses."
              />
            </div>
          )}

          {!loading && (
            <div className="mt-6 grid gap-8">
              <DiscoverOfferSection
                title="Popular Today"
                text="Today’s best-rated available surprise bags."
                offers={discoverSections.popularToday}
                ratingSummaries={ratingSummaries}
                language={language}
              />
              <DiscoverOfferSection
                title="Newest Offers"
                text="Freshly published offers from local businesses."
                offers={discoverSections.newestOffers}
                ratingSummaries={ratingSummaries}
                language={language}
              />
              <DiscoverOfferSection
                title="Ending Soon"
                text="Pickup windows that end soonest."
                offers={discoverSections.endingSoon}
                ratingSummaries={ratingSummaries}
                language={language}
              />

              <section className="rounded-[2rem] bg-white p-5 shadow-sm sm:p-8">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
                      Best Rated Businesses
                    </p>
                    <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                      Trusted local places
                    </h2>
                  </div>
                  <Link
                    href="/businesses"
                    className="min-h-11 rounded-full bg-green-700 px-5 py-2.5 text-center font-black text-white"
                  >
                    View all businesses
                  </Link>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {discoverSections.bestRatedBusinesses.map((business) => (
                    <Link
                      key={business.id}
                      href={`/businesses/${business.id}`}
                      className="rounded-3xl bg-[#F7F6EF] p-5 transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
                    >
                      <p className="text-xs font-black uppercase tracking-widest text-green-700">
                        {business.business_type || "Food business"}
                      </p>
                      <h3 className="mt-2 text-xl font-black text-gray-950">
                        {business.name}
                      </h3>
                      <p className="mt-2 text-sm font-semibold leading-6 text-gray-600">
                        {business.address || "Tbilisi"}
                      </p>
                      <p className="mt-3 rounded-full bg-white px-3 py-1.5 text-sm font-black text-yellow-800">
                        {getRatingLabel(ratingSummaries[business.id], language)}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>

              <section className="rounded-[2rem] bg-green-50 p-5 shadow-sm sm:p-8">
                <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
                  Location
                </p>
                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  Find pickup addresses easily
                </h2>
                <p className="mt-3 max-w-3xl font-semibold leading-7 text-green-900">
                  Every offer shows the business address and a map link so you
                  can plan pickup before reserving.
                </p>
              </section>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}

function DiscoverOfferSection({
  title,
  text,
  offers,
  ratingSummaries,
  language,
}: {
  title: string;
  text: string;
  offers: DiscoverOffer[];
  ratingSummaries: Record<number, RatingSummary>;
  language: "en" | "ka";
}) {
  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-sm sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
            {title}
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">{text}</h2>
        </div>
        <Link
          href="/offers"
          className="min-h-11 rounded-full bg-green-700 px-5 py-2.5 text-center font-black text-white"
        >
          Browse all offers
        </Link>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {offers.length === 0 && (
          <div className="rounded-3xl bg-[#F7F6EF] p-6 md:col-span-2 xl:col-span-4">
            <p className="text-lg font-black text-gray-950">
              No offers in this section yet.
            </p>
            <p className="mt-2 font-semibold leading-7 text-gray-600">
              New surprise bags will appear here as businesses publish offers.
            </p>
          </div>
        )}

        {offers.map((offer) => (
          <DiscoverOfferCard
            key={offer.id}
            offer={offer}
            rating={ratingSummaries[offer.business_id]}
            language={language}
          />
        ))}
      </div>
    </section>
  );
}
