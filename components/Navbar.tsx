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
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BellIcon,
  ChevronDownIcon,
  HeartIcon,
  HomeIcon,
  type IconProps,
  LogOutIcon,
  MoreHorizontalIcon,
  ReceiptIcon,
  SearchIcon,
  ShieldIcon,
  StoreIcon,
  TagIcon,
  LayoutGridIcon,
  MapPinIcon,
  UserIcon,
  XIcon,
} from "@/components/icons";

type NavbarBusiness = {
  owner_id: string;
  approved: boolean | string | null;
};

type TabItem =
  | { kind: "link"; href: string; label: string; Icon: ComponentType<IconProps> }
  | { kind: "action"; id: string; label: string; Icon: ComponentType<IconProps>; onClick: () => void };

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
  const [accountMenu, setAccountMenu] = useState(false);
  const [moreExpanded, setMoreExpanded] = useState(false);
  const [notifMenu, setNotifMenu] = useState(false);
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
    setAccountMenu(false);
    router.replace("/");
    router.refresh();
  }

  const isActivePath = (href: string) => {
    const cleanHref = href.split("#")[0];
    return (
      pathname === cleanHref ||
      (cleanHref !== "/" && pathname.startsWith(`${cleanHref}/`))
    );
  };

  const ariaCurrent = (href: string) =>
    isActivePath(href) ? ("page" as const) : undefined;

  const showCustomerNavigation = role === "customer";
  const isAdmin = role === "admin";

  function closeAllMenus() {
    setAccountMenu(false);
    setNotifMenu(false);
  }

  // Bottom tab bar (mobile) + desktop pill nav both read from this same
  // per-role tab list, so the two surfaces can never drift out of sync.
  const tabs: TabItem[] = (() => {
    const home: TabItem = { kind: "link", href: "/", label: t("nav.home"), Icon: HomeIcon };
    const browse: TabItem = {
      kind: "link",
      href: "/offers",
      label: t("nav.browse"),
      Icon: SearchIcon,
    };
    const more: TabItem = {
      kind: "action",
      id: "more",
      label: t("nav.more"),
      Icon: MoreHorizontalIcon,
      onClick: () => {
        setAccountMenu(true);
        setMoreExpanded(true);
      },
    };
    const profile: TabItem = {
      kind: "link",
      href: "/profile",
      label: t("nav.profile"),
      Icon: UserIcon,
    };

    if (showBusinessDashboard) {
      return [
        home,
        { kind: "link", href: "/business/dashboard", label: t("nav.dashboardTab"), Icon: LayoutGridIcon },
        { kind: "link", href: "/business/dashboard#business-offers", label: t("nav.offers"), Icon: TagIcon },
        { kind: "link", href: "/business/dashboard#business-reservations", label: t("nav.orders"), Icon: ReceiptIcon },
        profile,
      ];
    }

    if (isAdmin) {
      return [
        home,
        browse,
        { kind: "link", href: "/businesses", label: t("nav.businesses"), Icon: StoreIcon },
        { kind: "link", href: "/admin", label: t("nav.admin"), Icon: ShieldIcon },
        profile,
      ];
    }

    if (showCustomerNavigation) {
      return [
        home,
        browse,
        { kind: "link", href: "/favorites", label: t("nav.favorites"), Icon: HeartIcon },
        { kind: "link", href: "/orders", label: t("nav.orders"), Icon: ReceiptIcon },
        profile,
      ];
    }

    if (user) {
      // Signed in but role not yet confirmed/loaded (or business without an
      // owned business yet) — keep it functional with what we know.
      return [
        home,
        browse,
        { kind: "link", href: "/discover", label: t("nav.discover"), Icon: MapPinIcon },
        more,
        profile,
      ];
    }

    return [
      home,
      browse,
      { kind: "link", href: "/discover", label: t("nav.discover"), Icon: MapPinIcon },
      more,
      { kind: "link", href: "/login", label: t("nav.signIn"), Icon: UserIcon },
    ];
  })();

  return (
    <nav className="sticky top-0 z-50 bg-[#ece4d6] px-4 py-3 sm:px-5 md:px-10">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link
          href="/"
          onClick={closeAllMenus}
          className="flex min-h-11 items-center gap-3 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a67c52]"
          aria-label={t("nav.home")}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#a67c52] text-base font-bold text-white sm:h-10 sm:w-10">
            A
          </div>

          <div>
            <p className="text-lg font-extrabold leading-none tracking-[-0.02em] text-[#2e2a22] sm:text-xl">
              ArGadaagdo
            </p>
            <p className="hidden text-xs font-medium text-[#6b6152] md:block">
              {t("brand.tagline")}
            </p>
          </div>
        </Link>

        {/* Desktop horizontal nav — soft-raised pill row, mobile relies on
            the fixed bottom tab bar instead. */}
        <div className="soft-raised hidden items-center gap-1 rounded-full p-1.5 lg:flex">
          {tabs
            .filter((tabItem): tabItem is Extract<TabItem, { kind: "link" }> => tabItem.kind === "link")
            .map((tabItem) => {
              const active = isActivePath(tabItem.href);
              return (
                <Link
                  key={tabItem.href}
                  href={tabItem.href}
                  aria-current={ariaCurrent(tabItem.href)}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a67c52] ${
                    active
                      ? "soft-pressed text-[#a67c52]"
                      : "text-[#6b6152] hover:text-[#2e2a22]"
                  }`}
                >
                  <tabItem.Icon className="h-4 w-4" strokeWidth={1.8} />
                  {tabItem.label}
                </Link>
              );
            })}

          {(showBusinessRegister || !user) && (
            <Link
              href="/for-businesses"
              aria-current={ariaCurrent("/for-businesses")}
              className={`inline-flex min-h-9 items-center rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a67c52] ${
                isActivePath("/for-businesses")
                  ? "soft-pressed text-[#a67c52]"
                  : "text-[#6b6152] hover:text-[#2e2a22]"
              }`}
            >
              {t("nav.forBusiness")}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifMenu((current) => !current);
                setAccountMenu(false);
              }}
              className="soft-raised flex min-h-11 min-w-11 items-center justify-center rounded-full text-[#6b6152] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a67c52]"
              aria-haspopup="menu"
              aria-expanded={notifMenu}
              aria-label={t("nav.notifications")}
            >
              <BellIcon className="h-5 w-5" strokeWidth={1.8} />
            </button>

            {notifMenu && (
              <div
                role="menu"
                className="soft-raised absolute right-0 mt-3 w-64 rounded-3xl p-4"
              >
                <p className="text-sm font-semibold text-[#8a8072]">
                  {t("nav.noNotifications")}
                </p>
              </div>
            )}
          </div>

          {!authReady ? (
            <div className="soft-raised h-11 w-11 rounded-full" />
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setAccountMenu((current) => !current);
                  setNotifMenu(false);
                }}
                className={`flex min-h-11 min-w-11 items-center justify-center rounded-full text-[#6b6152] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a67c52] ${
                  accountMenu ? "soft-pressed text-[#a67c52]" : "soft-raised"
                }`}
                aria-haspopup="menu"
                aria-expanded={accountMenu}
                aria-label={accountMenu ? t("nav.closeAccount") : t("nav.openAccount")}
                aria-controls="account-menu"
              >
                {accountMenu ? (
                  <XIcon className="h-5 w-5" strokeWidth={1.8} />
                ) : (
                  <UserIcon className="h-5 w-5" strokeWidth={1.8} />
                )}
              </button>

              {accountMenu && (
                <div
                  id="account-menu"
                  role="menu"
                  className="soft-raised absolute right-0 mt-3 max-h-[calc(100dvh-6rem)] w-72 overflow-y-auto overscroll-contain rounded-3xl p-3"
                >
                  {user ? (
                    <div className="px-3 py-2">
                      <p className="truncate text-sm font-semibold text-[#2e2a22]">
                        {user.email}
                      </p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a8072]">
                        {role || t("nav.customerSection")}
                      </p>
                    </div>
                  ) : (
                    <div className="px-3 py-2">
                      <Link
                        href="/login"
                        onClick={() => setAccountMenu(false)}
                        className="premium-button w-full"
                        role="menuitem"
                      >
                        {t("nav.signIn")}
                      </Link>
                    </div>
                  )}

                  <div className="my-3 px-3 lg:hidden">
                    <LanguageSwitcher />
                  </div>

                  {user && (
                    <div className="grid gap-1 px-1">
                      <Link
                        href="/profile"
                        onClick={() => setAccountMenu(false)}
                        className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-[#6b6152] transition hover:text-[#2e2a22]"
                        role="menuitem"
                      >
                        {t("nav.profile")}
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setAccountMenu(false)}
                        className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-[#6b6152] transition hover:text-[#2e2a22]"
                        role="menuitem"
                      >
                        {t("nav.settings")}
                      </Link>
                      {showBusinessDashboard && (
                        <Link
                          href="/business/dashboard"
                          onClick={() => setAccountMenu(false)}
                          className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-[#6b6152] transition hover:text-[#2e2a22] lg:hidden"
                          role="menuitem"
                        >
                          {t("nav.dashboard")}
                        </Link>
                      )}
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setAccountMenu(false)}
                          className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-[#6b6152] transition hover:text-[#2e2a22] lg:hidden"
                          role="menuitem"
                        >
                          {t("nav.admin")}
                        </Link>
                      )}
                    </div>
                  )}

                  {(showBusinessRegister || !user) && (
                    <Link
                      href="/for-businesses"
                      onClick={() => setAccountMenu(false)}
                      className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-[#6b6152] transition hover:text-[#2e2a22] lg:hidden"
                      role="menuitem"
                    >
                      {t("nav.forBusiness")}
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => setMoreExpanded((current) => !current)}
                    className="mt-2 flex min-h-11 w-full items-center justify-between rounded-2xl px-3 text-sm font-semibold text-[#6b6152] transition hover:text-[#2e2a22]"
                    aria-expanded={moreExpanded}
                    aria-controls="account-more-links"
                  >
                    <span>{t("nav.more")}</span>
                    <ChevronDownIcon
                      className={`h-4 w-4 transition-transform ${moreExpanded ? "rotate-180" : ""}`}
                      strokeWidth={1.8}
                    />
                  </button>

                  {moreExpanded && (
                    <div id="account-more-links" className="grid gap-1 px-1 pt-1">
                      <Link
                        href="/discover"
                        onClick={() => setAccountMenu(false)}
                        className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-[#6b6152] transition hover:text-[#2e2a22]"
                        role="menuitem"
                      >
                        {t("nav.discover")}
                      </Link>
                      <Link
                        href="/businesses"
                        onClick={() => setAccountMenu(false)}
                        className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-[#6b6152] transition hover:text-[#2e2a22]"
                        role="menuitem"
                      >
                        {t("nav.businesses")}
                      </Link>
                      <Link
                        href="/faq"
                        onClick={() => setAccountMenu(false)}
                        className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-[#6b6152] transition hover:text-[#2e2a22]"
                        role="menuitem"
                      >
                        {t("nav.faq")}
                      </Link>
                      <Link
                        href="/about"
                        onClick={() => setAccountMenu(false)}
                        className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-[#6b6152] transition hover:text-[#2e2a22]"
                        role="menuitem"
                      >
                        {t("nav.about")}
                      </Link>
                      <Link
                        href="/contact"
                        onClick={() => setAccountMenu(false)}
                        className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-[#6b6152] transition hover:text-[#2e2a22]"
                        role="menuitem"
                      >
                        {t("nav.contact")}
                      </Link>
                      <Link
                        href="/support"
                        onClick={() => setAccountMenu(false)}
                        className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-[#6b6152] transition hover:text-[#2e2a22]"
                        role="menuitem"
                      >
                        {t("nav.support")}
                      </Link>
                      <Link
                        href="/privacy"
                        onClick={() => setAccountMenu(false)}
                        className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-[#6b6152] transition hover:text-[#2e2a22]"
                        role="menuitem"
                      >
                        {t("nav.privacy")}
                      </Link>
                      <Link
                        href="/terms"
                        onClick={() => setAccountMenu(false)}
                        className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-[#6b6152] transition hover:text-[#2e2a22]"
                        role="menuitem"
                      >
                        {t("nav.terms")}
                      </Link>
                    </div>
                  )}

                  {authReady && user && (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="premium-button mt-3 flex w-full items-center justify-center gap-2"
                    >
                      <LogOutIcon className="h-4 w-4" strokeWidth={1.8} />
                      {t("nav.logout")}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fixed floating bottom tab bar — primary mobile navigation. */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:hidden">
        <div className="soft-raised flex w-full max-w-md items-stretch justify-between gap-1 rounded-[28px] p-2">
          {tabs.map((tabItem) => {
            const key = tabItem.kind === "link" ? tabItem.href : tabItem.id;
            const active = tabItem.kind === "link" && isActivePath(tabItem.href);
            const commonClass = `flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-[11px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a67c52] ${
              active ? "soft-pressed text-[#a67c52]" : "text-[#8a8072]"
            }`;

            if (tabItem.kind === "action") {
              return (
                <button key={key} type="button" onClick={tabItem.onClick} className={commonClass}>
                  <tabItem.Icon className="h-5 w-5" strokeWidth={1.8} />
                  <span>{tabItem.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={key}
                href={tabItem.href}
                aria-current={ariaCurrent(tabItem.href)}
                className={commonClass}
              >
                <tabItem.Icon className="h-5 w-5" strokeWidth={1.8} />
                <span>{tabItem.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
