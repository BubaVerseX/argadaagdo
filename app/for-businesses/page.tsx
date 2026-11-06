"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { businessAreaUrl } from "@/lib/businessArea";
import { forBusinessesContent } from "@/lib/legal/forBusinesses";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";

// Registration lives in the business area (business.argadaagdo.ge once
// NEXT_PUBLIC_BUSINESS_SITE_URL is set; same host until then).
const registerHref = businessAreaUrl("/business/register");

export default function ForBusinessesPage() {
  const { language } = useLanguage();
  const content = forBusinessesContent[language];

  return (
    <main className="app-shell theme-web">
      <Navbar variant="web" />

      <section className="px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-16 lg:px-12 lg:pt-20">
        <div className="premium-container">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="min-w-0 max-w-2xl">
              <p className="ui-card inline-flex rounded-full px-4 py-2 text-sm text-body">
                {content.heroBadge}
              </p>

              <h1 className="mt-7 text-balance break-words text-[2.25rem] font-semibold leading-[1.2] text-cream min-[360px]:text-[2.75rem] sm:text-[3.25rem] lg:text-[3.5rem]">
                {content.heroTitle}
              </h1>

              <p className="mt-6 max-w-xl text-pretty text-base leading-[1.55] text-body sm:text-lg">
                {content.heroSubtitle}
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href={registerHref} className="premium-button px-8 py-3.5">
                  {content.registerLabel}
                </Link>
                <Link
                  href="/contact"
                  className="premium-button-secondary px-8 py-3.5"
                >
                  {content.talkLabel}
                </Link>
              </div>
            </div>

            <div className="rounded-[22px] hero-surface p-8 text-cream shadow-[var(--shadow-card)] sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-mint">
                {content.pricingBadge}
              </p>
              <p className="mt-4 font-serif text-2xl leading-[1.35] sm:text-3xl">
                {content.pricingTitle}
              </p>
              <p className="mt-3 leading-[1.55] text-body-light">
                {content.pricingText}
              </p>
              <p className="mt-6 border-t border-line pt-5 text-sm leading-[1.55] text-body-light">
                {content.pricingNote}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-16 lg:px-12">
        <div className="premium-container">
          <p className="text-xs uppercase tracking-[0.24em] text-body">
            {content.benefitsBadge}
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold text-cream sm:text-5xl">
            {content.benefitsTitle}
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {content.benefits.map((item) => (
              <div key={item.title} className="ui-card rounded-[22px] p-7">
                <h3 className="text-xl font-semibold text-cream">
                  {item.title}
                </h3>
                <p className="mt-3 leading-[1.55] text-body">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-16 lg:px-12">
        <div className="premium-container">
          <p className="text-xs uppercase tracking-[0.24em] text-body">
            {content.howBadge}
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold text-cream sm:text-5xl">
            {content.howTitle}
          </h2>

          <ol className="mt-10 grid gap-10 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
            {content.howSteps.map((step, index) => (
              <li key={step.title}>
                <p className="text-sm tracking-[0.1em] text-body">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-4 text-xl font-semibold text-cream">
                  {step.title}
                </h3>
                <p className="mt-3 leading-[1.55] text-body">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-16 lg:px-12">
        <div className="premium-container grid gap-6 lg:grid-cols-2">
          <div className="ui-card rounded-[22px] p-8 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-mint">
              {content.needBadge}
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-cream">
              {content.needTitle}
            </h2>
            <ul className="mt-6 grid list-disc gap-2 pl-5 leading-[1.55] text-body marker:text-mint">
              {content.needItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-[22px] hero-surface p-8 text-cream shadow-[var(--shadow-card)] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-mint">
              {content.paidBadge}
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight">
              {content.paidTitle}
            </h2>
            <ul className="mt-6 grid list-disc gap-2 pl-5 leading-[1.55] text-body-light marker:text-mint">
              {content.paidItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-12">
        <div className="premium-container">
          <div className="ui-card rounded-[22px] p-10 text-center sm:p-14">
            <h2 className="mx-auto max-w-2xl text-4xl font-semibold leading-tight text-cream sm:text-5xl">
              {content.ctaTitle}
            </h2>
            <p className="mx-auto mt-5 max-w-xl leading-[1.55] text-body">
              {content.ctaText}
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href={registerHref} className="premium-button px-8 py-3.5">
                {content.registerLabel}
              </Link>
              <span className="text-sm font-semibold text-body">
                {content.ctaQuestions}{" "}
                <Link
                  href="/contact"
                  className="text-mint underline-offset-2 hover:underline"
                >
                  {content.ctaContact}
                </Link>
              </span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
