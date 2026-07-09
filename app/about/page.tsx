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
          <div className="premium-surface rounded-3xl p-5 sm:rounded-[2rem] sm:p-8 md:rounded-[2.5rem] md:p-12">
            <p className="text-xs font-black uppercase tracking-widest text-[#5c7a5c] sm:text-sm">
              {t("about.badge")}
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-6xl">
              {t("about.title")}
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-[#6b6558] sm:text-lg sm:leading-8">
              {t("about.subtitle")}
            </p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[2rem] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-8">
              <p className="text-sm font-black uppercase tracking-widest text-[#5c7a5c]">
                {t("about.whatLabel")}
              </p>
              <h2 className="mt-3 text-3xl font-black text-[#1a1815]">
                {t("about.whatTitle")}
              </h2>
              <p className="mt-4 font-semibold leading-8 text-[#6b6558]">
                {t("about.whatText")}
              </p>
            </section>

            <section className="rounded-[2rem] bg-[#ece7da] p-5 shadow-[var(--shadow-soft)] sm:p-8">
              <p className="text-sm font-black uppercase tracking-widest text-[#5c7a5c]">
                {t("about.launchAreaLabel")}
              </p>
              <h2 className="mt-3 text-3xl font-black text-[#1a1815]">
                {t("about.launchAreaTitle")}
              </h2>
              <p className="mt-4 font-semibold leading-8 text-[#6b6558]">
                {t("about.launchAreaText")}
              </p>
            </section>
          </div>

          <section className="mt-6 rounded-[2rem] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-8">
            <p className="text-sm font-black uppercase tracking-widest text-[#5c7a5c]">
              {t("about.missionLabel")}
            </p>
            <h2 className="mt-3 text-3xl font-black text-[#1a1815]">
              {t("about.missionTitle")}
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {missionItems.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl bg-[#ece7da] p-5 text-center shadow-[var(--shadow-soft)]"
                >
                  <p className="text-2xl font-black text-[#5c7a5c]">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="premium-card mt-6 rounded-[2rem] p-5 text-center sm:p-8">
            <h2 className="text-2xl font-black text-[#1a1815] sm:text-3xl">
              {t("about.ctaTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl font-semibold leading-7 text-[#6b6558]">
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
