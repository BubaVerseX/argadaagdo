"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import LegalSections from "@/components/legal/LegalSections";
import type { PolicyContent } from "@/lib/legal/policies";
import type { Localized } from "@/lib/legal/shared";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";

const LINKS = {
  en: [
    { href: "/refund-policy", label: "Refunds" },
    { href: "/pickup-policy", label: "Pickup rules" },
    { href: "/terms", label: "Terms of Use" },
    { href: "/contact", label: "Contact us" },
  ],
  ka: [
    { href: "/refund-policy", label: "თანხის დაბრუნება" },
    { href: "/pickup-policy", label: "წაღების წესები" },
    { href: "/terms", label: "გამოყენების წესები" },
    { href: "/contact", label: "დაგვიკავშირდი" },
  ],
} as const;

/** A short policy page: title, one-line summary and every section open. */
export default function PolicyPage({ content, path }: { content: Localized<PolicyContent>; path: string }) {
  const { language } = useLanguage();
  const page = content[language];

  return (
    <main className="app-shell theme-web">
      <Navbar variant="web" />

      <section className="px-4 py-6 sm:px-6 sm:py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-3xl">
          <div className="premium-surface rounded-3xl p-5 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-mint sm:text-sm">
              {page.badge}
            </p>
            <h1 className="mt-3 break-words text-3xl font-semibold sm:text-4xl">{page.title}</h1>
            <p className="mt-4 text-base leading-7 text-body sm:text-lg">{page.intro}</p>
          </div>

          <LegalSections sections={page.sections} alwaysOpen />

          <nav className="mt-6 flex flex-wrap justify-center gap-2" aria-label={page.title}>
            {LINKS[language]
              .filter((link) => link.href !== path)
              .map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="premium-button-secondary min-h-11 px-5 py-2.5 text-sm"
                >
                  {link.label}
                </Link>
              ))}
          </nav>
        </div>
      </section>

      <Footer />
    </main>
  );
}
