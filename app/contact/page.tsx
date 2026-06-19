"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";

const supportEmail = "support@argadaagdo.ge";

export default function ContactPage() {
  const { t } = useLanguage();

  const supportCards = [
    {
      title: t("contact.ordersTitle"),
      text: t("contact.ordersText"),
    },
    {
      title: t("contact.reservationsTitle"),
      text: t("contact.reservationsText"),
    },
    {
      title: t("contact.businessTitle"),
      text: t("contact.businessText"),
    },
  ];

  return (
    <main className="min-h-screen bg-[#F7F6EF] text-gray-950">
      <Navbar />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl bg-green-800 p-5 text-white shadow-xl sm:rounded-[2rem] sm:p-8 md:rounded-[2.5rem] md:p-12">
            <p className="text-xs font-black uppercase tracking-widest text-green-100 sm:text-sm">
              {t("contact.badge")}
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-6xl">
              {t("contact.title")}
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-green-50 sm:text-lg sm:leading-8">
              {t("contact.subtitle")}
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:mt-8 md:grid-cols-3">
            {supportCards.map((card) => (
              <div
                key={card.title}
                className="rounded-3xl bg-white p-5 shadow-sm sm:p-6"
              >
                <h2 className="text-xl font-black text-gray-950">
                  {card.title}
                </h2>
                <p className="mt-3 font-semibold leading-7 text-gray-700">
                  {card.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-[2rem] bg-white p-5 shadow-sm sm:p-8">
              <p className="text-sm font-black uppercase tracking-widest text-green-700">
                {t("contact.supportEmailLabel")}
              </p>
              <h2 className="mt-3 text-3xl font-black text-gray-950">
                {t("contact.emailTitle")}
              </h2>
              <p className="mt-4 font-semibold leading-7 text-gray-700">
                {t("contact.emailText")}
              </p>

              <a
                href={`mailto:${supportEmail}`}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-green-700 px-6 py-3 text-center font-black text-white transition hover:bg-green-800 sm:w-auto"
              >
                {supportEmail}
              </a>
            </section>

            <section className="rounded-[2rem] bg-green-50 p-5 shadow-sm sm:p-8">
              <p className="text-sm font-black uppercase tracking-widest text-green-700">
                {t("contact.businessInquiriesLabel")}
              </p>
              <h2 className="mt-3 text-3xl font-black text-gray-950">
                {t("contact.businessInquiriesTitle")}
              </h2>
              <p className="mt-4 font-semibold leading-7 text-gray-700">
                {t("contact.businessInquiriesText")}
              </p>

              <Link
                href="/business/register"
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white px-6 py-3 text-center font-black text-green-700 ring-1 ring-green-100 transition hover:bg-green-100 sm:w-auto"
              >
                {t("home.joinBusiness")}
              </Link>
            </section>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm font-black uppercase tracking-widest text-green-700">
                {t("contact.responseTimeLabel")}
              </p>
              <h2 className="mt-3 text-2xl font-black text-gray-950">
                {t("contact.responseTimeTitle")}
              </h2>
              <p className="mt-3 font-semibold leading-7 text-gray-700">
                {t("contact.responseTimeText")}
              </p>
            </section>

            <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm font-black uppercase tracking-widest text-green-700">
                {t("contact.serviceAreaLabel")}
              </p>
              <h2 className="mt-3 text-2xl font-black text-gray-950">
                {t("contact.serviceAreaTitle")}
              </h2>
              <p className="mt-3 font-semibold leading-7 text-gray-700">
                {t("contact.serviceAreaText")}
              </p>
            </section>
          </div>

          <div className="mt-6 rounded-[2rem] bg-white p-5 text-center shadow-sm sm:p-8">
            <h2 className="text-2xl font-black text-gray-950">
              {t("contact.footerTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl font-semibold leading-7 text-gray-700">
              {t("contact.footerText")}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/faq"
                className="min-h-12 rounded-full bg-green-50 px-6 py-3 text-center font-black text-green-800 transition hover:bg-green-100"
              >
                {t("nav.faq")}
              </Link>
              <Link
                href="/offers"
                className="min-h-12 rounded-full bg-green-700 px-6 py-3 text-center font-black text-white transition hover:bg-green-800"
              >
                {t("common.browseOffers")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
