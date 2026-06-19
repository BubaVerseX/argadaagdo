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
    <main className="min-h-screen bg-[#F7F6EF] text-gray-950">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl bg-green-800 p-5 text-white shadow-xl sm:rounded-[2rem] sm:p-8 md:rounded-[2.5rem] md:p-12">
            <p className="text-xs font-black uppercase tracking-widest text-green-100 sm:text-sm">
              {t("about.badge")}
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-6xl">
              {t("about.title")}
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-green-50 sm:text-lg sm:leading-8">
              {t("about.subtitle")}
            </p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[2rem] bg-white p-5 shadow-sm sm:p-8">
              <p className="text-sm font-black uppercase tracking-widest text-green-700">
                {t("about.whatLabel")}
              </p>
              <h2 className="mt-3 text-3xl font-black text-gray-950">
                {t("about.whatTitle")}
              </h2>
              <p className="mt-4 font-semibold leading-8 text-gray-700">
                {t("about.whatText")}
              </p>
            </section>

            <section className="rounded-[2rem] bg-green-50 p-5 shadow-sm sm:p-8">
              <p className="text-sm font-black uppercase tracking-widest text-green-700">
                {t("about.launchAreaLabel")}
              </p>
              <h2 className="mt-3 text-3xl font-black text-gray-950">
                {t("about.launchAreaTitle")}
              </h2>
              <p className="mt-4 font-semibold leading-8 text-gray-700">
                {t("about.launchAreaText")}
              </p>
            </section>
          </div>

          <section className="mt-6 rounded-[2rem] bg-white p-5 shadow-sm sm:p-8">
            <p className="text-sm font-black uppercase tracking-widest text-green-700">
              {t("about.missionLabel")}
            </p>
            <h2 className="mt-3 text-3xl font-black text-gray-950">
              {t("about.missionTitle")}
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {missionItems.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl bg-[#F7F6EF] p-5 text-center shadow-sm"
                >
                  <p className="text-2xl font-black text-green-800">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-6 rounded-[2rem] bg-green-800 p-5 text-center text-white shadow-sm sm:p-8">
            <h2 className="text-2xl font-black sm:text-3xl">
              {t("about.ctaTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl font-semibold leading-7 text-green-50">
              {t("about.ctaText")}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/offers"
                className="min-h-12 rounded-full bg-white px-6 py-3 text-center font-black text-green-800 transition hover:bg-green-50"
              >
                {t("common.browseOffers")}
              </Link>
              <Link
                href="/contact"
                className="min-h-12 rounded-full bg-green-700 px-6 py-3 text-center font-black text-white ring-1 ring-white/20 transition hover:bg-green-900"
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
