"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";

export default function PrivacyPage() {
  const { t } = useLanguage();

  const sections = [
    {
      title: t("privacy.infoTitle"),
      text: t("privacy.infoText"),
    },
    {
      title: t("privacy.accountTitle"),
      text: t("privacy.accountText"),
    },
    {
      title: t("privacy.ordersTitle"),
      text: t("privacy.ordersText"),
    },
    {
      title: t("privacy.contactTitle"),
      text: t("privacy.contactText"),
    },
  ];

  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-950">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl bg-green-800 p-5 text-white shadow-xl sm:rounded-[2rem] sm:p-8 md:rounded-[2.5rem] md:p-12">
            <p className="text-xs font-black uppercase tracking-widest text-green-100 sm:text-sm">
              {t("privacy.badge")}
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-6xl">
              {t("privacy.title")}
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-green-50 sm:text-lg sm:leading-8">
              {t("privacy.subtitle")}
            </p>
          </div>

          <div className="mt-6 grid gap-4">
            {sections.map((section) => (
              <section
                key={section.title}
                className="rounded-[2rem] bg-white p-5 shadow-sm sm:p-8"
              >
                <h2 className="text-2xl font-black text-gray-950">
                  {section.title}
                </h2>
                <p className="mt-4 font-semibold leading-8 text-gray-700">
                  {section.text}
                </p>
              </section>
            ))}
          </div>

          <div className="mt-6 rounded-[2rem] bg-green-50 p-5 text-center shadow-sm sm:p-8">
            <h2 className="text-2xl font-black text-gray-950">
              {t("privacy.helpTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl font-semibold leading-7 text-gray-700">
              {t("privacy.helpText")}
            </p>
            <Link
              href="/contact"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-green-700 px-6 py-3 text-center font-black text-white transition hover:bg-green-800 sm:w-auto"
            >
              {t("contact.cta")}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
