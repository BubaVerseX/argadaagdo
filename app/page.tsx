"use client";

import Navbar from "@/components/Navbar";
import OfferImage from "@/components/OfferImage";
import { getUserErrorMessage } from "@/lib/errors";
import { useLanguage } from "@/lib/useLanguage";
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
import { supabase } from "@/lib/supabase";
import type { Offer } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const { language, t } = useLanguage();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [ratingSummaries, setRatingSummaries] = useState<
    Record<number, RatingSummary>
  >({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadFeaturedOffers() {
      try {
        await processExpiredMarketplace();

        const [{ data, error }, summaries] = await Promise.all([
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

        if (error) {
          setErrorMessage(
            getUserErrorMessage(
              error,
              "Featured offers could not be loaded right now."
            )
          );
          setOffers([]);
          setLoading(false);
          return;
        }

        setErrorMessage("");
        setRatingSummaries(summaries);
        setOffers(
          ((data || []) as Offer[]).sort((firstOffer, secondOffer) =>
            compareMarketplaceOffers(firstOffer, secondOffer, summaries)
          )
        );
      } catch (error) {
        if (!active) return;

        setErrorMessage(
          getUserErrorMessage(
            error,
            "Featured offers could not be loaded right now."
          )
        );
        setOffers([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadFeaturedOffers();

    return () => {
      active = false;
    };
  }, []);

  const isGeorgian = language === "ka";
  const featuredOffers = offers.slice(0, 3);
  const previewOffer = featuredOffers[0];
  const secondaryPreviewOffer = featuredOffers[1];
  const categoryLinks = ["Bakery", "Cafe", "Restaurant", "Grocery", "Mixed"];
  const homepageCopy = {
    heroTitle: isGeorgian
      ? "გადაარჩინე კარგი საკვები თბილისის ადგილობრივი ბიზნესებიდან."
      : "Rescue great food from local Tbilisi businesses.",
    heroSubtitle: isGeorgian
      ? "ArGadaagdo აკავშირებს მომხმარებლებს კაფეებთან, საცხობებთან და რესტორნებთან, რომლებსაც დღის ბოლოს დარჩენილი კარგი საკვები აქვთ."
      : "ArGadaagdo connects customers with cafes, bakeries and restaurants that have good food left at the end of the day.",
    searchHint: isGeorgian
      ? "მოძებნე სიურპრიზის ყუთები თბილისში"
      : "Search surprise bags in Tbilisi",
    categoriesLabel: isGeorgian ? "პოპულარული კატეგორიები" : "Popular categories",
    browseToday: isGeorgian ? "დღევანდელი შეთავაზებები" : "Browse today's offers",
    forBusinesses: isGeorgian ? "ბიზნესებისთვის" : "For businesses",
    liveOffersLabel: isGeorgian ? "აქტიური შეთავაზებები" : "Live offers",
    verifiedLabel: isGeorgian ? "შემოწმებული ბიზნესები" : "Verified businesses",
    pickupOnlyLabel: isGeorgian ? "მხოლოდ ადგილზე წაღება" : "Pickup-only",
    localLabel: isGeorgian ? "თბილისის პილოტი" : "Tbilisi pilot",
    marketplacePreview: isGeorgian ? "მარკეტის ნახვა" : "Marketplace preview",
    pickupToday: isGeorgian ? "წაღება" : "Pickup",
    trustedByDesign: isGeorgian ? "ნდობა თავიდანვე" : "Trust built in",
    trustedByDesignText: isGeorgian
      ? "ბიზნესები მოწმდება, შეკვეთები კოდით დასტურდება."
      : "Businesses are reviewed, and pickups are verified with a code.",
    discoverTitle: isGeorgian ? "აღმოაჩინე" : "Discover",
    discoverText: isGeorgian
      ? "ნახე ახლომდებარე სიურპრიზის ყუთები ადგილობრივი ბიზნესებიდან."
      : "Browse surprise bags from local businesses near you.",
    payTitle: isGeorgian ? "დაჯავშნე" : "Pay",
    payText: isGeorgian
      ? "დაადასტურე შეთავაზება და მიიღე წაღების კოდი."
      : "Confirm your bag and get a pickup code for collection.",
    pickupTitle: isGeorgian ? "წაიღე" : "Pick up",
    pickupText: isGeorgian
      ? "ეწვიე ბიზნესს მითითებულ დროს და აჩვენე კოდი."
      : "Visit during the pickup window and show your code.",
    customerReason: isGeorgian
      ? "სიურპრიზის ყუთი კარგი საკვების უფრო ხელმისაწვდომ ფასად მიღების მარტივი გზაა."
      : "A surprise bag is a simple way to enjoy good food for less.",
    businessReason: isGeorgian
      ? "გადააქციე დღის ბოლოს დარჩენილი კარგი საკვები დამატებით შემოსავალად."
      : "Turn good end-of-day food into extra revenue.",
    footerTagline: isGeorgian
      ? "საკვების ნარჩენის შემცირება საქართველოში."
      : "Reduce food waste in Georgia.",
    saveLabel: isGeorgian ? "შენახვა" : "Save",
    noPhoto: isGeorgian ? "სიურპრიზის ყუთი" : "Surprise bag",
  };
  const stats = [
    {
      value: loading ? "..." : `${offers.length}`,
      label: homepageCopy.liveOffersLabel,
      text: t("home.publishLater"),
    },
    {
      value: "✓",
      label: homepageCopy.verifiedLabel,
      text: t("home.trustCardVerifiedText"),
    },
    {
      value: "Code",
      label: homepageCopy.pickupOnlyLabel,
      text: homepageCopy.trustedByDesignText,
    },
  ];
  const steps = [
    {
      label: "01",
      title: homepageCopy.discoverTitle,
      text: homepageCopy.discoverText,
    },
    {
      label: "02",
      title: homepageCopy.payTitle,
      text: homepageCopy.payText,
    },
    {
      label: "03",
      title: homepageCopy.pickupTitle,
      text: homepageCopy.pickupText,
    },
  ];
  const footerLinks = [
    { href: "/offers", label: t("nav.offers") },
    { href: "/business/register", label: t("nav.forBusiness") },
    { href: "/faq", label: t("nav.faq") },
    { href: "/contact", label: t("nav.contact") },
    { href: "/privacy", label: t("nav.privacy") },
    { href: "/terms", label: t("nav.terms") },
  ];

  return (
    <main className="min-h-screen bg-[#fbfaf6] text-gray-950">
      <Navbar />

      <section className="relative overflow-hidden px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:px-12 lg:pb-24 lg:pt-20">
        <div className="pointer-events-none absolute left-1/2 top-8 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-green-100/55 blur-3xl" />
        <div className="pointer-events-none absolute right-10 top-28 hidden h-36 w-36 rounded-full border border-green-200/70 lg:block" />
        <div className="pointer-events-none absolute bottom-20 left-12 hidden h-28 w-28 rounded-[2rem] border border-black/5 lg:block" />

        <div className="premium-container relative">
          <div className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div className="max-w-3xl">
              <p className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-green-700 shadow-[0_10px_35px_rgba(20,20,20,0.06)] ring-1 ring-black/5">
                {t("home.badge")}
              </p>

              <h1 className="mt-7 text-balance text-5xl font-black leading-[0.95] tracking-[-0.06em] text-gray-950 sm:text-6xl lg:text-7xl xl:text-8xl">
                {homepageCopy.heroTitle}
              </h1>

              <p className="mt-6 max-w-2xl text-pretty text-base font-semibold leading-7 text-gray-600 sm:text-lg">
                {homepageCopy.heroSubtitle}
              </p>

              <div className="mt-8 max-w-2xl rounded-[2rem] bg-white p-2 shadow-[0_24px_90px_rgba(20,20,20,0.09)] ring-1 ring-black/5">
                <Link
                  href="/offers"
                  className="group flex min-h-16 flex-col gap-4 rounded-[1.55rem] px-5 py-4 text-left transition hover:bg-[#f7f6ef] focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  aria-label={t("common.browseOffers")}
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-black uppercase tracking-[0.22em] text-green-700">
                      {homepageCopy.marketplacePreview}
                    </span>
                    <span className="mt-1 block truncate text-lg font-black text-gray-950 sm:text-xl">
                      {homepageCopy.searchHint}
                    </span>
                  </span>
                  <span className="inline-flex min-h-12 items-center justify-center rounded-full bg-green-700 px-6 font-black text-white transition group-hover:bg-green-800">
                    {homepageCopy.browseToday}
                  </span>
                </Link>
              </div>

              <div className="mt-6" aria-label={homepageCopy.categoriesLabel}>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-gray-400">
                  {homepageCopy.categoriesLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {categoryLinks.map((category) => (
                    <Link
                      key={category}
                      href="/offers"
                      className="rounded-full bg-white px-4 py-2 text-sm font-black text-gray-700 shadow-sm ring-1 ring-black/5 transition hover:text-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700"
                    >
                      {category}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/offers" className="premium-button px-8 py-3.5">
                  {homepageCopy.browseToday}
                </Link>
                <Link
                  href="/business/register"
                  className="premium-button-secondary px-8 py-3.5"
                >
                  {homepageCopy.forBusinesses}
                </Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:mx-0">
              <div className="absolute -left-5 top-10 hidden h-24 w-24 rounded-full bg-green-100/80 blur-2xl sm:block" />
              <div className="absolute -right-4 bottom-10 hidden h-28 w-28 rounded-full bg-gray-200/70 blur-3xl sm:block" />

              <div className="relative rounded-[2.5rem] bg-white p-4 shadow-[0_30px_100px_rgba(20,20,20,0.11)] ring-1 ring-black/5">
                <div className="flex items-center justify-between px-2 pb-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-green-700">
                      {homepageCopy.marketplacePreview}
                    </p>
                    <p className="mt-1 text-sm font-bold text-gray-500">
                      {homepageCopy.localLabel}
                    </p>
                  </div>
                  <span className="rounded-full bg-green-50 px-4 py-2 text-sm font-black text-green-800">
                    {loading ? "..." : `${offers.length} ${homepageCopy.liveOffersLabel}`}
                  </span>
                </div>

                <Link
                  href={previewOffer ? `/offers/${previewOffer.id}` : "/offers"}
                  className="group block overflow-hidden rounded-[2rem] bg-[#f2f4ec] focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700"
                >
                  <div className="relative h-72 overflow-hidden">
                    {previewOffer ? (
                      <OfferImage
                        src={previewOffer.image_url}
                        alt={previewOffer.title}
                        sizes="(max-width: 1024px) 100vw, 520px"
                        className="transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[#eef1e8] text-lg font-black text-green-800">
                        {homepageCopy.noPhoto}
                      </div>
                    )}
                    <div className="absolute left-4 top-4 rounded-full bg-white/95 px-4 py-2 text-xs font-black uppercase tracking-widest text-green-700 shadow-sm">
                      {previewOffer
                        ? normalizeOfferCategory(previewOffer.category)
                        : homepageCopy.verifiedLabel}
                    </div>
                    <div className="absolute bottom-4 left-4 rounded-full bg-white/95 px-4 py-2 text-sm font-black text-gray-900 shadow-sm">
                      {previewOffer
                        ? `${homepageCopy.pickupToday} ${getOfferDateLabel(
                            previewOffer,
                            language
                          )}`
                        : homepageCopy.pickupOnlyLabel}
                    </div>
                  </div>

                  <div className="bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="truncate text-2xl font-black tracking-tight text-gray-950">
                          {previewOffer?.title || t("home.noSurpriseBags")}
                        </h2>
                        <p className="mt-1 truncate font-bold text-gray-500">
                          {previewOffer?.businesses?.name || t("home.publishLater")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black text-green-700">
                          {previewOffer ? formatMoney(previewOffer.price) : "₾"}
                        </p>
                        {previewOffer?.old_price && (
                          <p className="text-sm font-bold text-gray-400 line-through">
                            {formatMoney(previewOffer.old_price)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_0.78fr]">
                  <div className="rounded-[1.5rem] bg-[#fbfaf6] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                      {homepageCopy.trustedByDesign}
                    </p>
                    <p className="mt-2 text-sm font-bold leading-6 text-gray-700">
                      {homepageCopy.trustedByDesignText}
                    </p>
                  </div>

                  <Link
                    href={secondaryPreviewOffer ? `/offers/${secondaryPreviewOffer.id}` : "/offers"}
                    className="rounded-[1.5rem] bg-gray-950 p-4 text-white transition hover:bg-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700"
                  >
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-green-200">
                      {secondaryPreviewOffer
                        ? normalizeOfferCategory(secondaryPreviewOffer.category)
                        : homepageCopy.pickupOnlyLabel}
                    </p>
                    <p className="mt-2 line-clamp-2 text-lg font-black leading-tight">
                      {secondaryPreviewOffer?.title || homepageCopy.businessReason}
                    </p>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 sm:py-10 lg:px-12">
        <div className="premium-container">
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-[1.75rem] bg-white p-6 shadow-[0_16px_50px_rgba(20,20,20,0.05)] ring-1 ring-black/5"
              >
                <p className="text-3xl font-black tracking-tight text-gray-950">
                  {item.value}
                </p>
                <p className="mt-2 text-sm font-black text-gray-900">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-gray-500">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-12">
        <div className="premium-container">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-green-700">
                {t("home.featuredOffers")}
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] text-gray-950 sm:text-5xl">
                {t("offers.title")}
              </h2>
              <p className="mt-3 max-w-xl font-semibold leading-7 text-gray-600">
                {t("offers.subtitle")}
              </p>
            </div>

            <Link href="/offers" className="premium-button-secondary px-6 py-3">
              {t("common.browseOffers")}
            </Link>
          </div>

          {errorMessage && (
            <div className="mb-5 rounded-3xl bg-white px-5 py-4 text-sm font-bold text-gray-600 shadow-sm ring-1 ring-green-100">
              {errorMessage}
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-3">
            {loading && (
              <>
                <div className="h-[28rem] animate-pulse rounded-[2rem] bg-white" />
                <div className="hidden h-[28rem] animate-pulse rounded-[2rem] bg-white md:block" />
                <div className="hidden h-[28rem] animate-pulse rounded-[2rem] bg-white md:block" />
              </>
            )}

            {featuredOffers.map((offer) => (
              <article
                key={offer.id}
                className="group overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_80px_rgba(20,20,20,0.08)] ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-[0_30px_100px_rgba(20,20,20,0.12)]"
              >
                <div className="relative h-72 overflow-hidden bg-[#eef1e8]">
                  <OfferImage
                    src={offer.image_url}
                    alt={offer.title}
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="transition duration-500 group-hover:scale-105"
                  />

                  <div className="absolute left-4 top-4 rounded-full bg-white/95 px-4 py-2 text-xs font-black uppercase tracking-widest text-green-700 shadow-sm">
                    {normalizeOfferCategory(offer.category)}
                  </div>

                  <Link
                    href={`/offers/${offer.id}`}
                    className="absolute right-4 top-4 rounded-full bg-white/95 px-4 py-2 text-xs font-black text-gray-800 shadow-sm transition hover:text-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700"
                    aria-label={`${homepageCopy.saveLabel} ${offer.title}`}
                  >
                    {homepageCopy.saveLabel}
                  </Link>
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between gap-5">
                    <div className="min-w-0">
                      <h3 className="text-2xl font-black leading-tight tracking-tight text-gray-950">
                        {offer.title}
                      </h3>
                      <p className="mt-2 truncate font-bold text-gray-600">
                        {offer.businesses?.name}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-3xl font-black tracking-tight text-green-700">
                        {formatMoney(offer.price)}
                      </p>
                      {offer.old_price && (
                        <p className="text-sm font-bold text-gray-400 line-through">
                          {formatMoney(offer.old_price)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#f7f6ef] px-3 py-2 text-sm font-black text-gray-700">
                      {getOfferDateLabel(offer, language)}
                    </span>
                    <span className="rounded-full bg-[#f7f6ef] px-3 py-2 text-sm font-black text-gray-700">
                      {formatPickupWindow(offer, language)}
                    </span>
                    <span className="rounded-full bg-green-50 px-3 py-2 text-sm font-black text-green-800">
                      {offer.quantity} {t("offers.boxesLeft")}
                    </span>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-4">
                    <p className="text-sm font-black text-gray-500">
                      {getRatingLabel(ratingSummaries[offer.business_id], language)}
                    </p>
                    <Link
                      href={`/offers/${offer.id}`}
                      className="rounded-full bg-gray-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700"
                    >
                      {t("common.viewDetails")}
                    </Link>
                  </div>
                </div>
              </article>
            ))}

            {!loading && offers.length === 0 && (
              <div className="rounded-[2rem] bg-white p-10 text-center shadow-sm ring-1 ring-black/5 md:col-span-3">
                <h3 className="text-2xl font-black tracking-tight text-gray-950">
                  {t("home.noSurpriseBags")}
                </h3>
                <p className="mx-auto mt-3 max-w-lg font-semibold leading-7 text-gray-600">
                  {t("home.publishLater")}
                </p>
                <Link href="/offers" className="mt-6 inline-flex premium-button px-7 py-3">
                  {t("common.browseOffers")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-12">
        <div className="premium-container">
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.label}
                className="rounded-[2rem] bg-white p-7 shadow-[0_18px_60px_rgba(20,20,20,0.06)] ring-1 ring-black/5"
              >
                <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-full bg-gray-950 text-sm font-black text-white">
                  {step.label}
                </div>
                <h3 className="text-2xl font-black tracking-tight text-gray-950">
                  {step.title}
                </h3>
                <p className="mt-3 font-semibold leading-7 text-gray-600">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-12">
        <div className="premium-container grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2.25rem] bg-white p-8 shadow-[0_24px_80px_rgba(20,20,20,0.08)] ring-1 ring-black/5 sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-green-700">
              {t("home.customerCtaBadge")}
            </p>
            <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.04em] text-gray-950 sm:text-5xl">
              {t("home.customerCtaTitle")}
            </h2>
            <p className="mt-5 max-w-lg font-semibold leading-7 text-gray-600">
              {homepageCopy.customerReason}
            </p>
            <Link href="/offers" className="mt-8 inline-flex premium-button px-8 py-3">
              {t("common.browseOffers")}
            </Link>
          </div>

          <div className="rounded-[2.25rem] bg-gray-950 p-8 text-white shadow-[0_24px_80px_rgba(20,20,20,0.12)] sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-green-300">
              {t("home.businessCtaBadge")}
            </p>
            <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
              {t("home.businessCtaTitle")}
            </h2>
            <p className="mt-5 max-w-lg font-semibold leading-7 text-gray-300">
              {homepageCopy.businessReason}
            </p>
            <Link
              href="/business/register"
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-8 py-3 font-black text-gray-950 transition hover:bg-green-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
            >
              {t("home.registerBusiness")}
            </Link>
          </div>
        </div>
      </section>

      <footer className="px-4 pb-10 pt-8 sm:px-6 lg:px-12">
        <div className="premium-container rounded-[2rem] bg-white px-6 py-8 shadow-sm ring-1 ring-black/5 sm:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <Link
                href="/"
                className="text-xl font-black tracking-[-0.04em] text-gray-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700"
              >
                ArGadaagdo
              </Link>
              <p className="mt-2 text-sm font-semibold text-gray-500">
                {homepageCopy.footerTagline}
              </p>
            </div>

            <nav
              className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-black text-gray-600"
              aria-label="Homepage footer"
            >
              {footerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition hover:text-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}
