import Link from "next/link";
import { BagCard } from "@/components/BagCard";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { LeafDecor } from "@/components/design/Decor";
import { LeafIcon } from "@/components/icons";
import type { Language, TranslationKey } from "@/lib/i18n";
import { translateUserMessage } from "@/lib/messageTranslations";
import {
  getOfferCategoryLabel,
  getOfferCategoryTone,
} from "@/lib/offerCategories";
import { getRatingLabel, type RatingSummary } from "@/lib/offerLifecycle";
import type { Offer } from "@/lib/types";

export type HomeContent = {
  copy: {
    launchBadge: string;
    heroBefore: string;
    heroAccent: string;
    heroAfter: string;
    heroSubtitle: string;
    browseToday: string;
    categoriesLabel: string;
    whyTitle: string;
    missionLink: string;
    missionLine: string;
    howItWorksBadge: string;
    howItWorksTitle: string;
    finalCtaBadge: string;
    finalCtaTitle: string;
    finalCtaText: string;
  };
  categoryLinks: string[];
  whyStats: Array<{ value: string; label: string }>;
  steps: Array<{ label: string; title: string; text: string }>;
  marqueeItems: string[];
};

type AppHomeProps = {
  language: Language;
  t: (key: TranslationKey) => string;
  content: HomeContent;
  offers: Offer[];
  featuredOffers: Offer[];
  ratingSummaries: Record<number, RatingSummary>;
  loading: boolean;
  errorMessage: string;
};

const stepTones = ["cat-produce", "cat-bakery", "cat-deli"];

/** The home screen for signed-in users, in the colourful app style (B3Home). */
export function AppHome({
  language,
  t,
  content,
  offers,
  featuredOffers,
  ratingSummaries,
  loading,
  errorMessage,
}: AppHomeProps) {
  const { copy, categoryLinks, steps, marqueeItems } =
    content;
  const [heroOffer, ...moreOffers] = featuredOffers;
  const ratingFor = (offer: Offer) =>
    getRatingLabel(ratingSummaries[offer.business_id], language);

  return (
    <main className="app-shell">
      <Navbar />

      <section className="relative overflow-x-clip">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-px bottom-24 bg-brand-forest lg:bottom-16"
        >
          <LeafDecor className="-right-10 -top-8 h-56 w-56 text-brand-forest-2 lg:right-[8%] lg:h-96 lg:w-96" />
          <svg
            viewBox="0 0 390 70"
            preserveAspectRatio="none"
            className="absolute left-0 top-[calc(100%-1px)] h-[70px] w-full"
          >
            <path
              d="M0 0 H390 V22 C300 70 210 0 120 34 C70 52 30 50 0 38 Z"
              fill="var(--brand-forest)"
            />
          </svg>
        </div>

        <div className="app-container relative grid gap-7 pt-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12 lg:pt-10">
          <div className="theme-forest min-w-0 lg:pb-20">
            <p className="text-sm text-body">{copy.launchBadge}</p>

            <h1 className="mt-3 max-w-2xl font-serif text-[1.8125rem] font-bold leading-[1.25] sm:text-4xl lg:text-5xl">
              {copy.heroBefore}
              <span className="text-brand-honey">{copy.heroAccent}</span>
              {copy.heroAfter}
            </h1>

            <div className="mt-5" aria-label={copy.categoriesLabel}>
              <p className="mb-2.5 text-xs font-medium text-body">{copy.categoriesLabel}</p>
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
                {categoryLinks.map((category) => (
                  <Link
                    key={category}
                    href={`/discover?category=${encodeURIComponent(category)}`}
                    className={`${getOfferCategoryTone(
                      category
                    )} flex min-h-11 flex-none items-center rounded-full bg-cat px-4 text-[13px] font-medium text-cat-ink transition hover:brightness-95`}
                  >
                    {getOfferCategoryLabel(category, language)}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="min-w-0">
            {loading && !heroOffer && (
              <div className="h-64 animate-pulse rounded-[28px] bg-well" />
            )}
            {heroOffer && (
              <BagCard
                offer={heroOffer}
                language={language}
                detailsLabel={t("common.viewDetails")}
                ratingLabel={ratingFor(heroOffer)}
                layout="hero"
                priority
              />
            )}
          </div>
        </div>
      </section>

      <section className="relative pt-6 lg:pt-20">
        <div className="app-container flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
          <p className="max-w-xl text-sm leading-relaxed text-body sm:text-base">
            {copy.heroSubtitle}
          </p>
          <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row">
            <Link href="/discover" className="premium-button rounded-[18px] px-6 py-3 font-bold">
              {copy.browseToday}
            </Link>
          </div>
        </div>
      </section>

      <section className="pt-5">
        <p className="app-container text-sm text-body">
          {copy.missionLine}{" "}
          <Link href="/mission" className="inline-flex min-h-11 items-center font-bold text-brand-forest underline-offset-4 hover:underline">
            {copy.missionLink}
          </Link>
        </p>
      </section>

      <section className="pb-10 pt-10">
        <div className="app-container">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium text-body">{t("home.featuredOffers")}</p>
              <h2 className="mt-1 font-serif text-lg font-bold sm:text-2xl lg:text-3xl">
                {t("offers.title")}
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-body">
                {t("offers.subtitle")}
              </p>
            </div>

            <Link
              href="/discover"
              className="inline-flex min-h-11 shrink-0 items-center self-start font-bold text-brand-forest underline-offset-4 hover:underline sm:self-auto"
            >
              {t("common.browseOffers")}
            </Link>
          </div>

          {errorMessage && (
            <div className="ui-card mt-4 rounded-3xl px-5 py-4 text-sm font-medium text-body">
              {translateUserMessage(errorMessage, language)}
            </div>
          )}

          {!loading && offers.length === 0 && (
            <div className="ui-card mt-5 rounded-[28px] p-8 text-center sm:p-10">
              <div className="ui-well mx-auto flex h-16 w-16 items-center justify-center rounded-full">
                <LeafIcon className="h-7 w-7 text-mint" strokeWidth={1.6} />
              </div>
              <h3 className="mt-5 font-serif text-2xl font-bold">{t("home.noSurpriseBags")}</h3>
              <p className="mx-auto mt-3 max-w-lg leading-[1.55] text-body">
                {t("home.publishLater")}
              </p>
              <Link href="/discover" className="premium-button mt-6 px-7 py-3">
                {t("common.browseOffers")}
              </Link>
            </div>
          )}

          {moreOffers.length > 0 && (
            <div className="no-scrollbar -mx-4 mt-4 flex gap-2.5 overflow-x-auto px-4 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:px-0">
              {moreOffers.map((offer) => (
                <BagCard
                  key={offer.id}
                  offer={offer}
                  language={language}
                  detailsLabel={t("common.viewDetails")}
                  ratingLabel={ratingFor(offer)}
                  className="w-[15.5rem] flex-none lg:w-auto"
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-10">
        <div className="app-container">
          <p className="text-xs font-medium text-body">{copy.howItWorksBadge}</p>
          <h2 className="mt-1 font-serif text-2xl font-bold lg:text-3xl">{copy.howItWorksTitle}</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={step.label}
                className={`${stepTones[index % stepTones.length]} rounded-3xl bg-cat p-6 text-cat-ink`}
              >
                <p className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-forest text-sm font-bold text-brand-ground">
                  {step.label}
                </p>
                <h3 className="mt-4 font-serif text-xl font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-[1.55] text-cat-ink-2">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-6">
        <div className="trust-marquee">
          <div className="trust-marquee__track">
            {[...marqueeItems, ...marqueeItems].map((item, index) => (
              <span
                key={`${item}-${index}`}
                className="mx-4 inline-flex items-center whitespace-nowrap font-medium text-body"
              >
                {item}
                <span className="mx-4 h-1.5 w-1.5 rounded-full bg-brand-honey" aria-hidden="true" />
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="app-container">
          <div className="theme-forest relative overflow-hidden rounded-[28px] bg-brand-forest p-8 text-center sm:p-14">
            <LeafDecor className="-bottom-16 -left-12 h-64 w-64 text-brand-forest-2" />
            <div className="relative">
              <p className="text-xs font-medium text-body">{copy.finalCtaBadge}</p>
              <h2 className="mx-auto mt-3 max-w-2xl font-serif text-3xl font-bold leading-[1.25] lg:text-4xl">
                {copy.finalCtaTitle}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-body sm:text-base">
                {copy.finalCtaText}
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
                <Link href="/discover" className="premium-button w-full rounded-[18px] px-7 py-3 font-bold sm:w-auto">
                  {copy.browseToday}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
