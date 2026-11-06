import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { WebBagCard } from "@/components/WebBagCard";
import { LeafDecor } from "@/components/design/Decor";
import type { HomeContent } from "@/components/home/AppHome";
import { LeafIcon } from "@/components/icons";
import type { Language, TranslationKey } from "@/lib/i18n";
import { translateUserMessage } from "@/lib/messageTranslations";
import {
  getOfferCategoryLabel,
  getOfferCategoryTone,
} from "@/lib/offerCategories";
import { getRatingLabel, type RatingSummary } from "@/lib/offerLifecycle";
import type { Offer } from "@/lib/types";

const accentClasses = ["bg-accent-sage", "bg-accent-honey", "bg-accent-coral"];
const eyebrowClass = "text-[13px] tracking-[0.08em] text-body";

type PublicHomeProps = {
  language: Language;
  t: (key: TranslationKey) => string;
  content: HomeContent & {
    copy: HomeContent["copy"] & { reserveLabel: string; localLabel: string };
  };
  offers: Offer[];
  featuredOffers: Offer[];
  ratingSummaries: Record<number, RatingSummary>;
  loading: boolean;
  errorMessage: string;
};

/** The home page for signed-out visitors, in the calm website style (B3Web). */
export function PublicHome({
  language,
  t,
  content,
  offers,
  featuredOffers,
  ratingSummaries,
  loading,
  errorMessage,
}: PublicHomeProps) {
  const { copy, categoryLinks, whyStats, steps, marqueeItems } = content;
  const previewOffer = featuredOffers[0];
  const ratingFor = (offer: Offer) =>
    getRatingLabel(ratingSummaries[offer.business_id], language);

  return (
    <main className="app-shell theme-web public-home">
      <Navbar variant="web" />

      <section className="theme-forest relative overflow-hidden bg-page">
        <div className="app-container grid gap-12 pb-24 pt-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-14 lg:pb-32 lg:pt-20">
          <div className="min-w-0">
            <p className="text-[13px] tracking-[0.08em] text-muted">{copy.launchBadge}</p>
            <h1 className="mt-4 max-w-2xl text-balance text-[2rem] leading-[1.25] sm:text-[2.75rem]">
              {copy.heroBefore}
              {copy.heroAccent}
              {copy.heroAfter}
            </h1>
            <p className="mt-5 max-w-[30rem] leading-[1.75] text-body">{copy.heroSubtitle}</p>

            <div className="mt-8 flex flex-wrap gap-2.5">
              <Link href="/discover" className="premium-button px-[22px] py-3">
                {copy.browseToday}
              </Link>
            </div>

            <div className="mt-9" aria-label={copy.categoriesLabel}>
              <p className="text-[13px] tracking-[0.08em] text-muted">{copy.categoriesLabel}</p>
              <div className="mt-2 flex flex-wrap gap-x-5">
                {categoryLinks.map((category) => (
                  <Link
                    key={category}
                    href={`/discover?category=${encodeURIComponent(category)}`}
                    className="flex min-h-11 min-w-11 items-center gap-2 text-sm text-body transition hover:text-cream"
                  >
                    <span
                      aria-hidden="true"
                      className={`${getOfferCategoryTone(category)} h-1.5 w-1.5 rounded-full bg-cat`}
                    />
                    {getOfferCategoryLabel(category, language)}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full min-w-0 max-w-[20rem]">
            <LeafDecor className="left-1/2 top-1/2 h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 text-brand-forest-2" />
            <div className="theme-cream relative overflow-hidden rounded-[22px] shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
              {previewOffer ? (
                <WebBagCard
                  offer={previewOffer}
                  language={language}
                  actionLabel={copy.reserveLabel}
                  ratingLabel={ratingFor(previewOffer)}
                  priority
                />
              ) : (
                <Link href="/discover" className="block p-6">
                  <p className="font-medium">{t("home.noSurpriseBags")}</p>
                  <p className="mt-1 text-sm text-body">{copy.localLabel}</p>
                </Link>
              )}
            </div>
          </div>
        </div>

        <svg
          viewBox="0 0 1280 56"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -bottom-px h-14 w-full"
        >
          <path
            d="M0 56 V34 C260 4 460 54 700 28 C940 4 1100 40 1280 20 V56 Z"
            fill="var(--brand-ground)"
          />
        </svg>
      </section>

      <section className="pb-8 pt-16 lg:pt-[72px]">
        <div className="app-container">
          <h2 className="text-[1.875rem]">{copy.whyTitle}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {whyStats.map((item, index) => (
              <div key={item.label} className="ui-card p-[26px]">
                <span className={`accent-line ${accentClasses[index % accentClasses.length]}`} />
                <p className="mt-[18px] font-serif text-3xl font-normal">{item.value}</p>
                <p className="mt-2 text-[15px] text-body">{item.label}</p>
              </div>
            ))}
          </div>
          <Link
            href="/mission"
            className="mt-5 inline-flex min-h-11 items-center font-medium text-cream underline-offset-4 hover:underline"
          >
            {copy.missionLink}
          </Link>
        </div>
      </section>

      <section className="py-12">
        <div className="app-container">
          <p className={eyebrowClass}>{copy.howItWorksBadge}</p>
          <h2 className="mt-2 text-[1.875rem]">{copy.howItWorksTitle}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.label} className="ui-card p-[26px]">
                <span className={`accent-line ${accentClasses[index % accentClasses.length]}`} />
                <p className="mt-[18px] text-[13px] text-body">{step.label}</p>
                <h3 className="mb-2 mt-1 text-lg">{step.title}</h3>
                <p className="text-[15px] text-body">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="app-container">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className={eyebrowClass}>{t("home.featuredOffers")}</p>
              <h2 className="mt-2 text-[1.875rem]">{t("offers.title")}</h2>
              <p className="mt-2 max-w-xl text-[15px] text-body">{t("offers.subtitle")}</p>
            </div>
            <Link href="/discover" className="premium-button-secondary shrink-0 px-[18px] py-2.5">
              {t("common.browseOffers")}
            </Link>
          </div>

          {errorMessage && (
            <div className="ui-card mt-6 px-5 py-4 text-sm text-body">
              {translateUserMessage(errorMessage, language)}
            </div>
          )}

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {loading && (
              <>
                <div className="h-80 animate-pulse rounded-[22px] bg-well" />
                <div className="hidden h-80 animate-pulse rounded-[22px] bg-well md:block" />
                <div className="hidden h-80 animate-pulse rounded-[22px] bg-well md:block" />
              </>
            )}

            {featuredOffers.map((offer) => (
              <WebBagCard
                key={offer.id}
                offer={offer}
                language={language}
                actionLabel={t("common.viewDetails")}
                ratingLabel={ratingFor(offer)}
              />
            ))}

            {!loading && offers.length === 0 && (
              <div className="ui-card p-10 text-center md:col-span-3">
                <LeafIcon className="mx-auto h-7 w-7 text-mint" strokeWidth={1.6} />
                <h3 className="mt-4 text-lg">{t("home.noSurpriseBags")}</h3>
                <p className="mx-auto mt-2 max-w-lg text-[15px] text-body">
                  {t("home.publishLater")}
                </p>
                <Link href="/discover" className="premium-button mt-6 px-[22px] py-3">
                  {t("common.browseOffers")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-6">
        <div className="trust-marquee">
          <div className="trust-marquee__track">
            {[...marqueeItems, ...marqueeItems].map((item, index) => (
              <span
                key={`${item}-${index}`}
                className="mx-4 inline-flex items-center whitespace-nowrap text-[15px] text-body"
              >
                {item}
                <span className="mx-4 h-1 w-1 rounded-full bg-accent-sage" aria-hidden="true" />
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-6 pt-12">
        <div className="app-container">
          <div className="theme-forest rounded-3xl bg-page p-8 text-center sm:p-14">
            <p className="text-[13px] tracking-[0.08em] text-muted">{copy.finalCtaBadge}</p>
            <h2 className="mx-auto mt-3 max-w-2xl text-[1.875rem] leading-[1.35]">
              {copy.finalCtaTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-[1.75] text-body">
              {copy.finalCtaText}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-2.5">
              <Link href="/discover" className="premium-button px-[22px] py-3">
                {copy.browseToday}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
