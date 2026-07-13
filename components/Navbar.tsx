"use client";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  getConfirmedProfile,
  getCurrentUser,
  isEmailConfirmed,
  logoutUser,
} from "@/lib/auth";
import { languageNames, supportedLanguages } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type NavbarBusiness = {
  owner_id: string;
  approved: boolean | string | null;
};

function isApprovedValue(value: boolean | string | null) {
  return value === true || String(value) === "true";
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();

  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState("");
  const [showBusinessDashboard, setShowBusinessDashboard] = useState(false);
  const [showBusinessRegister, setShowBusinessRegister] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const [moreExpanded, setMoreExpanded] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadNavbar() {
      const currentUser = await getCurrentUser();
      const isVerified = isEmailConfirmed(currentUser);
      const profileResult =
        currentUser && isVerified ? await getConfirmedProfile(2) : null;
      const currentRole =
        profileResult?.status === "confirmed"
          ? profileResult.profile.role || ""
          : "";
      let ownsBusiness = false;
      let ownsApprovedBusiness = false;

      if (currentUser && isVerified && currentRole === "business") {
        const { data } = await supabase
          .from("businesses")
          .select("owner_id, approved")
          .eq("owner_id", currentUser.id);

        const ownedBusinesses = (data || []) as NavbarBusiness[];

        ownsBusiness = ownedBusinesses.length > 0;
        ownsApprovedBusiness = ownedBusinesses.some((business) =>
          isApprovedValue(business.approved)
        );
      }

      if (!active) return;

      setUser(currentUser);
      setRole(currentRole);
      setShowBusinessDashboard(currentRole === "business" && ownsBusiness);
      setShowBusinessRegister(
        currentRole === "business" && !ownsBusiness && !ownsApprovedBusiness
      );
      setAuthReady(true);
    }

    void loadNavbar();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadNavbar();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await logoutUser();
    setUser(null);
    setRole("");
    setShowBusinessDashboard(false);
    setShowBusinessRegister(false);
    setAuthReady(true);
    setMobileMenu(false);
    setProfileMenu(false);
    router.replace("/");
    router.refresh();
  }

  const isActivePath = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  const linkClass = (href: string, surface: "desktop" | "mobile" = "desktop") => {
    const active = isActivePath(href);
    const base =
      surface === "mobile"
        ? "flex min-h-12 w-full items-center rounded-2xl px-4 py-3 text-base font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c7a5c]"
        : "inline-flex min-h-9 items-center rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c7a5c]";

    if (active) {
      return `${base} bg-white text-[#1a1815] shadow-[0_3px_16px_rgba(37,34,32,0.08)]`;
    }

    return `${base} ${
      surface === "mobile"
        ? "bg-[#ece7da] text-[#6b6558] hover:bg-white hover:text-[#1a1815]"
        : "text-[#6b6558] hover:bg-white/60 hover:text-[#1a1815]"
    }`;
  };

  const ariaCurrent = (href: string) =>
    isActivePath(href) ? ("page" as const) : undefined;

  const showCustomerNavigation = role === "customer";
  const nextLanguage =
    supportedLanguages.find((option) => option !== language) ?? language;

  return (
    <nav className="sticky top-0 z-50 border-b border-black/[0.06] bg-[#f2efe6]/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-5 md:px-10">
        <Link
          href="/"
          onClick={() => {
            setMobileMenu(false);
            setProfileMenu(false);
          }}
          className="flex min-h-11 items-center gap-3 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c7a5c]"
          aria-label={t("nav.home")}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1a1815] text-base font-bold text-white shadow-sm sm:h-10 sm:w-10">
            A
          </div>

          <div>
            <p className="text-lg font-bold leading-none tracking-tight text-[#1a1815] sm:text-xl">
              ArGadaagdo
            </p>
            <p className="hidden text-xs font-medium text-[#6b6558] md:block">
              {t("brand.tagline")}
            </p>
          </div>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          <Link
            href="/offers"
            className={linkClass("/offers")}
            aria-current={ariaCurrent("/offers")}
          >
            {t("common.browseOffers")}
          </Link>

          <Link
            href="/businesses"
            className={linkClass("/businesses")}
            aria-current={ariaCurrent("/businesses")}
          >
            {t("nav.businesses")}
          </Link>

          <Link
            href="/discover"
            className={linkClass("/discover")}
            aria-current={ariaCurrent("/discover")}
          >
            {t("nav.discover")}
          </Link>

          {showCustomerNavigation && (
            <Link
              href="/favorites"
              className={linkClass("/favorites")}
              aria-current={ariaCurrent("/favorites")}
            >
              {t("nav.favorites")}
            </Link>
          )}

          {showCustomerNavigation && (
            <Link
              href="/orders"
              className={linkClass("/orders")}
              aria-current={ariaCurrent("/orders")}
            >
              {t("nav.orders")}
            </Link>
          )}

          <Link
            href="/faq"
            className={linkClass("/faq")}
            aria-current={ariaCurrent("/faq")}
          >
            {t("nav.faq")}
          </Link>

          {showBusinessDashboard && (
            <Link
              href="/business/dashboard"
              className={linkClass("/business/dashboard")}
              aria-current={ariaCurrent("/business/dashboard")}
            >
              {t("nav.dashboard")}
            </Link>
          )}

          {(showBusinessRegister || !user) && (
            <Link
              href="/for-businesses"
              className={linkClass("/for-businesses")}
              aria-current={ariaCurrent("/for-businesses")}
            >
              {t("nav.forBusiness")}
            </Link>
          )}

          {role === "admin" && (
            <Link
              href="/admin"
              className={linkClass("/admin")}
              aria-current={ariaCurrent("/admin")}
            >
              {t("nav.admin")}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>

          {!authReady ? (
            <div className="hidden h-11 w-24 rounded-full bg-white/60 lg:block" />
          ) : user ? (
            <div className="relative hidden lg:block">
              <button
                onClick={() => setProfileMenu((current) => !current)}
                className="flex min-h-11 items-center gap-3 rounded-full bg-[#1a1815] py-1.5 pl-2 pr-4 font-semibold text-white shadow-[0_3px_16px_rgba(37,34,32,0.14)] transition hover:bg-[#2c2822] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c7a5c]"
                aria-haspopup="menu"
                aria-expanded={profileMenu}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-[#1a1815]">
                  {(user.email || "A").slice(0, 1).toUpperCase()}
                </span>
                <span>{t("nav.profile")}</span>
              </button>

              {profileMenu && (
                <div
                  className="absolute right-0 mt-3 w-64 rounded-3xl bg-white p-2 shadow-[0_24px_70px_rgba(37,34,32,0.18)]"
                  role="menu"
                >
                  <div className="px-4 py-3">
                    <p className="truncate text-sm font-semibold text-[#1a1815]">
                      {user.email}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a8272]">
                      {role || t("nav.customerSection")}
                    </p>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setProfileMenu(false)}
                    className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[#6b6558] transition hover:bg-[#ece7da] hover:text-[#1a1815] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c7a5c]"
                    role="menuitem"
                  >
                    {t("nav.profile")}
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setProfileMenu(false)}
                    className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[#6b6558] transition hover:bg-[#ece7da] hover:text-[#1a1815] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c7a5c]"
                    role="menuitem"
                  >
                    {t("nav.settings")}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="mt-1 min-h-11 w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold text-[#6b6558] transition hover:bg-[#1a1815] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c7a5c]"
                    role="menuitem"
                  >
                    {t("nav.logout")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-full bg-[#1a1815] px-5 py-2.5 font-semibold text-white shadow-[0_3px_16px_rgba(37,34,32,0.14)] transition hover:bg-[#2c2822] lg:block"
            >
              {t("nav.signIn")}
            </Link>
          )}

          <button
            onClick={() => setLanguage(nextLanguage)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-black/[0.06] bg-white text-lg shadow-[0_3px_16px_rgba(37,34,32,0.06)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c7a5c] lg:hidden"
            aria-label={t("language.switcherLabel")}
          >
            <span aria-hidden="true">
              {Array.from(languageNames[language]).slice(0, 2).join("")}
            </span>
          </button>

          <button
            onClick={() => {
              setMobileMenu(!mobileMenu);
              setProfileMenu(false);
            }}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-black/[0.06] bg-white px-3 py-2 text-lg font-semibold text-[#1a1815] shadow-[0_3px_16px_rgba(37,34,32,0.06)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c7a5c] lg:hidden"
            aria-label={mobileMenu ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={mobileMenu}
            aria-controls="mobile-navigation"
          >
            {mobileMenu ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {mobileMenu && (
        <div
          id="mobile-navigation"
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-t border-black/[0.06] bg-[#f2efe6] px-4 py-4 sm:px-5 sm:py-5 lg:hidden"
        >
          <div className="grid gap-4">
            {/* Primary: the handful of things a customer actually needs
                day-to-day. Kept deliberately short. */}
            <div className="rounded-3xl bg-white p-3 shadow-[0_3px_16px_rgba(37,34,32,0.06)]">
              <div className="grid gap-2">
                <Link
                  href="/offers"
                  onClick={() => setMobileMenu(false)}
                  className={linkClass("/offers", "mobile")}
                  aria-current={ariaCurrent("/offers")}
                >
                  {t("common.browseOffers")}
                </Link>

                {showCustomerNavigation && (
                  <Link
                    href="/favorites"
                    onClick={() => setMobileMenu(false)}
                    className={linkClass("/favorites", "mobile")}
                    aria-current={ariaCurrent("/favorites")}
                  >
                    {t("nav.favorites")}
                  </Link>
                )}

                {showCustomerNavigation && (
                  <Link
                    href="/orders"
                    onClick={() => setMobileMenu(false)}
                    className={linkClass("/orders", "mobile")}
                    aria-current={ariaCurrent("/orders")}
                  >
                    {t("nav.orders")}
                  </Link>
                )}

                <Link
                  href={user ? "/profile" : "/login"}
                  onClick={() => setMobileMenu(false)}
                  className={linkClass(user ? "/profile" : "/login", "mobile")}
                  aria-current={ariaCurrent(user ? "/profile" : "/login")}
                >
                  {user ? t("nav.profile") : t("nav.signIn")}
                </Link>

                {showBusinessDashboard ? (
                  <Link
                    href="/business/dashboard"
                    onClick={() => setMobileMenu(false)}
                    className={linkClass("/business/dashboard", "mobile")}
                    aria-current={ariaCurrent("/business/dashboard")}
                  >
                    {t("nav.dashboard")}
                  </Link>
                ) : (
                  (showBusinessRegister || !user) && (
                    <Link
                      href="/for-businesses"
                      onClick={() => setMobileMenu(false)}
                      className={linkClass("/for-businesses", "mobile")}
                      aria-current={ariaCurrent("/for-businesses")}
                    >
                      {t("nav.forBusiness")}
                    </Link>
                  )
                )}
              </div>
            </div>

            {/* More: everything else, one destination each, collapsed by
                default so it doesn't compete with the primary actions. */}
            <div className="rounded-3xl bg-white p-3 shadow-[0_3px_16px_rgba(37,34,32,0.06)]">
              <button
                type="button"
                onClick={() => setMoreExpanded((current) => !current)}
                className="flex min-h-12 w-full items-center justify-between rounded-2xl px-4 py-3 text-base font-semibold text-[#6b6558] transition hover:bg-[#ece7da] hover:text-[#1a1815] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c7a5c]"
                aria-expanded={moreExpanded}
                aria-controls="mobile-more-links"
              >
                <span>{t("nav.more")}</span>
                <span
                  className={`transition-transform ${moreExpanded ? "rotate-180" : ""}`}
                  aria-hidden="true"
                >
                  ⌄
                </span>
              </button>

              {moreExpanded && (
                <div id="mobile-more-links" className="mt-2 grid gap-2">
                  <Link
                    href="/discover"
                    onClick={() => setMobileMenu(false)}
                    className={linkClass("/discover", "mobile")}
                    aria-current={ariaCurrent("/discover")}
                  >
                    {t("nav.discover")}
                  </Link>

                  <Link
                    href="/businesses"
                    onClick={() => setMobileMenu(false)}
                    className={linkClass("/businesses", "mobile")}
                    aria-current={ariaCurrent("/businesses")}
                  >
                    {t("nav.businesses")}
                  </Link>

                  <Link
                    href="/faq"
                    onClick={() => setMobileMenu(false)}
                    className={linkClass("/faq", "mobile")}
                    aria-current={ariaCurrent("/faq")}
                  >
                    {t("nav.faq")}
                  </Link>

                  <Link
                    href="/about"
                    onClick={() => setMobileMenu(false)}
                    className={linkClass("/about", "mobile")}
                    aria-current={ariaCurrent("/about")}
                  >
                    {t("nav.about")}
                  </Link>

                  <Link
                    href="/contact"
                    onClick={() => setMobileMenu(false)}
                    className={linkClass("/contact", "mobile")}
                    aria-current={ariaCurrent("/contact")}
                  >
                    {t("nav.contact")}
                  </Link>

                  <Link
                    href="/support"
                    onClick={() => setMobileMenu(false)}
                    className={linkClass("/support", "mobile")}
                    aria-current={ariaCurrent("/support")}
                  >
                    {t("nav.support")}
                  </Link>

                  <Link
                    href="/privacy"
                    onClick={() => setMobileMenu(false)}
                    className={linkClass("/privacy", "mobile")}
                    aria-current={ariaCurrent("/privacy")}
                  >
                    {t("nav.privacy")}
                  </Link>

                  <Link
                    href="/terms"
                    onClick={() => setMobileMenu(false)}
                    className={linkClass("/terms", "mobile")}
                    aria-current={ariaCurrent("/terms")}
                  >
                    {t("nav.terms")}
                  </Link>

                  {user && (
                    <Link
                      href="/settings"
                      onClick={() => setMobileMenu(false)}
                      className={linkClass("/settings", "mobile")}
                      aria-current={ariaCurrent("/settings")}
                    >
                      {t("nav.settings")}
                    </Link>
                  )}

                  {role === "admin" && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenu(false)}
                      className={linkClass("/admin", "mobile")}
                      aria-current={ariaCurrent("/admin")}
                    >
                      {t("nav.admin")}
                    </Link>
                  )}
                </div>
              )}
            </div>

            {authReady && user && (
              <button
                onClick={handleLogout}
                className="min-h-12 w-full rounded-full bg-[#1a1815] px-5 py-3 font-semibold text-white transition hover:bg-[#2c2822] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c7a5c]"
              >
                {t("nav.logout")}
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
