"use client";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  getConfirmedProfile,
  getCurrentUser,
  isEmailConfirmed,
  logoutUser,
} from "@/lib/auth";
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
  const { t } = useLanguage();

  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState("");
  const [showBusinessDashboard, setShowBusinessDashboard] = useState(false);
  const [showBusinessRegister, setShowBusinessRegister] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
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
    router.replace("/");
    router.refresh();
  }

  const isActivePath = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  const linkClass = (href: string, surface: "desktop" | "mobile" = "desktop") => {
    const active = isActivePath(href);
    const base =
      surface === "mobile"
        ? "flex min-h-12 w-full items-center rounded-2xl px-4 py-3 text-base font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
        : "inline-flex min-h-10 items-center rounded-full px-4 py-2 text-sm font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300";

    if (active) {
      return `${base} bg-green-700 text-white shadow-sm`;
    }

    return `${base} ${
      surface === "mobile"
        ? "bg-[#F7F6EF] text-gray-800 hover:bg-green-50 hover:text-green-900"
        : "text-gray-700 hover:bg-white hover:text-gray-950"
    }`;
  };

  const ariaCurrent = (href: string) =>
    isActivePath(href) ? ("page" as const) : undefined;

  const showCustomerNavigation = role === "customer";
  const showBusinessNavigation =
    showBusinessDashboard || showBusinessRegister || !user;

  return (
    <nav className="sticky top-0 z-50 border-b border-black/5 bg-[#F7F6EF]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-5 sm:py-4 md:px-10">
        <Link
          href="/"
          onClick={() => setMobileMenu(false)}
          className="flex items-center gap-3 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
          aria-label={t("nav.home")}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-700 text-lg text-white shadow-sm sm:h-12 sm:w-12 sm:rounded-2xl sm:text-xl">
            🥡
          </div>

          <div>
            <p className="text-lg font-black leading-none text-green-800 sm:text-xl md:text-2xl">
              ArGadaagdo
            </p>
            <p className="hidden text-xs font-bold text-gray-500 md:block">
              {t("brand.tagline")}
            </p>
          </div>
        </Link>

        <div className="hidden items-center gap-2 lg:flex">
          <div className="flex items-center gap-1 rounded-full bg-white/60 p-1 shadow-sm ring-1 ring-black/5">
            <span className="px-3 text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">
              {showCustomerNavigation
                ? t("nav.customerSection")
                : t("nav.exploreSection")}
            </span>

            <Link
              href="/offers"
              className={linkClass("/offers")}
              aria-current={ariaCurrent("/offers")}
            >
              {t("common.browseOffers")}
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

            <Link
              href="/contact"
              className={linkClass("/contact")}
              aria-current={ariaCurrent("/contact")}
            >
              {t("nav.contact")}
            </Link>

            <Link
              href="/about"
              className={linkClass("/about")}
              aria-current={ariaCurrent("/about")}
            >
              {t("nav.about")}
            </Link>
          </div>

          {showBusinessNavigation && (
            <div className="flex items-center gap-1 rounded-full bg-white/60 p-1 shadow-sm ring-1 ring-black/5">
              <span className="px-3 text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">
                {t("nav.businessSection")}
              </span>

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
                  href="/business/register"
                  className={linkClass("/business/register")}
                  aria-current={ariaCurrent("/business/register")}
                >
                  {t("nav.forBusiness")}
                </Link>
              )}
            </div>
          )}

          {role === "admin" && (
            <div className="flex items-center gap-1 rounded-full bg-white/60 p-1 shadow-sm ring-1 ring-black/5">
              <span className="px-3 text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">
                {t("nav.adminSection")}
              </span>

              <Link
                href="/admin"
                className={linkClass("/admin")}
                aria-current={ariaCurrent("/admin")}
              >
                {t("nav.admin")}
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>

          {!authReady ? (
            <div className="hidden h-11 w-24 rounded-full bg-white/60 lg:block" />
          ) : user ? (
            <button
              onClick={handleLogout}
              className="hidden rounded-full bg-red-600 px-5 py-2.5 font-black text-white transition hover:bg-red-700 lg:block"
            >
              {t("nav.logout")}
            </button>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-full bg-green-700 px-5 py-2.5 font-black text-white transition hover:bg-green-800 lg:block"
            >
              {t("nav.signIn")}
            </Link>
          )}

          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-lg font-black text-gray-900 shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300 lg:hidden"
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
          className="border-t border-gray-100 bg-[#F7F6EF] px-4 py-4 sm:px-5 sm:py-5 lg:hidden"
        >
          <div className="grid gap-4">
            <div className="rounded-3xl bg-white p-3 shadow-sm">
              <p className="px-2 pb-2 text-xs font-black uppercase tracking-[0.18em] text-gray-400">
                {showCustomerNavigation
                  ? t("nav.customerSection")
                  : t("nav.exploreSection")}
              </p>
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
                  href="/faq"
                  onClick={() => setMobileMenu(false)}
                  className={linkClass("/faq", "mobile")}
                  aria-current={ariaCurrent("/faq")}
                >
                  {t("nav.faq")}
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
                  href="/about"
                  onClick={() => setMobileMenu(false)}
                  className={linkClass("/about", "mobile")}
                  aria-current={ariaCurrent("/about")}
                >
                  {t("nav.about")}
                </Link>
              </div>
            </div>

            {showBusinessNavigation && (
              <div className="rounded-3xl bg-white p-3 shadow-sm">
                <p className="px-2 pb-2 text-xs font-black uppercase tracking-[0.18em] text-gray-400">
                  {t("nav.businessSection")}
                </p>
                <div className="grid gap-2">
                  {showBusinessDashboard && (
                    <Link
                      href="/business/dashboard"
                      onClick={() => setMobileMenu(false)}
                      className={linkClass("/business/dashboard", "mobile")}
                      aria-current={ariaCurrent("/business/dashboard")}
                    >
                      {t("nav.dashboard")}
                    </Link>
                  )}

                  {(showBusinessRegister || !user) && (
                    <Link
                      href="/business/register"
                      onClick={() => setMobileMenu(false)}
                      className={linkClass("/business/register", "mobile")}
                      aria-current={ariaCurrent("/business/register")}
                    >
                      {t("nav.forBusiness")}
                    </Link>
                  )}
                </div>
              </div>
            )}

            {role === "admin" && (
              <div className="rounded-3xl bg-white p-3 shadow-sm">
                <p className="px-2 pb-2 text-xs font-black uppercase tracking-[0.18em] text-gray-400">
                  {t("nav.adminSection")}
                </p>
                <Link
                  href="/admin"
                  onClick={() => setMobileMenu(false)}
                  className={linkClass("/admin", "mobile")}
                  aria-current={ariaCurrent("/admin")}
                >
                  {t("nav.admin")}
                </Link>
              </div>
            )}

            <div className="rounded-3xl bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between rounded-2xl bg-[#F7F6EF] p-3">
                <span className="text-sm font-black text-gray-600">
                  {t("language.switcherLabel")}
                </span>
                <LanguageSwitcher />
              </div>

              <div className="mt-3 border-t border-gray-100 pt-3">
                {!authReady ? (
                  <div className="min-h-12 w-full rounded-full bg-white" />
                ) : user ? (
                  <button
                    onClick={handleLogout}
                    className="min-h-12 w-full rounded-full bg-red-600 px-5 py-3 font-black text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                  >
                    {t("nav.logout")}
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenu(false)}
                    className="block min-h-12 w-full rounded-full bg-green-700 px-5 py-3 text-center font-black text-white transition hover:bg-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
                  >
                    {t("nav.signIn")}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
