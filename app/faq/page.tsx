"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
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
          <div className="premium-surface rounded-3xl p-5 sm:rounded-[2rem] sm:p-8 md:rounded-[2.5rem] md:p-12">
            <p className="text-xs font-black uppercase tracking-widest text-[#5c7a5c] sm:text-sm">
              {t("faq.badge")}
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-6xl">
              {t("faq.title")}
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-[#6b6558] sm:text-lg sm:leading-8">
              {t("faq.subtitle")}
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:mt-8 md:grid-cols-3">
            <div className="premium-card rounded-3xl p-5 sm:p-6">
              <p className="text-sm font-black uppercase tracking-widest text-[#5c7a5c]">
                {t("faq.trustLabel")}
              </p>
              <p className="mt-3 font-bold leading-7 text-[#6b6558]">
                {t("faq.trustText")}
              </p>
            </div>

            <div className="premium-card rounded-3xl p-5 sm:p-6">
              <p className="text-sm font-black uppercase tracking-widest text-[#5c7a5c]">
                {t("common.pickup")}
              </p>
              <p className="mt-3 font-bold leading-7 text-[#6b6558]">
                {t("faq.pickupText")}
              </p>
            </div>

            <div className="premium-card rounded-3xl p-5 sm:p-6">
              <p className="text-sm font-black uppercase tracking-widest text-[#5c7a5c]">
                {t("common.rating")}
              </p>
              <p className="mt-3 font-bold leading-7 text-[#6b6558]">
                {t("faq.ratingText")}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-8">
            {sections.map((section) => (
              <section
                key={section.title}
                className="rounded-[2rem] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-8"
              >
                <h2 className="text-2xl font-black text-[#1a1815] sm:text-3xl">
                  {section.title}
                </h2>

                <div className="mt-5 grid gap-3 sm:mt-6">
                  {section.questions.map((item) => (
                    <details
                      key={item.question}
                      className="group rounded-3xl bg-[#ece7da] p-5"
                    >
                      <summary className="cursor-pointer list-none text-lg font-black text-[#1a1815] outline-none transition hover:text-[#5c7a5c] focus-visible:ring-2 focus-visible:ring-[#5c7a5c]">
                        <span className="flex items-start justify-between gap-4">
                          <span>{item.question}</span>
                          <span className="text-[#5c7a5c] transition group-open:rotate-45">
                            +
                          </span>
                        </span>
                      </summary>
                      <p className="mt-4 font-semibold leading-7 text-[#6b6558]">
                        {item.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-8 rounded-[2rem] bg-white p-5 text-center shadow-[var(--shadow-soft)] sm:p-8">
            <h2 className="text-2xl font-black text-[#1a1815]">
              {t("faq.ctaTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl font-semibold leading-7 text-[#6b6558]">
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
