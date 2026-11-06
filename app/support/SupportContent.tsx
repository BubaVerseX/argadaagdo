"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { FAQAccordion } from "@/components/help/FAQAccordion";
import { HelpCard } from "@/components/help/HelpCard";
import { InfoBanner } from "@/components/help/InfoBanner";
import { TrustBadge } from "@/components/help/TrustBadge";
import { MapPinIcon, ReceiptIcon } from "@/components/icons";
import { supportContent } from "@/lib/legal/contact";
import { faqContent, pickFaqItems } from "@/lib/legal/faq";
import { SUPPORT_EMAIL } from "@/lib/legal/shared";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";

// The full answers live in lib/legal/faq.ts; this page shows the most asked.
const customerQuestionIds = ["reserve", "pickup", "cancel", "miss", "problem"];
const businessQuestionIds = ["join", "cost", "handover"];

export default function SupportContent() {
  const { language, t } = useLanguage();
  const content = supportContent[language];
  const faqGroups = faqContent[language].groups;

  return (
    <main className="app-shell theme-web">
      <Navbar variant="web" />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-6xl">
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
            <div className="mt-6 flex flex-wrap gap-2">
              <TrustBadge label={t("home.trustVerified")} />
              <TrustBadge label={t("home.trustPickupCodeVerification")} />
              <TrustBadge label={t("home.trustCustomerRatings")} />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:mt-8 md:grid-cols-2">
            <HelpCard
              icon={<ReceiptIcon className="h-5 w-5" strokeWidth={1.8} />}
              title={content.ordersCard.title}
              text={content.ordersCard.text}
              href="/orders"
              actionLabel={content.ordersCard.action}
            />
            <HelpCard
              icon={<MapPinIcon className="h-5 w-5" strokeWidth={1.8} />}
              title={content.pickupCard.title}
              text={content.pickupCard.text}
              href="/faq#pickup"
              actionLabel={content.pickupCard.action}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <section className="rounded-3xl ui-card p-5 sm:p-8">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                {content.faqTitle}
              </h2>
              <p className="mt-3 leading-7 text-body">{content.faqIntro}</p>

              <div className="mt-6 grid gap-6">
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-mint">
                    {content.customersLabel}
                  </h3>
                  <FAQAccordion
                    items={pickFaqItems(faqGroups, customerQuestionIds)}
                  />
                </div>
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-mint">
                    {content.businessesLabel}
                  </h3>
                  <FAQAccordion
                    items={pickFaqItems(faqGroups, businessQuestionIds)}
                  />
                </div>
              </div>
            </section>

            <div className="grid content-start gap-6">
              <InfoBanner
                title={content.contactTitle}
                text={content.contactText}
                tone="white"
              >
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="premium-button w-full break-all px-6 py-3 text-center sm:w-auto"
                >
                  {SUPPORT_EMAIL}
                </a>
              </InfoBanner>

              <InfoBanner
                title={content.urgentTitle}
                text={content.urgentText}
                tone="yellow"
              />

              <InfoBanner title={content.moreTitle} text={content.moreText}>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/faq"
                    className="premium-button min-h-11 px-5 py-2.5 text-center"
                  >
                    {content.openFaqLabel}
                  </Link>
                  <Link
                    href="/contact"
                    className="premium-button-secondary min-h-11 px-5 py-2.5 text-center"
                  >
                    {content.contactPageLabel}
                  </Link>
                </div>
              </InfoBanner>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
