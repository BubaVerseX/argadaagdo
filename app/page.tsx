"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OfferImage from "@/components/OfferImage";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Offer } from "@/lib/types";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import {
  compareMarketplaceOffers,
  formatPickupWindow,
  getRatingLabel,
  type RatingSummary,
} from "@/lib/offerLifecycle";
import { loadBusinessRatingSummaries } from "@/lib/ratings";
import { useLanguage } from "@/lib/useLanguage";

export default function Home() {
  const { language, t } = useLanguage();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [ratingSummaries, setRatingSummaries] = useState<
    Record<number, RatingSummary>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadFeaturedOffers() {
      await processExpiredMarketplace();

      const [{ data }, summaries] = await Promise.all([
        supabase
          .from("offers")
          .select("*, businesses(name, address, business_type)")
          .eq("active", true)
          .eq("status", "active")
          .gt("quantity", 0)
          .order("id", { ascending: false })
          .limit(6),
        loadBusinessRatingSummaries(),
      ]);

      if (!active) return;

      setRatingSummaries(summaries);
      setOffers(
        ((data || []) as Offer[])
          .sort((firstOffer, secondOffer) =>
            compareMarketplaceOffers(firstOffer, secondOffer, summaries)
          )
      );
      setLoading(false);
    }

    void loadFeaturedOffers();

    return () => {
      active = false;
    };
  }, []);

  const featuredOffers = offers.slice(0, 3);
  const topBusinesses = useMemo(() => {
    const businessMap = new Map<
      number,
      { id: number; name: string; type: string; rating: RatingSummary | undefined }
    >();

    offers.forEach((offer) => {
      if (!businessMap.has(offer.business_id)) {
        businessMap.set(offer.business_id, {
          id: offer.business_id,
          name: offer.businesses?.name || t("common.business"),
          type: offer.businesses?.business_type || t("common.food"),
          rating: ratingSummaries[offer.business_id],
        });
      }
    });

    return Array.from(businessMap.values())
      .sort(
        (first, second) =>
          (second.rating?.average_rating || 0) -
          (first.rating?.average_rating || 0)
      )
      .slice(0, 3);
  }, [offers, ratingSummaries, t]);

  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-950">
      <Navbar />

      <section className="relative overflow-hidden px-4 py-8 sm:px-6 sm:py-12 md:px-12 md:py-20">
        <div className="absolute left-[-120px] top-[-120px] h-80 w-80 rounded-full bg-green-200/50 blur-3xl" />
        <div className="absolute bottom-[-140px] right-[-120px] h-96 w-96 rounded-full bg-yellow-200/60 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex rounded-full border border-green-200 bg-white px-4 py-2 text-xs font-black text-green-800 shadow-sm sm:px-5 sm:text-sm">
                {t("home.badge")}
              </div>

              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[0.98] tracking-tight sm:mt-7 sm:text-5xl md:text-7xl">
                {t("home.title1")}
                <span className="block text-green-700">{t("home.title2")}</span>
                {t("home.title3")}
              </h1>

              <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-gray-700 sm:mt-6 sm:text-lg sm:leading-8 md:text-xl">
                {t("home.subtitle")}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:gap-4">
                <Link
                  href="/offers"
                  className="min-h-12 rounded-full bg-green-700 px-8 py-3 text-center font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-green-800 sm:py-4"
                >
                  {t("home.explore")}
                </Link>

                <Link
                  href="/business/register"
                  className="min-h-12 rounded-full border border-gray-300 bg-white px-8 py-3 text-center font-black text-gray-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-50 sm:py-4"
                >
                  {t("home.joinBusiness")}
                </Link>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-2 sm:mt-10 sm:gap-4">
                <div className="rounded-2xl bg-white p-3 shadow-sm sm:rounded-3xl sm:p-5">
                  <p className="text-3xl font-black text-green-700">
                    {loading ? "–" : offers.length}
                  </p>
                  <p className="mt-1 text-xs font-bold text-gray-600 sm:text-base">
                    {t("home.liveOffers")}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-3 shadow-sm sm:rounded-3xl sm:p-5">
                  <p className="text-3xl font-black text-green-700">
                    100%
                  </p>
                  <p className="mt-1 text-xs font-bold text-gray-600 sm:text-base">
                    {t("home.pickupOnly")}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-3 shadow-sm sm:rounded-3xl sm:p-5">
                  <p className="text-3xl font-black text-green-700">
                    ₾
                  </p>
                  <p className="mt-1 text-xs font-bold text-gray-600 sm:text-base">
                    {t("home.onlinePayment")}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-3xl bg-green-800 p-3 shadow-xl sm:rounded-[2.5rem] sm:p-5">
                <div className="rounded-2xl bg-white p-4 sm:rounded-[2rem] sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black uppercase tracking-widest text-green-700">
                        {t("home.featuredOffer")}
                      </p>
                      <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                        {t("offers.title")}
                      </h2>
                      <p className="mt-2 font-semibold text-gray-600">
                        {t("common.pickup")} {t("common.today")} · Tbilisi
                      </p>
                    </div>
                    <div className="text-4xl sm:text-6xl">🥡</div>
                  </div>

                  <div className="mt-6 grid gap-4">
                    {loading && (
                      <div className="h-24 animate-pulse rounded-3xl bg-[#F7F6EF]" />
                    )}

                    {!loading && featuredOffers.slice(0, 2).map((offer) => (
                      <div
                        key={offer.id}
                        className="flex items-center gap-3 rounded-2xl bg-[#F7F6EF] p-3 sm:gap-4 sm:rounded-3xl sm:p-4"
                      >
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-green-100 sm:h-20 sm:w-20 sm:rounded-2xl">
                          <OfferImage
                            src={offer.image_url}
                            alt={offer.title}
                            sizes="80px"
                          />
                        </div>

                        <div className="flex-1">
                          <h3 className="font-black">{offer.title}</h3>
                          <p className="text-sm font-semibold text-gray-600">
                            {offer.businesses?.name}
                          </p>
                          <p className="text-sm font-semibold text-gray-500">
                            {formatPickupWindow(offer, language)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xl font-black text-green-700">
                            ₾{offer.price}
                          </p>
                          <p className="text-xs font-bold text-gray-500">
                            {offer.quantity} {t("offers.boxesLeft")}
                          </p>
                          <p className="text-xs font-bold text-yellow-700">
                            ⭐ {getRatingLabel(ratingSummaries[offer.business_id], language)}
                          </p>
                        </div>
                      </div>
                    ))}

                    {!loading && offers.length === 0 && (
                      <>
                        <div className="flex items-center gap-4 rounded-3xl bg-[#F7F6EF] p-4">
                          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-green-100 text-4xl">
                            🥐
                          </div>
                          <div className="flex-1">
                            <h3 className="font-black">Bakery box</h3>
                            <p className="text-sm font-semibold text-gray-600">
                              {t("home.noFeatured")}
                            </p>
                          </div>
                          <p className="text-xl font-black text-green-700">
                            ₾6
                          </p>
                        </div>

                        <div className="flex items-center gap-4 rounded-3xl bg-[#F7F6EF] p-4">
                          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-yellow-100 text-4xl">
                            🥗
                          </div>
                          <div className="flex-1">
                            <h3 className="font-black">Lunch box</h3>
                            <p className="text-sm font-semibold text-gray-600">
                              {t("businessDashboard.createOffer")}
                            </p>
                          </div>
                          <p className="text-xl font-black text-green-700">
                            ₾8
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-white p-4 shadow-xl sm:absolute sm:-bottom-6 sm:-left-4 sm:mt-0 sm:rounded-3xl sm:p-5 md:-left-8">
                <p className="text-sm font-black text-gray-500">
                  {t("home.stats")}
                </p>
                <p className="mt-1 text-3xl font-black text-green-700">
                  {loading ? "–" : offers.reduce(
                    (total, offer) => total + Number(offer.quantity || 0),
                    0
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 sm:py-10 md:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-green-700">
                {t("home.featuredOffers")}
              </p>
              <h3 className="mt-2 text-3xl font-black text-gray-950 sm:text-4xl">
                {t("offers.heading")}
              </h3>
              <p className="mt-2 text-lg font-semibold text-gray-700">
                {t("offers.subtitle")}
              </p>
            </div>

            <Link
              href="/offers"
              className="w-fit rounded-full bg-white px-6 py-3 font-black text-green-700 shadow-sm transition hover:bg-green-50"
            >
              {t("common.viewDetails")}
            </Link>
          </div>

          <div className="grid gap-5 sm:gap-6 md:grid-cols-3">
            {loading && (
              <div className="h-96 animate-pulse rounded-3xl bg-white shadow-sm md:col-span-3" />
            )}

            {featuredOffers.map((offer) => (
              <div
                key={offer.id}
                className="overflow-hidden rounded-[2rem] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-52 overflow-hidden bg-gradient-to-br from-green-100 to-yellow-100 sm:h-56">
                  <OfferImage
                    src={offer.image_url}
                    alt={offer.title}
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />

                  <div className="absolute left-4 top-4 rounded-full bg-white px-4 py-2 text-sm font-black text-green-700 shadow-sm">
                    {offer.businesses?.business_type || t("common.food")}
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-xl font-black sm:text-2xl">
                        {offer.title}
                      </h4>
                      <p className="mt-2 font-bold text-gray-700">
                        {offer.businesses?.name}
                      </p>
                      <p className="mt-1 text-sm font-black text-yellow-700">
                        ⭐ {getRatingLabel(ratingSummaries[offer.business_id], language)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-green-50 px-4 py-3 text-center">
                      <p className="text-xs font-black text-green-700">
                        {t("offers.boxesLeft")}
                      </p>
                      <p className="text-2xl font-black text-green-800">
                        {offer.quantity}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 font-semibold text-gray-600">
                    📍 {offer.businesses?.address}
                  </p>

                  <p className="mt-2 font-semibold text-gray-600">
                    ⏰ {formatPickupWindow(offer, language)}
                  </p>

                  <div className="mt-6 flex flex-col gap-4 sm:mt-7 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span className="text-4xl font-black text-green-700">
                        ₾{offer.price}
                      </span>

                      {offer.old_price && (
                        <span className="ml-3 font-bold text-gray-400 line-through">
                          ₾{offer.old_price}
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/offers/${offer.id}`}
                      className="min-h-12 rounded-full bg-green-700 px-6 py-3 text-center font-black text-white transition hover:bg-green-800"
                    >
                      {t("common.viewDetails")}
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {!loading && offers.length === 0 && (
              <div className="rounded-[2rem] bg-white p-10 text-center shadow-sm md:col-span-3">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
                  🥡
                </div>
                <h3 className="mt-5 text-3xl font-black">
                  {t("offers.noOffers")}
                </h3>
                <p className="mt-3 font-semibold text-gray-600">
                  {t("offers.noOffersHint")}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 sm:py-10 md:px-12">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-green-700">
                {t("common.rating")}
              </p>
              <h3 className="mt-2 text-3xl font-black">
                {t("home.topBusinesses")}
              </h3>
            </div>
            <Link
              href="/offers"
              className="w-fit rounded-full bg-green-50 px-5 py-2.5 font-black text-green-800"
            >
              {t("nav.offers")}
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {topBusinesses.length === 0 && (
              <p className="font-semibold text-gray-600 md:col-span-3">
                {t("common.noRatings")}
              </p>
            )}

            {topBusinesses.map((business) => (
              <Link
                key={business.id}
                href={`/businesses/${business.id}`}
                className="rounded-3xl bg-[#F7F6EF] p-5 transition hover:-translate-y-1 hover:shadow-md"
              >
                <p className="text-2xl font-black">{business.name}</p>
                <p className="mt-2 font-semibold text-gray-600">
                  {business.type}
                </p>
                <p className="mt-4 font-black text-yellow-700">
                  ⭐ {getRatingLabel(business.rating, language)}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-16 md:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <p className="text-sm font-black uppercase tracking-widest text-green-700">
              ArGadaagdo
            </p>
            <h3 className="mt-2 text-3xl font-black">
              {t("home.howItWorks")}
            </h3>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: "📍",
              title: t("home.step1"),
              text: t("offers.subtitle"),
            },
            {
              icon: "💸",
              title: t("home.step2"),
              text: t("orders.cancelPolicy"),
            },
            {
              icon: "🥡",
              title: t("home.step3"),
              text: t("orders.showCode"),
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md sm:rounded-[2rem] sm:p-8"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-4xl">
                {item.icon}
              </div>
              <h4 className="mt-6 text-2xl font-black">{item.title}</h4>
              <p className="mt-3 font-semibold leading-7 text-gray-700">
                {item.text}
              </p>
            </div>
          ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
