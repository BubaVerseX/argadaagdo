"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/useLanguage";

// TODO: replace these "#" placeholders with real social account URLs once
// ArGadaagdo has live Instagram/X/Facebook accounts.
const socialLinks = [
  {
    name: "Instagram",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4.5 w-4.5">
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: "X (Twitter)",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4.5 w-4.5">
        <path
          d="M4 4l7.2 9.6L4.4 20H6l6.1-6.6L16.8 20H20l-7.5-10L19.6 4H18l-5.7 6.1L8 4H4z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    name: "Facebook",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4.5 w-4.5">
        <path
          d="M13.5 21v-7.5h2.5l.4-3H13.5V8.5c0-.87.24-1.46 1.5-1.46H16.5V4.35C16.24 4.32 15.36 4.25 14.34 4.25c-2.13 0-3.59 1.3-3.59 3.68v2.27H8.25v3H10.75V21H13.5z"
          fill="currentColor"
        />
      </svg>
    ),
  },
];

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
    <footer className="mt-20 px-4 pb-8 sm:px-6 md:px-12">
      <div className="mx-auto grid max-w-7xl gap-8 rounded-[1.75rem] bg-[#f2efe6] px-6 py-8 shadow-[0_3px_16px_rgba(37,34,32,0.06)] sm:px-8 md:grid-cols-[1.3fr_0.7fr_0.7fr] md:py-10">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1a1815] text-lg font-bold text-white">
              A
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#1a1815] sm:text-2xl">
                ArGadaagdo
              </h2>
              <p className="font-medium text-[#6b6558]">
                {t("brand.tagline")}
              </p>
            </div>
          </div>

          <p className="mt-5 max-w-md text-sm font-medium leading-6 text-[#6b6558]">
            {t("footer.reduceWasteGeorgia")}
          </p>

          <Link
            href="/business/register"
            className="premium-button mt-6 px-6 py-3 text-sm"
          >
            {t("home.joinBusiness")}
          </Link>

          <div className="mt-6 flex items-center gap-2">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                aria-label={social.name}
                title={`${social.name} (coming soon)`}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#6b6558] shadow-[0_3px_16px_rgba(37,34,32,0.06)] transition hover:text-[#5c7a5c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c7a5c]"
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8a8272]">
            {t("footer.platform")}
          </h3>

          <div className="mt-4 grid gap-3 text-sm font-semibold text-[#6b6558]">
            {platformLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg transition hover:text-[#5c7a5c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c7a5c]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8a8272]">
            {t("nav.support")}
          </h3>

          <div className="mt-4 grid gap-3 text-sm font-semibold text-[#6b6558]">
            {companyLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg transition hover:text-[#5c7a5c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c7a5c]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-2 py-5 text-sm font-medium text-[#8a8272] sm:px-4 md:flex-row md:items-center md:justify-between">
        <p>© ArGadaagdo {currentYear}</p>
        <p>{t("footer.reduceWasteGeorgia")}</p>
      </div>
    </footer>
  );
}
