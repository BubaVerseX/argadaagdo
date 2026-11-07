"use client";

import { withNativeChrome } from "@/components/native/NativeSwitch";
import { NativeSubpageBar } from "@/components/native/screens";
import BrandMark from "@/components/BrandMark";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { BusinessHostNavbar, LanguageToggle } from "@/components/business/BusinessHostChrome";
import {
  getConfirmedProfile,
  getCurrentUser,
  isEmailConfirmed,
  logoutUser,
} from "@/lib/auth";
import { useHostKind } from "@/lib/useHostKind";
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

// shortLabel is used by the mobile bottom bar, where five Georgian labels
// must fit on a 320-375px screen.
type TabItem =
  | { kind: "link"; href: string; label: string; shortLabel?: string; Icon: ComponentType<IconProps> }
  | { kind: "action"; id: string; label: string; shortLabel?: string; Icon: ComponentType<IconProps>; onClick: () => void };

function isApprovedValue(value: boolean | string | null) {
  return value === true || String(value) === "true";
}

function Navbar({
  variant = "app",
  hideBottomNav = false,
}: {
  /** "app": floating bottom navigation. "web": quiet links for the public website. */
  variant?: "app" | "web";
  /** Hides the floating navigation on screens with their own fixed action bar. */
  hideBottomNav?: boolean;
}) {
  const isAppStyle = variant === "app";
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const hostKind = useHostKind();
  // Until the host is known (server render, hydration) links don't prefetch:
  // on the business host these customer pages redirect to the other domain,
  // and a cross-origin prefetch fails with a CORS error.
  const prefetch = hostKind === "customer" ? undefined : false;

  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState("");
  const [showBusinessDashboard, setShowBusinessDashboard] = useState(false);
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
        const { data } = await supabase.rpc("get_my_businesses");

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
    setAccountMenu(false);
    router.replace("/");
    router.refresh();
  }

  const isActivePath = (href: string) => {
    // In-page section links ("/business/dashboard#business-offers") share the
    // page's path; only the plain page link is the current page, otherwise
    // three tabs are highlighted and announced as current at once.
    if (href.includes("#")) return false;
    // Offer pages open from the list on Discover.
    if (href === "/discover" && pathname.startsWith("/offers/")) return true;

    const cleanHref = href;
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
    const discover: TabItem = { kind: "link", href: "/discover", label: t("nav.discover"), Icon: MapPinIcon };
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
        discover,
        { kind: "link", href: "/businesses", label: t("nav.businesses"), Icon: StoreIcon },
        { kind: "link", href: "/admin", label: t("nav.admin"), Icon: ShieldIcon },
        profile,
      ];
    }

    if (showCustomerNavigation) {
      return [
        home,
        discover,
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
        discover,
        more,
        profile,
      ];
    }

    return [
      home,
      discover,
      more,
    ];
  })();

  if (hostKind === "business") {
    return (
      <BusinessHostNavbar
        authReady={authReady}
        signedIn={Boolean(user)}
        email={user?.email ?? null}
        showDashboard={role === "business"}
        onLogout={() => void handleLogout()}
      />
    );
  }

  return (
    <nav
      data-web-chrome
      className={`theme-forest sticky top-[var(--safe-area-inset-top,env(safe-area-inset-top,0px))] z-50 bg-page px-4 py-3 sm:px-5 md:px-10 ${
        isAppStyle ? "" : "border-b border-line"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link
                prefetch={prefetch}
          href="/"
          onClick={closeAllMenus}
          className="flex min-h-11 items-center gap-3 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
          aria-label={t("brand.name")}
        >
          <BrandMark
            tagline={t("brand.tagline")}
            nameClassName="text-[15px] font-semibold leading-none text-cream min-[400px]:text-lg sm:text-xl"
          />
        </Link>

        {/* Desktop horizontal nav — ui-card pill row, mobile relies on
            the fixed bottom tab bar instead. */}
        <div className={`hidden items-center gap-1 lg:flex ${isAppStyle ? "ui-card rounded-full p-1.5" : ""}`}>
          {tabs
            .filter((tabItem): tabItem is Extract<TabItem, { kind: "link" }> => tabItem.kind === "link")
            .filter((tabItem) => tabItem.href !== "/profile")
            .map((tabItem) => {
              const active = isActivePath(tabItem.href);
              return (
                <Link
                prefetch={prefetch}
                  key={tabItem.href}
                  href={tabItem.href}
                  aria-current={ariaCurrent(tabItem.href)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-mint ${ active
                      ? "action-pill"
                      : "text-body hover:text-cream"
                  }`}
                >
                  <tabItem.Icon className="h-4 w-4" strokeWidth={1.8} />
                  {tabItem.label}
                </Link>
              );
            })}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>
          <LanguageToggle className="lg:hidden" />

          {/* The bell (no notifications yet) makes room for KA/EN on the
              narrowest phones. */}
          <div className="relative max-[379px]:hidden">
            <button
              type="button"
              onClick={() => {
                setNotifMenu((current) => !current);
                setAccountMenu(false);
              }}
              className="ui-card flex min-h-11 min-w-11 items-center justify-center rounded-full text-body transition focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
              aria-haspopup="menu"
              aria-expanded={notifMenu}
              aria-label={t("nav.notifications")}
            >
              <BellIcon className="h-5 w-5" strokeWidth={1.8} />
            </button>

            {notifMenu && (
              <div
                role="menu"
                className="ui-card absolute right-0 mt-3 w-64 rounded-3xl p-4"
              >
                <p className="text-sm font-semibold text-muted">
                  {t("nav.noNotifications")}
                </p>
              </div>
            )}
          </div>

          {!authReady ? (
            <div className="ui-card h-11 w-11 rounded-full" />
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setAccountMenu((current) => !current);
                  setNotifMenu(false);
                }}
                className={`flex min-h-11 min-w-11 items-center justify-center rounded-full text-body transition focus:outline-none focus-visible:ring-2 focus-visible:ring-mint ${ accountMenu ? "ui-well text-mint" : "ui-card"
                }`}
                aria-haspopup="menu"
                aria-expanded={accountMenu}
                aria-label={t("nav.more")}
                aria-controls="account-menu"
              >
                {accountMenu ? (
                  <XIcon className="h-5 w-5" strokeWidth={1.8} />
                ) : (
                  <MoreHorizontalIcon className="h-5 w-5" strokeWidth={1.8} />
                )}
              </button>

              {accountMenu && (
                <div
                  id="account-menu"
                  role="menu"
                  className="ui-card absolute right-0 mt-3 max-h-[calc(100dvh-6rem)] w-72 overflow-y-auto overscroll-contain rounded-3xl p-3"
                >
                  {user && (
                    <div className="px-3 py-2">
                      <p className="truncate text-sm font-semibold text-cream">
                        {user.email}
                      </p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                        {role || t("nav.customerSection")}
                      </p>
                    </div>
                  )}

                  {user && (
                    <div className="grid gap-1 px-1">
                      <Link
                prefetch={prefetch}
                        href="/profile"
                        onClick={() => setAccountMenu(false)}
                        className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-body transition hover:text-cream"
                        role="menuitem"
                      >
                        {t("nav.profile")}
                      </Link>
                      <Link
                prefetch={prefetch}
                        href="/settings"
                        onClick={() => setAccountMenu(false)}
                        className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-body transition hover:text-cream"
                        role="menuitem"
                      >
                        {t("nav.settings")}
                      </Link>
                      {showBusinessDashboard && (
                        <Link
                prefetch={prefetch}
                          href="/business/dashboard"
                          onClick={() => setAccountMenu(false)}
                          className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-body transition hover:text-cream lg:hidden"
                          role="menuitem"
                        >
                          {t("nav.dashboard")}
                        </Link>
                      )}
                      {isAdmin && (
                        <Link
                prefetch={prefetch}
                          href="/admin"
                          onClick={() => setAccountMenu(false)}
                          className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-body transition hover:text-cream lg:hidden"
                          role="menuitem"
                        >
                          {t("nav.admin")}
                        </Link>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setMoreExpanded((current) => !current)}
                    className="mt-2 flex min-h-11 w-full items-center justify-between rounded-2xl px-3 text-sm font-semibold text-body transition hover:text-cream"
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
                prefetch={prefetch}
                        href="/discover"
                        onClick={() => setAccountMenu(false)}
                        className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-body transition hover:text-cream"
                        role="menuitem"
                      >
                        {t("nav.discover")}
                      </Link>
                      <Link
                prefetch={prefetch}
                        href="/businesses"
                        onClick={() => setAccountMenu(false)}
                        className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-body transition hover:text-cream"
                        role="menuitem"
                      >
                        {t("nav.businesses")}
                      </Link>
                      <Link
                prefetch={prefetch}
                        href="/faq"
                        onClick={() => setAccountMenu(false)}
                        className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-body transition hover:text-cream"
                        role="menuitem"
                      >
                        {t("nav.faq")}
                      </Link>
                      <Link
                prefetch={prefetch}
                        href="/about"
                        onClick={() => setAccountMenu(false)}
                        className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-body transition hover:text-cream"
                        role="menuitem"
                      >
                        {t("nav.about")}
                      </Link>
                      <Link
                prefetch={prefetch}
                        href="/contact"
                        onClick={() => setAccountMenu(false)}
                        className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-body transition hover:text-cream"
                        role="menuitem"
                      >
                        {t("nav.contact")}
                      </Link>
                      <Link
                prefetch={prefetch}
                        href="/support"
                        onClick={() => setAccountMenu(false)}
                        className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-body transition hover:text-cream"
                        role="menuitem"
                      >
                        {t("nav.support")}
                      </Link>
                      <Link
                prefetch={prefetch}
                        href="/privacy"
                        onClick={() => setAccountMenu(false)}
                        className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-body transition hover:text-cream"
                        role="menuitem"
                      >
                        {t("nav.privacy")}
                      </Link>
                      <Link
                prefetch={prefetch}
                        href="/terms"
                        onClick={() => setAccountMenu(false)}
                        className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold text-body transition hover:text-cream"
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

          {!authReady ? (
            <div className="ui-card h-11 w-11 rounded-full" />
          ) : (
            <Link
                prefetch={prefetch}
              href={user ? "/profile" : "/login"}
              onClick={closeAllMenus}
              aria-label={user ? t("nav.profile") : t("nav.signIn")}
              aria-current={ariaCurrent(user ? "/profile" : "/login")}
              className="ui-card flex min-h-11 min-w-11 items-center justify-center rounded-full text-body transition focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
            >
              <UserIcon className="h-5 w-5" strokeWidth={1.8} />
            </Link>
          )}
        </div>
      </div>

      {/* Fixed bottom navigation, the primary mobile navigation. */}
      {isAppStyle && !hideBottomNav && (
        <div className="fixed inset-x-3 bottom-[calc(0.75rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] z-50 min-[380px]:inset-x-5 lg:hidden">
          <div className="tab-pill mx-auto flex h-16 w-full max-w-md items-center justify-around gap-0.5 px-1.5">
            {tabs.map((tabItem) => {
              const key = tabItem.kind === "link" ? tabItem.href : tabItem.id;
              const active = tabItem.kind === "link" && isActivePath(tabItem.href);
              const label = tabItem.shortLabel ?? tabItem.label;
              const pillClass = `flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-2xl text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-mint ${
                active ? "action-pill px-3" : "text-mint"
              }`;
              const content = (
                <>
                  <tabItem.Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                  <span className={active ? "whitespace-nowrap" : "sr-only"}>{label}</span>
                </>
              );

              return tabItem.kind === "action" ? (
                <button key={key} type="button" onClick={tabItem.onClick} className={pillClass}>
                  {content}
                </button>
              ) : (
                <Link
                prefetch={prefetch}
                  key={key}
                  href={tabItem.href}
                  aria-current={ariaCurrent(tabItem.href)}
                  className={pillClass}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div
        className={`tab-bar fixed inset-x-0 bottom-0 z-50 pb-[var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px))] lg:hidden ${
          isAppStyle ? "hidden" : ""
        }`}
      >
        <div className="mx-auto flex w-full max-w-md items-stretch justify-between gap-1 px-2 pb-1.5 pt-2 min-[360px]:px-3">
          {tabs.map((tabItem) => {
            const key = tabItem.kind === "link" ? tabItem.href : tabItem.id;
            const active = tabItem.kind === "link" && isActivePath(tabItem.href);
            const commonClass = `flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-1.5 text-[10px] min-[360px]:px-1 font-medium min-[390px]:text-[11px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-mint ${
              active ? "text-mint" : "text-body-2"
            }`;
            const iconClass = `flex h-7 w-12 items-center justify-center rounded-full transition ${
              active ? "action-pill" : ""
            }`;

            if (tabItem.kind === "action") {
              return (
                <button key={key} type="button" onClick={tabItem.onClick} className={commonClass}>
                  <span className={iconClass}>
                    <tabItem.Icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <span>{tabItem.shortLabel ?? tabItem.label}</span>
                </button>
              );
            }

            return (
              <Link
                prefetch={prefetch}
                key={key}
                href={tabItem.href}
                aria-current={ariaCurrent(tabItem.href)}
                className={commonClass}
              >
                <span className={iconClass}>
                    <tabItem.Icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                <span>{tabItem.shortLabel ?? tabItem.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default withNativeChrome(Navbar, NativeSubpageBar);
