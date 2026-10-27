"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";

export default function AboutPage() {
  const { t } = useLanguage();

  const missionItems = [
    t("about.missionSaveFood"),
    t("about.missionSaveMoney"),
    t("about.missionSupportLocal"),
  ];

  return (
    <main className="app-shell">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="premium-surface rounded-3xl p-5 sm:rounded-3xl sm:p-8 md:rounded-3xl md:p-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-mint sm:text-sm">
              {t("about.badge")}
            </p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl md:text-6xl">
              {t("about.title")}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-body sm:text-lg sm:leading-8">
              {t("about.subtitle")}
            </p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-3xl ui-card p-5 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-widest text-mint">
                {t("about.whatLabel")}
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-cream">
                {t("about.whatTitle")}
              </h2>
              <p className="mt-4 leading-8 text-body">
                {t("about.whatText")}
              </p>
            </section>

            <section className="rounded-3xl ui-card p-5 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-widest text-mint">
                {t("about.launchAreaLabel")}
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-cream">
                {t("about.launchAreaTitle")}
              </h2>
              <p className="mt-4 leading-8 text-body">
                {t("about.launchAreaText")}
              </p>
            </section>
          </div>

          <section className="mt-6 rounded-3xl ui-card p-5 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-mint">
              {t("about.missionLabel")}
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-cream">
              {t("about.missionTitle")}
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {missionItems.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl ui-card p-5 text-center "
                >
                  <p className="text-2xl font-semibold text-mint">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="premium-card mt-6 rounded-3xl p-5 text-center sm:p-8">
            <h2 className="text-2xl font-semibold text-cream sm:text-3xl">
              {t("about.ctaTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl leading-7 text-body">
              {t("about.ctaText")}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/offers"
                className="premium-button-secondary px-6 py-3 text-center"
              >
                {t("common.browseOffers")}
              </Link>
              <Link
                href="/contact"
                className="premium-button px-6 py-3 text-center"
              >
                {t("contact.cta")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
