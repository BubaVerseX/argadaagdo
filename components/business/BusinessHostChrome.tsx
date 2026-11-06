"use client";

import BrandMark from "@/components/BrandMark";
import { LayoutGridIcon, LogOutIcon, UserIcon, XIcon } from "@/components/icons";
import { languageShortNames, type Language } from "@/lib/i18n";
import { siteUrl } from "@/lib/site";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/** One 44px button that switches between Georgian and English. */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const { language, setLanguage } = useLanguage();
  const next: Language = language === "ka" ? "en" : "ka";

  return (
    <button
      type="button"
      onClick={() => setLanguage(next)}
      aria-label={languageShortNames[next]}
      lang={next}
      className={`ui-card flex min-h-11 min-w-11 items-center justify-center rounded-full px-2 text-xs font-bold text-body transition hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-mint ${className}`}
    >
      {next.toUpperCase()}
    </button>
  );
}

/**
 * Header for business.argadaagdo.ge: logo, dashboard, account, language.
 * Customer pages live on the other host, so nothing here links to them.
 */
export function BusinessHostNavbar({
  authReady,
  signedIn,
  email,
  showDashboard,
  onLogout,
}: {
  authReady: boolean;
  signedIn: boolean;
  email: string | null;
  showDashboard: boolean;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const text = (ka: string, en: string) => (language === "ka" ? ka : en);
  const [menuOpen, setMenuOpen] = useState(false);
  const onDashboard = pathname.startsWith("/business/dashboard");
  const pill =
    "flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-mint";

  return (
    <nav
      data-web-chrome
      className="theme-forest sticky top-[var(--safe-area-inset-top,env(safe-area-inset-top,0px))] z-50 border-b border-line bg-page px-4 py-3 sm:px-5 md:px-10"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className="flex min-h-11 min-w-0 items-center rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
        >
          <BrandMark tagline={text("ბიზნესისთვის", "For business")} />
        </Link>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {showDashboard && (
            <Link
              href="/business/dashboard"
              aria-current={onDashboard ? "page" : undefined}
              aria-label={text("პანელი", "Dashboard")}
              className={`${pill} px-3 ${onDashboard ? "ui-well text-mint" : "ui-card text-body"}`}
            >
              <LayoutGridIcon className="h-5 w-5" strokeWidth={1.8} />
              <span className="hidden sm:inline">{text("პანელი", "Dashboard")}</span>
            </Link>
          )}

          <LanguageToggle />

          {!authReady ? (
            <div className="ui-card h-11 w-11 rounded-full" />
          ) : signedIn ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-controls="business-account-menu"
                aria-label={text("ანგარიში", "Account")}
                className={`${pill} ${menuOpen ? "ui-well text-mint" : "ui-card text-body"}`}
              >
                {menuOpen ? (
                  <XIcon className="h-5 w-5" strokeWidth={1.8} />
                ) : (
                  <UserIcon className="h-5 w-5" strokeWidth={1.8} />
                )}
              </button>

              {menuOpen && (
                <div
                  id="business-account-menu"
                  role="menu"
                  className="ui-card absolute right-0 mt-3 w-64 rounded-3xl p-3"
                >
                  {email && (
                    <p className="truncate px-3 py-2 text-sm font-semibold text-muted">{email}</p>
                  )}
                  <Link
                    href="/profile"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-body transition hover:text-cream"
                  >
                    {text("პროფილი", "Profile")}
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                    className="premium-button mt-2 flex w-full items-center justify-center gap-2"
                  >
                    <LogOutIcon className="h-4 w-4" strokeWidth={1.8} />
                    {text("გასვლა", "Sign out")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              aria-current={pathname === "/login" ? "page" : undefined}
              className={`${pill} ui-card px-4 text-body`}
            >
              {text("შესვლა", "Sign in")}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

/** Footer for business.argadaagdo.ge. */
export function BusinessHostFooter() {
  const { language } = useLanguage();
  const text = (ka: string, en: string) => (language === "ka" ? ka : en);
  const linkClass =
    "flex min-h-11 items-center rounded-lg px-1 transition hover:text-mint focus:outline-none focus-visible:ring-2 focus-visible:ring-mint";

  return (
    <footer data-web-chrome className="mt-16 border-t border-line px-4 py-6 sm:px-6 md:px-12">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm font-semibold text-body">
        <div className="flex flex-wrap gap-x-4">
          <Link href="/terms" prefetch={false} className={linkClass}>
            {text("წესები", "Terms")}
          </Link>
          <Link href="/privacy" prefetch={false} className={linkClass}>
            {text("კონფიდენციალურობა", "Privacy")}
          </Link>
          <Link href="/support" prefetch={false} className={linkClass}>
            {text("დახმარება", "Support")}
          </Link>
        </div>
        <a href={siteUrl} className={linkClass}>
          {text("მომხმარებლის საიტი →", "Customer site →")}
        </a>
      </div>
    </footer>
  );
}
