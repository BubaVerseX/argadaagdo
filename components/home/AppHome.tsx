import Link from "next/link";
import { BagCard } from "@/components/BagCard";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { HomeEmpty } from "@/components/home/PublicHome";
import type { Language, TranslationKey } from "@/lib/i18n";
import { translateUserMessage } from "@/lib/messageTranslations";
import { getRatingLabel, type RatingSummary } from "@/lib/offerLifecycle";
import type { Offer } from "@/lib/types";

export type HomeProps = {
  language: Language;
  t: (key: TranslationKey) => string;
  title: string;
  offers: Offer[];
  ratingSummaries: Record<number, RatingSummary>;
  loading: boolean;
  errorMessage: string;
};

/** The home screen for signed-in users: one line, then the offers. */
export function AppHome({
  language,
  t,
  title,
  offers,
  ratingSummaries,
  loading,
  errorMessage,
}: HomeProps) {
  return (
    <main className="app-shell">
      <Navbar />

      <section className="app-container pb-10 pt-5">
        <h1 className="font-serif text-[1.375rem] font-bold leading-tight sm:text-3xl">
          {title}
        </h1>

        {errorMessage && (
          <div className="ui-card mt-4 rounded-3xl px-5 py-4 text-sm font-medium text-body">
            {translateUserMessage(errorMessage, language)}
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {loading && (
            <>
              <div className="h-64 animate-pulse rounded-[28px] bg-well" />
              <div className="hidden h-64 animate-pulse rounded-[28px] bg-well sm:block" />
            </>
          )}
          {offers.map((offer, index) => (
            <BagCard
              key={offer.id}
              offer={offer}
              language={language}
              detailsLabel={t("common.viewDetails")}
              ratingLabel={getRatingLabel(ratingSummaries[offer.business_id], language)}
              priority={index === 0}
            />
          ))}
          {!loading && offers.length === 0 && <HomeEmpty t={t} />}
        </div>

        <Link href="/discover" className="premium-button mt-5 rounded-[18px] px-6 py-3 font-bold">
          {t("common.browseOffers")}
        </Link>
      </section>

      <Footer />
    </main>
  );
}
