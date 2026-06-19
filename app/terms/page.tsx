"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";

export default function TermsPage() {
  const { t } = useLanguage();

  const sections = [
    {
      title: t("terms.reservationsTitle"),
      text: t("terms.reservationsText"),
    },
    {
      title: t("terms.pickupTitle"),
      text: t("terms.pickupText"),
    },
    {
      title: t("terms.cancellationTitle"),
      text: t("terms.cancellationText"),
    },
    {
      title: t("terms.ratingsTitle"),
      text: t("terms.ratingsText"),
    },
    {
      title: t("terms.businessApprovalTitle"),
      text: t("terms.businessApprovalText"),
    },
  ];

  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-950">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl bg-green-800 p-5 text-white shadow-xl sm:rounded-[2rem] sm:p-8 md:rounded-[2.5rem] md:p-12">
            <p className="text-xs font-black uppercase tracking-widest text-green-100 sm:text-sm">
              {t("terms.badge")}
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-6xl">
              {t("terms.title")}
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-green-50 sm:text-lg sm:leading-8">
              {t("terms.subtitle")}
            </p>
          </div>

          <div className="mt-6 grid gap-4">
            {sections.map((section, index) => (
              <section
                key={section.title}
                className="rounded-[2rem] bg-white p-5 shadow-sm sm:p-8"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-xl font-black text-green-800">
                    {index + 1}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-950">
                      {section.title}
                    </h2>
                    <p className="mt-3 font-semibold leading-8 text-gray-700">
                      {section.text}
                    </p>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <div className="mt-6 rounded-[2rem] bg-green-50 p-5 text-center shadow-sm sm:p-8">
            <h2 className="text-2xl font-black text-gray-950">
              {t("terms.helpTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl font-semibold leading-7 text-gray-700">
              {t("terms.helpText")}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/faq"
                className="min-h-12 rounded-full bg-white px-6 py-3 text-center font-black text-green-700 ring-1 ring-green-100 transition hover:bg-green-100"
              >
                {t("nav.faq")}
              </Link>
              <Link
                href="/contact"
                className="min-h-12 rounded-full bg-green-700 px-6 py-3 text-center font-black text-white transition hover:bg-green-800"
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
