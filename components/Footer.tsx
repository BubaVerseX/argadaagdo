"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/useLanguage";

export default function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();
  const platformLinks = [
    { href: "/offers", label: t("nav.offers") },
    { href: "/discover", label: t("nav.discover") },
    { href: "/businesses", label: t("nav.businesses") },
    { href: "/faq", label: t("nav.faq") },
  ];
  const companyLinks = [
    { href: "/about", label: t("nav.about") },
    { href: "/contact", label: t("nav.contact") },
    { href: "/support", label: t("nav.support") },
    { href: "/privacy", label: t("nav.privacy") },
    { href: "/terms", label: t("nav.terms") },
  ];

  return (
    <footer className="mt-16 bg-[#fbfaf6] px-4 pb-8 sm:px-6 md:px-12">
      <div className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] bg-white px-6 py-8 shadow-sm ring-1 ring-black/5 sm:px-8 md:grid-cols-[1.3fr_0.7fr_0.7fr] md:py-10">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-950 text-lg font-black text-white">
              A
            </div>

            <div>
              <h2 className="text-xl font-black text-gray-950 sm:text-2xl">
                ArGadaagdo
              </h2>
              <p className="font-bold text-gray-500">
                {t("brand.tagline")}
              </p>
            </div>
          </div>

          <p className="mt-5 max-w-md text-sm font-semibold leading-6 text-gray-600">
            {t("footer.reduceWasteGeorgia")}
          </p>

          <Link
            href="/business/register"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-gray-950 px-6 py-3 text-sm font-black text-white transition hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
          >
            {t("home.joinBusiness")}
          </Link>
        </div>

        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
            {t("footer.platform")}
          </h3>

          <div className="mt-4 grid gap-3 text-sm font-black text-gray-700">
            {platformLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg transition hover:text-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-gray-500">
            {t("nav.support")}
          </h3>

          <div className="mt-4 grid gap-3 text-sm font-black text-gray-700">
            {companyLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg transition hover:text-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-2 py-5 text-sm font-bold text-gray-500 sm:px-4 md:flex-row md:items-center md:justify-between">
          <p>© ArGadaagdo {currentYear}</p>
          <p>{t("footer.reduceWasteGeorgia")}</p>
      </div>
    </footer>
  );
}
