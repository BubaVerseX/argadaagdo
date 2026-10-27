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
    <main className="app-shell">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="premium-surface rounded-3xl p-5 sm:rounded-3xl sm:p-8 md:rounded-3xl md:p-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-mint sm:text-sm">
              {t("terms.badge")}
            </p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl md:text-6xl">
              {t("terms.title")}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-body sm:text-lg sm:leading-8">
              {t("terms.subtitle")}
            </p>
          </div>

          <div className="mt-6 grid gap-4">
            {sections.map((section, index) => (
              <section
                key={section.title}
                className="rounded-3xl ui-card p-5 sm:p-8"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="ui-well flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-semibold text-mint">
                    {index + 1}
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-cream">
                      {section.title}
                    </h2>
                    <p className="mt-3 leading-8 text-body">
                      {section.text}
                    </p>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <div className="mt-6 rounded-3xl ui-card p-5 text-center sm:p-8">
            <h2 className="text-2xl font-semibold text-cream">
              {t("terms.helpTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl leading-7 text-body">
              {t("terms.helpText")}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/faq"
                className="premium-button-secondary px-6 py-3 text-center"
              >
                {t("nav.faq")}
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
