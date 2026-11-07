"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { businessAreaUrl } from "@/lib/businessArea";
import { forBusinessesContent } from "@/lib/legal/forBusinesses";
import { isNativeApp } from "@/lib/native";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";
import { useSyncExternalStore } from "react";

// Registration lives in the business area (business.argadaagdo.ge once
// NEXT_PUBLIC_BUSINESS_SITE_URL is set; same host until then). The apps keep
// it on this host: another host would open the browser and leave the app.
const registerHref = businessAreaUrl("/business/register");
const subscribe = () => () => {};
const serverFalse = () => false;

export default function ForBusinessesPage() {
  const { language } = useLanguage();
  const content = forBusinessesContent[language];
  const inApp = useSyncExternalStore(subscribe, isNativeApp, serverFalse);

  return (
    <main className="app-shell theme-web">
      <Navbar variant="web" />

      <section className="px-4 pb-8 pt-8 sm:px-6 sm:pt-14 lg:px-12">
        <div className="premium-container grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="min-w-0 max-w-2xl">
            <h1 className="text-balance break-words text-[2rem] font-semibold leading-[1.2] text-cream min-[360px]:text-[2.4rem] sm:text-[3rem]">
              {content.heroTitle}
            </h1>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={inApp ? "/business/register" : registerHref}
                className="premium-button px-8 py-3.5"
              >
                {content.registerLabel}
              </Link>
              <Link href="/contact" className="premium-button-secondary px-8 py-3.5">
                {content.talkLabel}
              </Link>
            </div>
          </div>

          <div className="rounded-[22px] hero-surface p-6 text-cream shadow-[var(--shadow-card)] sm:p-8">
            <p className="font-serif text-2xl leading-[1.35]">{content.pricingTitle}</p>
            <p className="mt-2 text-body-light">{content.pricingNote}</p>
          </div>
        </div>
      </section>

      {/* Details behind a tap: one line per item. */}
      <section className="px-4 pb-10 sm:px-6 lg:px-12">
        <div className="premium-container grid gap-3">
          {[
            { title: content.howTitle, items: content.howSteps.map((step) => step.title) },
            { title: content.benefitsTitle, items: content.benefits.map((item) => item.title) },
            { title: content.needTitle, items: content.needItems },
            { title: content.paidTitle, items: content.paidItems },
          ].map((group) => (
            <details key={group.title} className="group ui-card rounded-2xl">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 text-lg font-semibold text-cream [&::-webkit-details-marker]:hidden">
                {group.title}
                <span aria-hidden="true" className="transition group-open:rotate-180">⌄</span>
              </summary>
              <ol className="grid list-decimal gap-1 px-5 pb-5 pl-10 text-body marker:text-mint">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </details>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
