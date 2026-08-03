"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { OfferCard } from "@/components/OfferCard";
import OfferImage from "@/components/OfferImage";
import { ShoppingBagIcon } from "@/components/icons";
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
    categoriesLabel: isGeorgian ? "პოპულარული კატეგორიები" : "Popular categories",
    browseToday: isGeorgian ? "შეთავაზებების ნახვა" : "Browse offers",
    listSurplus: isGeorgian ? "განათავსე ჭარბი საკვები" : "List your surplus",
    localLabel: isGeorgian ? "თბილისის პილოტი" : "Tbilisi pilot",
    discoverTitle: isGeorgian ? "აღმოაჩინე" : "Discover",
    discoverText: isGeorgian
      ? "დაათვალიერე თბილისის საყვარელი ბიზნესების სიურპრიზის ყუთები, სანამ გაქრება."
      : "Spot surprise bags from real Tbilisi favorites before they're gone.",
    reserveTitle: isGeorgian ? "დაჯავშნე" : "Reserve",
    reserveText: isGeorgian
      ? "გადაიხადე უსაფრთხოდ ერთი შეხებით და მაშინვე მიიღე წაღების კოდი."
      : "Pay securely in a tap and get your pickup code instantly.",
    collectTitle: isGeorgian ? "წაიღე" : "Collect",
    collectText: isGeorgian
      ? "ეწვიე მითითებულ დროს, აჩვენე კოდი და ისიამოვნე საკვებით."
      : "Swing by during the pickup window, show your code, and dig in.",
    howItWorksBadge: isGeorgian ? "როგორ მუშაობს" : "How it works",
    howItWorksTitle: isGeorgian
      ? "სამი ნაბიჯი შენს შემდეგ საუკეთესო შეთავაზებამდე."
      : "Three steps to your next great deal.",
    launchBadge: isGeorgian
      ? "🇬🇪 უკვე ხელმისაწვდომია თბილისში"
      : "🇬🇪 Now live in Tbilisi",
    heroAccentPhrase: isGeorgian ? "კარგი საკვები" : "great food",
    reserveLabel: isGeorgian ? "დაჯავშნე" : "Reserve",
    statsBadge: isGeorgian ? "გავლენა" : "Our impact",
    businessLearnMore: isGeorgian ? "გაიგე, როგორ მუშაობს" : "See how it works",
    finalCtaBadge: isGeorgian ? "მზად ხარ, როცა მოისურვებ" : "Ready when you are",
    finalCtaTitle: isGeorgian
      ? "შენი შემდეგი გემრიელი კერძი უკვე გელოდება."
      : "Your next great meal is already waiting.",
    finalCtaText: isGeorgian
      ? "შემოუერთდი თბილისელებს, რომლებიც უკვე ზოგავენ თანხას და გადაარჩენენ საკვებს — ან განათავსე ჭარბი საკვები და აქციე ის შემოსავლად."
      : "Join the Tbilisi customers already saving money and rescuing food, or list your surplus and turn it into revenue.",
    finalCtaSecondary: isGeorgian ? "დაამატე შენი ბიზნესი" : "List your business",
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
      value: "100%",
      label: isGeorgian ? "მხოლოდ ადგილზე წაღება" : "Pickup-only, always",
      text: isGeorgian
        ? "არანაირი მიწოდების შეფუთვა და ზედმეტი ემისია — მხოლოდ საკვები, რომელიც ჭამენ ნაგვის ნაცვლად."
        : "No delivery packaging, no extra emissions — just food that gets eaten instead of thrown away.",
    },
    {
      value: "90%",
      label: isGeorgian ? "ბიზნესთან რჩება" : "Stays with the business",
      text: isGeorgian
        ? "10%-იან საკომისიოს ვიღებთ მხოლოდ გაყიდვისას — ჭარბი საკვები რეალურ შემოსავლად იქცევა."
        : "We take a 10% commission only when a bag actually sells — surplus food becomes real revenue.",
    },
    {
      value: isGeorgian ? "თბილისი" : "Tbilisi",
      label: isGeorgian ? "საიდანაც ვიწყებთ" : "Where we're starting",
      text: isGeorgian
        ? "ყველა ბიზნესი ხელით მოწმდება გამოქვეყნებამდე — ვიწყებთ ერთი ქალაქიდან, გააზრებულად."
        : "Every business is reviewed by hand before going live — starting local, on purpose.",
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
      title: homepageCopy.reserveTitle,
      text: homepageCopy.reserveText,
    },
    {
      label: "03",
      title: homepageCopy.collectTitle,
      text: homepageCopy.collectText,
    },
  ];
  const businessSolutions = [
    {
      title: t("forBusinesses.solutionListTitle"),
      text: t("forBusinesses.solutionListText"),
    },
    {
      title: t("forBusinesses.solutionReachTitle"),
      text: t("forBusinesses.solutionReachText"),
    },
    {
      title: t("forBusinesses.solutionRecoverTitle"),
      text: t("forBusinesses.solutionRecoverText"),
    },
  ];

  const [heroTitleBefore, heroTitleAfter] = homepageCopy.heroTitle.includes(
    homepageCopy.heroAccentPhrase
  )
    ? homepageCopy.heroTitle.split(homepageCopy.heroAccentPhrase)
    : [homepageCopy.heroTitle, ""];

  return (
    <main className="app-shell">
      <Navbar />

      <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-12 lg:pb-28 lg:pt-20">
        <div className="premium-container relative">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="min-w-0 max-w-2xl">
              <p className="soft-raised inline-flex rounded-full px-4 py-2 text-sm font-semibold text-[#6b6152]">
                {homepageCopy.launchBadge}
              </p>

              <h1 className="mt-7 text-balance text-[3rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-[#2e2a22] sm:text-[3.5rem] lg:text-[3.75rem]">
                {heroTitleBefore}
                <span className="text-[#a67c52]">
                  {homepageCopy.heroAccentPhrase}
                </span>
                {heroTitleAfter}
              </h1>

              <p className="mt-6 max-w-xl text-pretty text-base leading-[1.55] text-[#6b6152] sm:text-lg">
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
                  {homepageCopy.listSurplus}
                </Link>
              </div>

              <div className="mt-10" aria-label={homepageCopy.categoriesLabel}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#6b6152]">
                  {homepageCopy.categoriesLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {categoryLinks.map((category) => (
                    <Link
                      key={category}
                      href="/offers"
                      className="soft-raised flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-semibold text-[#6b6152] transition hover:text-[#a67c52] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a67c52]"
                    >
                      {category}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative mx-auto w-full min-w-0 max-w-lg lg:mx-0">
              <div className="soft-raised photo-warm-overlay blob-mask relative isolate aspect-[4/5] overflow-hidden sm:aspect-[5/6]">
                <OfferImage
                  src={previewOffer?.image_url}
                  alt={previewOffer?.title || homepageCopy.heroAccentPhrase}
                  sizes="(min-width: 1024px) 32rem, 90vw"
                  priority
                />
              </div>

              {/* Floating product card: a genuine miniature offer, not decoration */}
              <Link
                href={previewOffer ? `/offers/${previewOffer.id}` : "/offers"}
                className="soft-raised absolute -bottom-8 -left-4 w-[calc(100%-2rem)] max-w-xs rounded-[1.5rem] p-3 transition hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a67c52] sm:-left-8"
              >
                <div className="flex items-center gap-3">
                  <div className="soft-raised photo-warm-overlay blob-mask-2 h-16 w-16 shrink-0 overflow-hidden">
                    {previewOffer ? (
                      <OfferImage
                        src={previewOffer.image_url}
                        alt={previewOffer.title}
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#f4efe4]">
                        <ShoppingBagIcon className="h-6 w-6 text-[#8a8072]" strokeWidth={1.6} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#2e2a22]">
                      {previewOffer?.title || t("home.noSurpriseBags")}
                    </p>
                    <p className="truncate text-xs font-medium text-[#6b6152]">
                      {previewOffer?.businesses?.name || homepageCopy.localLabel}
                    </p>
                    <p className="mt-0.5 text-base font-bold text-[#a67c52]">
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
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-[#6b6152]">
            {homepageCopy.statsBadge}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
            {stats.map((item, index) => (
              <div
                key={item.label}
                className={`soft-raised rounded-[1.75rem] p-7 ${
                  index === 0 ? "sm:col-span-2 lg:col-span-2 lg:row-span-2" : ""
                }`}
              >
                <p
                  className={`font-extrabold tracking-[-0.03em] text-[#2e2a22] ${
                    index === 0 ? "text-6xl" : "text-3xl"
                  }`}
                >
                  {item.value}
                </p>
                <p className="mt-3 text-sm font-semibold text-[#2e2a22]">
                  {item.label}
                </p>
                <p className="mt-1 max-w-xs text-sm leading-[1.55] text-[#6b6152]">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-12">
        <div className="premium-container">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6b6152]">
            {homepageCopy.howItWorksBadge}
          </p>
          <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.03em] text-[#2e2a22] sm:text-5xl">
            {homepageCopy.howItWorksTitle}
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3 md:gap-6">
            {steps.map((step) => (
              <div key={step.label} className="soft-raised rounded-[1.5rem] p-6">
                <p className="text-sm font-semibold tracking-[0.1em] text-[#a67c52]">
                  {step.label}
                </p>
                <h3 className="mt-4 text-2xl font-bold tracking-[-0.02em] text-[#2e2a22]">
                  {step.title}
                </h3>
                <p className="mt-3 leading-[1.55] text-[#6b6152]">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-12">
        <div className="premium-container">
          <div className="rounded-[1.75rem] bg-[#2e2a22] p-8 text-white shadow-[var(--shadow-soft)] sm:p-10 lg:p-14">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#c9a880]">
                  {t("forBusinesses.problemBadge")}
                </p>
                <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-[-0.03em] sm:text-5xl">
                  {t("forBusinesses.heroTitle")}
                </h2>
                <p className="mt-5 max-w-lg leading-[1.55] text-white/70">
                  {t("forBusinesses.problemText")}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/for-businesses"
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-8 py-3 font-semibold text-[#2e2a22] transition hover:bg-[#ece4d6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a67c52]"
                  >
                    {homepageCopy.businessLearnMore}
                  </Link>
                  <Link
                    href="/business/register"
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/30 px-8 py-3 font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {t("home.registerBusiness")}
                  </Link>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {businessSolutions.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[1.5rem] bg-white/10 p-6"
                  >
                    <h3 className="text-lg font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-[1.55] text-white/70">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-12">
        <div className="premium-container">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6b6152]">
                {t("home.featuredOffers")}
              </p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.03em] text-[#2e2a22] sm:text-5xl">
                {t("offers.title")}
              </h2>
              <p className="mt-3 max-w-xl leading-[1.55] text-[#6b6152]">
                {t("offers.subtitle")}
              </p>
            </div>

            <Link href="/offers" className="premium-button-secondary px-6 py-3">
              {t("common.browseOffers")}
            </Link>
          </div>

          {errorMessage && (
            <div className="soft-raised mb-5 rounded-3xl px-5 py-4 text-sm font-medium text-[#6b6152]">
              {errorMessage}
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-3">
            {loading && (
              <>
                <div className="h-[26rem] animate-pulse rounded-[1.75rem] bg-[#f4efe4]" />
                <div className="hidden h-[26rem] animate-pulse rounded-[1.75rem] bg-[#f4efe4] md:block" />
                <div className="hidden h-[26rem] animate-pulse rounded-[1.75rem] bg-[#f4efe4] md:block" />
              </>
            )}

            {featuredOffers.map((offer, index) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                language={language}
                detailsLabel={t("common.viewDetails")}
                ratingLabel={getRatingLabel(ratingSummaries[offer.business_id], language)}
                priority={index === 0}
              />
            ))}

            {!loading && offers.length === 0 && (
              <div className="soft-raised rounded-[1.75rem] p-10 text-center md:col-span-3">
                <div className="soft-pressed mx-auto flex h-16 w-16 items-center justify-center rounded-full">
                  <ShoppingBagIcon className="h-7 w-7 text-[#a67c52]" strokeWidth={1.6} />
                </div>
                <h3 className="mt-5 text-2xl font-extrabold tracking-[-0.02em] text-[#2e2a22]">
                  {t("home.noSurpriseBags")}
                </h3>
                <p className="mx-auto mt-3 max-w-lg leading-[1.55] text-[#6b6152]">
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
        <div className="premium-container grid gap-6 md:grid-cols-2 md:gap-6">
          {testimonials.map((testimonial) => (
            <figure key={testimonial.name} className="soft-raised rounded-[1.75rem] p-8">
              <blockquote className="text-2xl font-medium leading-[1.4] tracking-[-0.01em] text-[#2e2a22] sm:text-3xl">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#a67c52] text-base font-bold text-white">
                  {testimonial.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="text-sm font-semibold text-[#6b6152]">
                  <p className="text-[#2e2a22]">{testimonial.name}</p>
                  <p>{testimonial.location}</p>
                </div>
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
                className="mx-4 inline-flex items-center whitespace-nowrap text-lg font-semibold text-[#6b6152]"
              >
                {item}
                <span
                  className="mx-4 h-1.5 w-1.5 rounded-full bg-[#a67c52]"
                  aria-hidden="true"
                />
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-12">
        <div className="premium-container">
          <div className="rounded-[1.75rem] bg-[#2e2a22] p-10 text-center text-white shadow-[var(--shadow-soft)] sm:p-14">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#c9a880]">
              {homepageCopy.finalCtaBadge}
            </p>
            <h2 className="mx-auto mt-5 max-w-2xl text-4xl font-extrabold leading-tight tracking-[-0.03em] sm:text-5xl">
              {homepageCopy.finalCtaTitle}
            </h2>
            <p className="mx-auto mt-5 max-w-xl leading-[1.55] text-white/70">
              {homepageCopy.finalCtaText}
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/offers"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-8 py-3.5 font-semibold text-[#2e2a22] transition hover:bg-[#ece4d6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a67c52]"
              >
                {homepageCopy.browseToday}
              </Link>
              <Link
                href="/for-businesses"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/30 px-8 py-3.5 font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {homepageCopy.finalCtaSecondary}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
