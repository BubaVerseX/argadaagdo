import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { WebBagCard } from "@/components/WebBagCard";
import type { HomeProps } from "@/components/home/AppHome";
import type { TranslationKey } from "@/lib/i18n";
import { translateUserMessage } from "@/lib/messageTranslations";
import { getRatingLabel } from "@/lib/offerLifecycle";

/** The one empty state of the home page. */
export function HomeEmpty({ t }: { t: (key: TranslationKey) => string }) {
  return (
    <div className="ui-card rounded-[22px] p-8 text-center sm:col-span-2 lg:col-span-3">
      <p className="text-lg">{t("home.noSurpriseBags")}</p>
      <p className="mt-1 text-[15px] text-body">{t("home.publishLater")}</p>
    </div>
  );
}

/** The home page for signed-out visitors: one line, then the offers. */
export function PublicHome({
  language,
  t,
  title,
  offers,
  ratingSummaries,
  loading,
  errorMessage,
}: HomeProps) {
  return (
    <main className="app-shell theme-web public-home">
      <Navbar variant="web" />

      <section className="app-container pb-12 pt-8 lg:pt-12">
        <h1 className="text-[1.375rem] leading-[1.25] sm:text-[2.25rem]">{title}</h1>

        {errorMessage && (
          <div className="ui-card mt-6 px-5 py-4 text-sm text-body">
            {translateUserMessage(errorMessage, language)}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading && (
            <>
              <div className="h-80 animate-pulse rounded-[22px] bg-well" />
              <div className="hidden h-80 animate-pulse rounded-[22px] bg-well sm:block" />
              <div className="hidden h-80 animate-pulse rounded-[22px] bg-well lg:block" />
            </>
          )}

          {offers.map((offer, index) => (
            <WebBagCard
              key={offer.id}
              offer={offer}
              language={language}
              actionLabel={t("common.viewDetails")}
              ratingLabel={getRatingLabel(ratingSummaries[offer.business_id], language)}
              priority={index === 0}
            />
          ))}

          {!loading && offers.length === 0 && <HomeEmpty t={t} />}
        </div>

        <Link href="/discover" className="premium-button mt-6 px-[22px] py-3">
          {t("common.browseOffers")}
        </Link>
      </section>

      <Footer />
    </main>
  );
}
