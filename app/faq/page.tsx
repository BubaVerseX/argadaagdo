"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { FAQAccordion } from "@/components/help/FAQAccordion";
import { faqContent } from "@/lib/legal/faq";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";

export default function FAQPage() {
  const { language } = useLanguage();
  const content = faqContent[language];

  return (
    <main className="app-shell theme-web">
      <Navbar variant="web" />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="premium-surface rounded-3xl p-5 sm:p-8 md:p-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-mint sm:text-sm">
              {content.badge}
            </p>
            <h1 className="mt-3 break-words text-3xl font-semibold sm:text-4xl md:text-6xl">
              {content.title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-body sm:text-lg sm:leading-8">
              {content.intro}
            </p>
          </div>

          <div className="mt-6 grid gap-6 sm:mt-8">
            {content.groups.map((group) => (
              <section
                key={group.id}
                id={group.id}
                className="scroll-mt-24 rounded-3xl ui-card p-5 sm:p-8"
              >
                <h2 className="text-2xl font-semibold text-cream sm:text-3xl">
                  {group.title}
                </h2>
                <div className="mt-5 sm:mt-6">
                  <FAQAccordion items={group.items} />
                </div>
              </section>
            ))}
          </div>

          <div className="mt-8 rounded-3xl ui-card p-5 text-center sm:p-8">
            <h2 className="text-2xl font-semibold text-cream">
              {content.ctaTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl leading-7 text-body">
              {content.ctaText}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/discover"
                className="premium-button-secondary px-6 py-3 text-center"
              >
                {content.browseLabel}
              </Link>
              <Link
                href="/contact"
                className="premium-button px-6 py-3 text-center"
              >
                {content.contactLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
