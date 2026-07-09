"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { OfferCard } from "@/components/OfferCard";
import OfferImage from "@/components/OfferImage";
import { getUserErrorMessage } from "@/lib/errors";
import { useLanguage } from "@/lib/useLanguage";
import { processExpiredMarketplace } from "@/lib/marketplaceAutomation";
import {
  compareMarketplaceOffers,
  formatMoney,
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
    launchBadge: isGeorgian
      ? "🇬🇪 უკვე ხელმისაწვდომია თბილისში"
      : "🇬🇪 Now live in Tbilisi",
    heroAccentPhrase: isGeorgian ? "კარგი საკვები" : "great food",
    reserveLabel: isGeorgian ? "დაჯავშნე" : "Reserve",
    statsBadge: isGeorgian ? "გავლენა" : "Our impact",
  };
  const testimonials = [
    {
      quote: isGeorgian
        ? "ყოველ კვირას ვზოგავ ფულს და ვამჩნევ, რომ ჩვენს რაიონში ნაკლები საკვები იფლანგება."
        : "I save money every week, and it genuinely feels like less good food is going to waste in my neighborhood.",
      name: isGeorgian ? "ნინო" : "Nino",
      location: isGeorgian ? "ვაკე, თბილისი" : "Vake, Tbilisi",
    },
    {
      quote: isGeorgian
        ? "დღის ბოლოს დარჩენილი გამოცხობილობის გაყიდვა ახლა ჩვენი ბიზნესის ჩვეულ ნაწილად იქცა."
        : "Selling our end-of-day bakes has become a normal, easy part of closing up each night.",
      name: isGeorgian ? "დავითი" : "Davit",
      location: isGeorgian ? "საბურთალო, თბილისი" : "Saburtalo bakery owner",
    },
  ];
  const marqueeItems = isGeorgian
    ? [
        "შემოწმებული თბილისური ბიზნესები",
        "მხოლოდ ადგილზე წაღება",
        "დაცული ჯავშნები",
        "ნამდვილი მომხმარებლის შეფასებები",
        "ყოველდღიური ახალი შეთავაზებები",
      ]
    : [
        "Verified Tbilisi businesses",
        "Pickup-only, zero delivery waste",
        "Secure code-based reservations",
        "Rated by real customers",
        "Fresh surprise bags daily",
      ];
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

  const [heroTitleBefore, heroTitleAfter] = homepageCopy.heroTitle.includes(
    homepageCopy.heroAccentPhrase
  )
    ? homepageCopy.heroTitle.split(homepageCopy.heroAccentPhrase)
    : [homepageCopy.heroTitle, ""];

  return (
    <main className="min-h-screen bg-[#d9d5cb] text-[#1a1815]">
      <Navbar />

      <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-12 lg:pb-28 lg:pt-20">
        <div className="premium-container relative">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="min-w-0 max-w-2xl">
              <p className="inline-flex rounded-full bg-[#f2efe6] px-4 py-2 text-sm font-semibold text-[#6b6558] shadow-[0_3px_16px_rgba(37,34,32,0.06)]">
                {homepageCopy.launchBadge}
              </p>

              <h1 className="mt-7 text-balance text-[3rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-[#1a1815] sm:text-[3.5rem] lg:text-[3.75rem]">
                {heroTitleBefore}
                <span className="text-[#5c7a5c]">
                  {homepageCopy.heroAccentPhrase}
                </span>
                {heroTitleAfter}
              </h1>

              <p className="mt-6 max-w-xl text-pretty text-base leading-[1.55] text-[#6b6558] sm:text-lg">
                {homepageCopy.heroSubtitle}
              </p>

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

              <div className="mt-10" aria-label={homepageCopy.categoriesLabel}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#6b6558]">
                  {homepageCopy.categoriesLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {categoryLinks.map((category) => (
                    <Link
                      key={category}
                      href="/offers"
                      className="rounded-full bg-[#f2efe6] px-4 py-2 text-sm font-semibold text-[#6b6558] shadow-[0_3px_16px_rgba(37,34,32,0.06)] transition hover:text-[#5c7a5c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c7a5c]"
                    >
                      {category}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative mx-auto w-full min-w-0 max-w-lg lg:mx-0">
              <div className="photo-warm-overlay relative aspect-[4/5] overflow-hidden rounded-[1.75rem] shadow-[var(--shadow-hero)] sm:aspect-[5/6]">
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#c9b89a] to-[#8a7256] text-7xl">
                  🥡
                </div>
              </div>

              {/* Floating product card: a genuine miniature offer, not decoration */}
              <Link
                href={previewOffer ? `/offers/${previewOffer.id}` : "/offers"}
                className="absolute -bottom-8 -left-4 w-[calc(100%-2rem)] max-w-xs rounded-[1.5rem] bg-[#f2efe6] p-3 shadow-[var(--shadow-hero)] transition hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c7a5c] sm:-left-8"
              >
                <div className="flex items-center gap-3">
                  <div className="photo-warm-overlay h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
                    {previewOffer ? (
                      <OfferImage
                        src={previewOffer.image_url}
                        alt={previewOffer.title}
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#c9b89a] to-[#8a7256] text-2xl">
                        🥡
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#1a1815]">
                      {previewOffer?.title || t("home.noSurpriseBags")}
                    </p>
                    <p className="truncate text-xs font-medium text-[#6b6558]">
                      {previewOffer?.businesses?.name || homepageCopy.localLabel}
                    </p>
                    <p className="mt-0.5 text-base font-bold text-[#5c7a5c]">
                      {previewOffer ? formatMoney(previewOffer.price) : "₾"}
                    </p>
                  </div>

                  <span className="premium-button shrink-0 px-4 py-2 text-xs">
                    {homepageCopy.reserveLabel}
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-8 pt-16 sm:px-6 sm:pb-10 sm:pt-20 lg:px-12">
        <div className="premium-container">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-[#6b6558]">
            {homepageCopy.statsBadge}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
            {stats.map((item, index) => (
              <div
                key={item.label}
                className={`rounded-[1.75rem] p-7 shadow-[var(--shadow-soft)] ${
                  index === 0
                    ? "bg-[#1a1815] text-white sm:col-span-2 lg:col-span-2 lg:row-span-2"
                    : "bg-[#f2efe6] text-[#1a1815]"
                }`}
              >
                <p
                  className={`font-extrabold tracking-tight ${
                    index === 0 ? "text-6xl" : "text-3xl"
                  }`}
                >
                  {item.value}
                </p>
                <p
                  className={`mt-3 text-sm font-semibold ${
                    index === 0 ? "text-white" : "text-[#1a1815]"
                  }`}
                >
                  {item.label}
                </p>
                <p
                  className={`mt-1 max-w-xs text-sm leading-[1.55] ${
                    index === 0 ? "text-white/70" : "text-[#6b6558]"
                  }`}
                >
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-12">
        <div className="premium-container">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6b6558]">
                {t("home.featuredOffers")}
              </p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.03em] text-[#1a1815] sm:text-5xl">
                {t("offers.title")}
              </h2>
              <p className="mt-3 max-w-xl leading-[1.55] text-[#6b6558]">
                {t("offers.subtitle")}
              </p>
            </div>

            <Link href="/offers" className="premium-button-secondary px-6 py-3">
              {t("common.browseOffers")}
            </Link>
          </div>

          {errorMessage && (
            <div className="mb-5 rounded-3xl bg-[#f2efe6] px-5 py-4 text-sm font-medium text-[#6b6558] shadow-[var(--shadow-soft)]">
              {errorMessage}
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-3">
            {loading && (
              <>
                <div className="h-[26rem] animate-pulse rounded-[1.75rem] bg-[#f2efe6]" />
                <div className="hidden h-[26rem] animate-pulse rounded-[1.75rem] bg-[#f2efe6] md:block" />
                <div className="hidden h-[26rem] animate-pulse rounded-[1.75rem] bg-[#f2efe6] md:block" />
              </>
            )}

            {featuredOffers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                language={language}
                detailsLabel={t("common.viewDetails")}
                ratingLabel={getRatingLabel(ratingSummaries[offer.business_id], language)}
              />
            ))}

            {!loading && offers.length === 0 && (
              <div className="rounded-[1.75rem] bg-[#f2efe6] p-10 text-center shadow-[var(--shadow-soft)] md:col-span-3">
                <h3 className="text-2xl font-extrabold tracking-tight text-[#1a1815]">
                  {t("home.noSurpriseBags")}
                </h3>
                <p className="mx-auto mt-3 max-w-lg leading-[1.55] text-[#6b6558]">
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

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-12">
        <div className="premium-container">
          <div className="grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((step) => (
              <div key={step.label}>
                <p className="text-sm font-semibold tracking-[0.1em] text-[#6b6558]">
                  {step.label}
                </p>
                <h3 className="mt-4 text-2xl font-bold tracking-tight text-[#1a1815]">
                  {step.title}
                </h3>
                <p className="mt-3 leading-[1.55] text-[#6b6558]">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-12">
        <div className="premium-container grid gap-12 md:grid-cols-2 md:gap-8">
          {testimonials.map((testimonial) => (
            <figure key={testimonial.name} className="text-center md:text-left">
              <blockquote className="text-2xl font-medium leading-[1.4] tracking-[-0.01em] text-[#1a1815] sm:text-3xl">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-5 text-sm font-semibold uppercase tracking-[0.12em] text-[#6b6558]">
                {testimonial.name} · {testimonial.location}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className="trust-marquee">
          <div className="trust-marquee__track">
            {[...marqueeItems, ...marqueeItems].map((item, index) => (
              <span
                key={`${item}-${index}`}
                className="mx-4 inline-flex items-center whitespace-nowrap text-lg font-semibold text-[#6b6558]"
              >
                {item}
                <span className="mx-4 text-[#5c7a5c]" aria-hidden="true">
                  ✦
                </span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-12">
        <div className="premium-container grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[1.75rem] bg-[#f2efe6] p-8 shadow-[var(--shadow-soft)] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#5c7a5c]">
              {t("home.customerCtaBadge")}
            </p>
            <h2 className="mt-5 text-4xl font-extrabold leading-tight tracking-[-0.03em] text-[#1a1815] sm:text-5xl">
              {t("home.customerCtaTitle")}
            </h2>
            <p className="mt-5 max-w-lg leading-[1.55] text-[#6b6558]">
              {homepageCopy.customerReason}
            </p>
            <Link href="/offers" className="mt-8 inline-flex premium-button px-8 py-3">
              {t("common.browseOffers")}
            </Link>
          </div>

          <div className="rounded-[1.75rem] bg-[#1a1815] p-8 text-white shadow-[var(--shadow-soft)] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8fae8f]">
              {t("home.businessCtaBadge")}
            </p>
            <h2 className="mt-5 text-4xl font-extrabold leading-tight tracking-[-0.03em] sm:text-5xl">
              {t("home.businessCtaTitle")}
            </h2>
            <p className="mt-5 max-w-lg leading-[1.55] text-white/70">
              {homepageCopy.businessReason}
            </p>
            <Link
              href="/business/register"
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-8 py-3 font-semibold text-[#1a1815] transition hover:bg-[#f2efe6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c7a5c]"
            >
              {t("home.registerBusiness")}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
