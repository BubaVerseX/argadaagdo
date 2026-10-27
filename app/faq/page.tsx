"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { PlusIcon } from "@/components/icons";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";

export default function FAQPage() {
  const { t } = useLanguage();

  const customerQuestions = [
    {
      question: t("faq.customer.what.question"),
      answer: t("faq.customer.what.answer"),
    },
    {
      question: t("faq.customer.reservations.question"),
      answer: t("faq.customer.reservations.answer"),
    },
    {
      question: t("faq.customer.pickups.question"),
      answer: t("faq.customer.pickups.answer"),
    },
    {
      question: t("faq.customer.cancel.question"),
      answer: t("faq.customer.cancel.answer"),
    },
    {
      question: t("faq.customer.miss.question"),
      answer: t("faq.customer.miss.answer"),
    },
    {
      question: t("faq.customer.ratings.question"),
      answer: t("faq.customer.ratings.answer"),
    },
  ];

  const businessQuestions = [
    {
      question: t("faq.business.join.question"),
      answer: t("faq.business.join.answer"),
    },
    {
      question: t("faq.business.approval.question"),
      answer: t("faq.business.approval.answer"),
    },
    {
      question: t("faq.business.offers.question"),
      answer: t("faq.business.offers.answer"),
    },
    {
      question: t("faq.business.collect.question"),
      answer: t("faq.business.collect.answer"),
    },
  ];

  const generalQuestions = [
    {
      question: t("faq.general.tbilisi.question"),
      answer: t("faq.general.tbilisi.answer"),
    },
    {
      question: t("faq.general.why.question"),
      answer: t("faq.general.why.answer"),
    },
  ];

  const sections = [
    { title: t("faq.customers"), questions: customerQuestions },
    { title: t("faq.businesses"), questions: businessQuestions },
    { title: t("faq.general"), questions: generalQuestions },
  ];

  return (
    <main className="app-shell">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="premium-surface rounded-3xl p-5 sm:rounded-3xl sm:p-8 md:rounded-3xl md:p-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-mint sm:text-sm">
              {t("faq.badge")}
            </p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl md:text-6xl">
              {t("faq.title")}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-body sm:text-lg sm:leading-8">
              {t("faq.subtitle")}
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:mt-8 md:grid-cols-3">
            <div className="premium-card rounded-3xl p-5 sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-widest text-mint">
                {t("faq.trustLabel")}
              </p>
              <p className="mt-3 leading-7 text-body">
                {t("faq.trustText")}
              </p>
            </div>

            <div className="premium-card rounded-3xl p-5 sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-widest text-mint">
                {t("common.pickup")}
              </p>
              <p className="mt-3 leading-7 text-body">
                {t("faq.pickupText")}
              </p>
            </div>

            <div className="premium-card rounded-3xl p-5 sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-widest text-mint">
                {t("common.rating")}
              </p>
              <p className="mt-3 leading-7 text-body">
                {t("faq.ratingText")}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-8">
            {sections.map((section) => (
              <section
                key={section.title}
                className="rounded-3xl ui-card p-5 sm:p-8"
              >
                <h2 className="text-2xl font-semibold text-cream sm:text-3xl">
                  {section.title}
                </h2>

                <div className="mt-5 grid gap-3 sm:mt-6">
                  {section.questions.map((item) => (
                    <details
                      key={item.question}
                      className="group rounded-3xl bg-well p-5"
                    >
                      <summary className="cursor-pointer list-none text-lg font-semibold text-cream outline-none transition hover:text-mint focus-visible:ring-2 focus-visible:ring-mint">
                        <span className="flex items-start justify-between gap-4">
                          <span>{item.question}</span>
                          <PlusIcon
                            className="h-5 w-5 shrink-0 text-mint transition group-open:rotate-45"
                            strokeWidth={1.8}
                          />
                        </span>
                      </summary>
                      <p className="mt-4 leading-7 text-body">
                        {item.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-8 rounded-3xl ui-card p-5 text-center sm:p-8">
            <h2 className="text-2xl font-semibold text-cream">
              {t("faq.ctaTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl leading-7 text-body">
              {t("faq.ctaText")}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/offers"
                className="premium-button px-6 py-3 text-center"
              >
                {t("home.explore")}
              </Link>
              <Link
                href="/business/register"
                className="premium-button-secondary px-6 py-3 text-center"
              >
                {t("home.joinBusiness")}
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
