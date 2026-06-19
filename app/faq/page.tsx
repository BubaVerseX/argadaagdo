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
    <main className="min-h-screen bg-[#F7F6EF] text-gray-950">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl bg-green-800 p-5 text-white shadow-xl sm:rounded-[2rem] sm:p-8 md:rounded-[2.5rem] md:p-12">
            <p className="text-xs font-black uppercase tracking-widest text-green-100 sm:text-sm">
              {t("faq.badge")}
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-6xl">
              {t("faq.title")}
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-green-50 sm:text-lg sm:leading-8">
              {t("faq.subtitle")}
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:mt-8 md:grid-cols-3">
            <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm font-black uppercase tracking-widest text-green-700">
                {t("faq.trustLabel")}
              </p>
              <p className="mt-3 font-bold leading-7 text-gray-700">
                {t("faq.trustText")}
              </p>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm font-black uppercase tracking-widest text-green-700">
                {t("common.pickup")}
              </p>
              <p className="mt-3 font-bold leading-7 text-gray-700">
                {t("faq.pickupText")}
              </p>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm font-black uppercase tracking-widest text-green-700">
                {t("common.rating")}
              </p>
              <p className="mt-3 font-bold leading-7 text-gray-700">
                {t("faq.ratingText")}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-8">
            {sections.map((section) => (
              <section
                key={section.title}
                className="rounded-[2rem] bg-white p-5 shadow-sm sm:p-8"
              >
                <h2 className="text-2xl font-black text-gray-950 sm:text-3xl">
                  {section.title}
                </h2>

                <div className="mt-5 grid gap-3 sm:mt-6">
                  {section.questions.map((item) => (
                    <details
                      key={item.question}
                      className="group rounded-3xl border border-gray-100 bg-[#F7F6EF] p-5"
                    >
                      <summary className="cursor-pointer list-none text-lg font-black text-gray-950 outline-none transition hover:text-green-700 focus-visible:ring-2 focus-visible:ring-green-200">
                        <span className="flex items-start justify-between gap-4">
                          <span>{item.question}</span>
                          <span className="text-green-700 transition group-open:rotate-45">
                            +
                          </span>
                        </span>
                      </summary>
                      <p className="mt-4 font-semibold leading-7 text-gray-700">
                        {item.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-8 rounded-[2rem] bg-green-50 p-5 text-center shadow-sm sm:p-8">
            <h2 className="text-2xl font-black text-gray-950">
              {t("faq.ctaTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl font-semibold leading-7 text-gray-700">
              {t("faq.ctaText")}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/offers"
                className="min-h-12 rounded-full bg-green-700 px-6 py-3 text-center font-black text-white transition hover:bg-green-800"
              >
                {t("home.explore")}
              </Link>
              <Link
                href="/business/register"
                className="min-h-12 rounded-full bg-white px-6 py-3 text-center font-black text-green-700 ring-1 ring-green-100 transition hover:bg-green-50"
              >
                {t("home.joinBusiness")}
              </Link>
              <Link
                href="/contact"
                className="min-h-12 rounded-full bg-green-800 px-6 py-3 text-center font-black text-white transition hover:bg-green-900"
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
