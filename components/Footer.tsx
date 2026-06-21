"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/useLanguage";

export default function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();
  const platformLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/offers", label: t("nav.offers") },
    { href: "/faq", label: t("nav.faq") },
    { href: "/contact", label: t("nav.contact") },
    { href: "/about", label: t("nav.about") },
    { href: "/privacy", label: t("nav.privacy") },
    { href: "/terms", label: t("nav.terms") },
  ];

  return (
    <footer className="mt-12 border-t border-black/5 bg-white sm:mt-16">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-6 md:grid-cols-[1.2fr_0.8fr_0.8fr] md:px-12 md:py-12">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-700 text-xl text-white">
              🥡
            </div>

            <div>
              <h2 className="text-xl font-black text-green-800 sm:text-2xl">
                ArGadaagdo
              </h2>
              <p className="font-bold text-gray-500">
                {t("brand.tagline")}
              </p>
            </div>
          </div>

          <p className="mt-5 max-w-md font-semibold leading-7 text-gray-700">
            {t("home.subtitle")}
          </p>

          <Link
            href="/business/register"
            className="mt-6 inline-block rounded-full bg-green-700 px-6 py-3 font-black text-white transition hover:bg-green-800"
          >
            {t("home.joinBusiness")}
          </Link>
        </div>

        <div>
          <h3 className="text-lg font-black text-gray-950">
            {t("footer.platform")}
          </h3>

          <div className="mt-4 grid gap-3 font-bold text-gray-600">
            {platformLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-green-700"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-black text-gray-950">{t("home.stats")}</h3>

          <div className="mt-4 grid gap-3 font-bold text-gray-600">
            <p>{t("home.trustVerifiedBusinesses")}</p>
            <p>{t("home.trustPickupOnlyMarketplace")}</p>
            <p>{t("home.trustCustomerRatings")}</p>
            <p>{t("home.trustSecureReservationFlow")}</p>
            <p>{t("home.trustLocalTbilisiBusinesses")}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-black/5 px-5 py-6 sm:px-6 md:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm font-bold text-gray-500 md:flex-row md:items-center md:justify-between">
          <p>© ArGadaagdo {currentYear}</p>
          <p>{t("footer.reduceWasteGeorgia")}</p>
          <p>Made with Next.js, Supabase and Tailwind CSS.</p>
        </div>
      </div>
    </footer>
  );
}
