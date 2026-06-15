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

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();

  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState("");
  const [showBusinessDashboard, setShowBusinessDashboard] = useState(false);
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

      if (!active) return;

      setUser(currentUser);
      setRole(currentRole);
      setShowBusinessDashboard(currentRole === "business");
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
    setAuthReady(true);
    setMobileMenu(false);
    router.replace("/");
    router.refresh();
  }

  const linkClass = (href: string) => {
    const active = pathname === href;

    return `rounded-full px-4 py-2 font-bold transition ${
      active
        ? "bg-green-100 text-green-800"
        : "text-gray-700 hover:bg-white hover:text-gray-950"
    }`;
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-black/5 bg-[#F7F6EF]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-5 sm:py-4 md:px-10">
        <Link href="/" className="flex items-center gap-3">
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

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/offers" className={linkClass("/offers")}>
            {t("nav.offers")}
          </Link>

          {user && (
            <Link href="/orders" className={linkClass("/orders")}>
              {t("nav.orders")}
            </Link>
          )}

          {role === "customer" && (
            <Link href="/favorites" className={linkClass("/favorites")}>
              {t("nav.favorites")}
            </Link>
          )}

          {showBusinessDashboard && (
            <Link
              href="/business/dashboard"
              className={linkClass("/business/dashboard")}
            >
              {t("nav.dashboard")}
            </Link>
          )}

          {role === "admin" && (
            <Link href="/admin" className={linkClass("/admin")}>
              {t("nav.admin")}
            </Link>
          )}

          {!user && (
            <Link
              href="/business/register"
              className={linkClass("/business/register")}
            >
              {t("nav.forBusiness")}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>

          {!authReady ? (
            <div className="hidden h-11 w-24 rounded-full bg-white/60 md:block" />
          ) : user ? (
            <button
              onClick={handleLogout}
              className="hidden rounded-full bg-red-600 px-5 py-2.5 font-black text-white transition hover:bg-red-700 md:block"
            >
              {t("nav.logout")}
            </button>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-full bg-green-700 px-5 py-2.5 font-black text-white transition hover:bg-green-800 md:block"
            >
              {t("nav.signIn")}
            </Link>
          )}

          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-lg font-black text-gray-900 shadow-sm md:hidden"
            aria-label={mobileMenu ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={mobileMenu}
          >
            {mobileMenu ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {mobileMenu && (
        <div className="border-t border-gray-100 bg-[#F7F6EF] px-4 py-4 sm:px-5 sm:py-5 md:hidden">
          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm">
              <span className="text-sm font-black text-gray-600">
                {t("language.switcherLabel")}
              </span>
              <LanguageSwitcher />
            </div>

            <Link
              href="/offers"
              onClick={() => setMobileMenu(false)}
              className={linkClass("/offers")}
            >
              {t("nav.offers")}
            </Link>

            {user && (
              <Link
                href="/orders"
                onClick={() => setMobileMenu(false)}
                className={linkClass("/orders")}
              >
                {t("nav.orders")}
              </Link>
            )}

            {role === "customer" && (
              <Link
                href="/favorites"
                onClick={() => setMobileMenu(false)}
                className={linkClass("/favorites")}
              >
                {t("nav.favorites")}
              </Link>
            )}

            {showBusinessDashboard && (
              <Link
                href="/business/dashboard"
                onClick={() => setMobileMenu(false)}
                className={linkClass("/business/dashboard")}
              >
                {t("nav.dashboard")}
              </Link>
            )}

            {role === "admin" && (
              <Link
                href="/admin"
                onClick={() => setMobileMenu(false)}
                className={linkClass("/admin")}
              >
                {t("nav.admin")}
              </Link>
            )}

            {!user && (
              <Link
                href="/business/register"
                onClick={() => setMobileMenu(false)}
                className={linkClass("/business/register")}
              >
                {t("nav.forBusiness")}
              </Link>
            )}

            <div className="mt-3 border-t pt-4">
              {!authReady ? (
                <div className="min-h-12 w-full rounded-full bg-white" />
              ) : user ? (
                <button
                  onClick={handleLogout}
                  className="min-h-12 w-full rounded-full bg-red-600 px-5 py-3 font-black text-white"
                >
                  {t("nav.logout")}
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenu(false)}
                  className="block w-full rounded-full bg-green-700 px-5 py-3 text-center font-black text-white"
                >
                  {t("nav.signIn")}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
