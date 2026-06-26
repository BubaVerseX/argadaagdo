"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OfferImage from "@/components/OfferImage";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Offer } from "@/lib/types";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import { normalizeOfferCategory } from "@/lib/offerCategories";
import {
  compareMarketplaceOffers,
  formatMoney,
  formatPickupWindow,
  getOfferDateLabel,
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
  const firstFeaturedOffer = featuredOffers[0];
  const featuredPickupLabel = firstFeaturedOffer
    ? `${t("common.pickup")} ${getOfferDateLabel(firstFeaturedOffer, language)}`
    : t("home.pickupWindows");
  const trustStripItems = [
    t("home.trustVerifiedBusinesses"),
    t("home.trustPickupCodeVerification"),
    t("home.trustLocalTbilisiBusinesses"),
  ];
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

              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[1.02] tracking-tight sm:mt-7 sm:text-5xl md:text-6xl">
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
                  {t("common.browseOffers")}
                </Link>

                <Link
                  href="/business/register"
                  className="min-h-12 rounded-full border border-gray-300 bg-white px-8 py-3 text-center font-black text-gray-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-50 sm:py-4"
                >
                  {t("nav.forBusiness")}
                </Link>
              </div>

              <div className="mt-6 grid gap-2 sm:grid-cols-3 lg:max-w-3xl">
                {trustStripItems.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl bg-white/85 px-4 py-3 text-sm font-black text-green-900 shadow-sm ring-1 ring-green-100"
                  >
                    ✓ {item}
                  </div>
                ))}
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
                        {!loading && offers.length === 0
                          ? t("home.noSurpriseBags")
                          : t("offers.title")}
                      </h2>
                      <p className="mt-2 font-semibold text-gray-600">
                        {!loading && offers.length === 0
                          ? t("home.publishLater")
                          : `${featuredPickupLabel} · Tbilisi`}
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
                            {formatMoney(offer.price)}
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
                      <div className="rounded-3xl bg-[#F7F6EF] p-5 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-3xl">
                          ✓
                        </div>
                        <h3 className="mt-4 text-xl font-black">
                          {t("home.noSurpriseBags")}
                        </h3>
                        <p className="mt-2 text-sm font-semibold leading-6 text-gray-600">
                          {t("home.publishLater")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 sm:py-10 md:px-12">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-black uppercase tracking-widest text-green-700">
              {t("home.businessCtaBadge")}
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
              {t("home.businessCtaTitle")}
            </h2>
            <p className="mt-4 font-semibold leading-7 text-gray-700">
              {t("home.businessCtaText")}
            </p>
            <Link
              href="/business/register"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-green-700 px-6 py-3 text-center font-black text-white transition hover:bg-green-800 sm:w-auto"
            >
              {t("home.registerBusiness")}
            </Link>
            <p className="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-sm font-black text-green-800">
              {t("home.moreBusinessesJoiningSoon")}
            </p>
          </div>

          <div className="rounded-[2rem] bg-yellow-50 p-6 shadow-sm ring-1 ring-yellow-100 sm:p-8">
            <p className="text-sm font-black uppercase tracking-widest text-green-700">
              {t("home.customerCtaBadge")}
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
              {t("home.customerCtaTitle")}
            </h2>
            <p className="mt-4 font-semibold leading-7 text-gray-700">
              {t("home.customerCtaText")}
            </p>
            <Link
              href="/offers"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white px-6 py-3 text-center font-black text-green-800 shadow-sm transition hover:bg-green-50 sm:w-auto"
            >
              {t("common.browseOffers")}
            </Link>
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
                    {normalizeOfferCategory(offer.category)}
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
                        {formatMoney(offer.price)}
                      </span>

                      {offer.old_price && (
                        <span className="ml-3 font-bold text-gray-400 line-through">
                          {formatMoney(offer.old_price)}
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
                  +
                </div>
                <h3 className="mt-5 text-3xl font-black">
                  {t("home.noSurpriseBags")}
                </h3>
                <p className="mt-3 font-semibold text-gray-600">
                  {t("home.publishLater")}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-16 md:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 sm:mb-8">
            <p className="text-sm font-black uppercase tracking-widest text-green-700">
              ArGadaagdo
            </p>
            <h3 className="mt-2 text-3xl font-black">
              {t("home.howItWorks")}
            </h3>
            <p className="mt-3 max-w-2xl font-semibold leading-7 text-gray-700">
              {t("home.howItWorksIntro")}
            </p>
          </div>

          <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                number: "1",
                title: t("home.step1"),
                text: t("home.step1Text"),
              },
              {
                number: "2",
                title: t("home.step2"),
                text: t("home.step2Text"),
              },
              {
                number: "3",
                title: t("home.step3"),
                text: t("home.step3Text"),
              },
              {
                number: "4",
                title: t("home.step4"),
                text: t("home.step4Text"),
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md sm:rounded-[2rem] sm:p-6"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-2xl font-black text-green-800">
                  {item.number}
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

      <section className="px-4 pb-12 sm:px-6 sm:pb-16 md:px-12">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-green-800 p-6 text-center text-white shadow-sm sm:p-10 md:p-12">
          <p className="text-sm font-black uppercase tracking-widest text-green-100">
            ArGadaagdo
          </p>
          <h2 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
            {t("home.finalCtaTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-semibold leading-7 text-green-50 sm:text-lg">
            {t("home.finalCtaText")}
          </p>
          <Link
            href="/offers"
            className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white px-8 py-3 text-center font-black text-green-800 transition hover:bg-green-50 sm:w-auto"
          >
            {t("common.browseOffers")}
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
