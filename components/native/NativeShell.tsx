"use client";

import {
  LayoutGridIcon,
  MapPinIcon,
  ReceiptIcon,
  UserIcon,
} from "@/components/icons";
import { getProfileById } from "@/lib/auth";
import { isNativeScreenUrl } from "@/lib/nativeBoot";
import { notifyNativeRouteChange } from "./NativeSwitch";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/useLanguage";
import { whenIdle } from "@/lib/whenIdle";
import { startPush } from "@/lib/push/client";
import AccountSheet from "./AccountSheet";
import { askForAccount } from "@/lib/accountGate";
import NativeBackground from "./NativeBackground";
import PushPrompt from "./PushPrompt";
import Link from "./AppLink";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useState } from "react";

// Screens with their own fixed action bar, or where tabs would only distract.
const HIDE_BAR = /^\/(offers\/|checkout\/|login|staff\/|offline)/;

function ScreenClassSync() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  // Keeps html.native-screen right across in-app navigation, before paint.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle(
      "native-screen",
      isNativeScreenUrl(pathname, search ? `?${search}` : "")
    );
    notifyNativeRouteChange();
  }, [pathname, search]);

  return null;
}

/** The floating bottom bar: Nearby, Orders, Profile. Guests get the account sheet for the last two. */
export default function NativeShell() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [role, setRole] = useState("");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  // A store's second tab is its panel. The role only changes that one link, and
  // the dashboard itself still checks it.
  useEffect(() => {
    let active = true;

    async function loadRole(userId: string | undefined) {
      if (active) setSignedIn(Boolean(userId));
      const profile = userId ? await getProfileById(userId, 1) : null;
      if (active) setRole(profile?.role || "");
    }

    void supabase.auth
      .getSession()
      .then(({ data }) => loadRole(data.session?.user.id));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        void loadRole(session?.user.id);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const ordersTab =
    role === "business"
      ? {
          href: "/business/dashboard",
          label: t("native.business.panelShort"),
          Icon: LayoutGridIcon,
        }
      : { href: "/orders", label: t("nav.orders"), Icon: ReceiptIcon };

  // Three tabs: Nearby (list and map), Orders, Profile.
  const tabs = [
    { href: "/", label: t("native.nav.nearby"), Icon: MapPinIcon },
    ordersTab,
    { href: "/profile", label: t("nav.profile"), Icon: UserIcon },
  ];

  // The screens start with a deep green header: light status-bar icons.
  // 1.0.1 (4) / versionCode 5 were built with dark icons, so set it at runtime.
  useEffect(() => {
    const bars = (window as unknown as {
      Capacitor?: { Plugins?: { SystemBars?: { setStyle?: (options: { style: string }) => Promise<void> } } };
    }).Capacitor?.Plugins?.SystemBars;
    void bars
      ?.setStyle?.({ style: "DARK" })
      .catch(() => undefined);
  }, []);

  // Notification taps open their screen; a registered device refreshes its token.
  useEffect(() => startPush((path) => router.push(path)), [router]);

  // The tabs are prefetched once the first screen is up, never during it.
  useEffect(
    () =>
      whenIdle(() => {
        for (const path of ["/", "/orders", "/profile"]) {
          router.prefetch(path);
        }
      }),
    [router]
  );

  const activeHref =
    pathname === "/" || pathname === "/discover" || pathname === "/map" || pathname.startsWith("/businesses")
      ? "/"
      : pathname === "/orders" || pathname.startsWith("/business/")
      ? ordersTab.href
      : pathname === "/profile" ||
        pathname === "/settings" ||
        pathname === "/payment" ||
        pathname === "/notifications" ||
        pathname === "/favorites"
      ? "/profile"
      : "";

  return (
    <>
      <Suspense fallback={null}>
        <ScreenClassSync />
      </Suspense>
      <NativeBackground />
      <PushPrompt />
      <AccountSheet />

      {!HIDE_BAR.test(pathname) && (
        <nav
          aria-label={t("brand.name")}
          className="native-tabbar native-fixed-bottom fixed inset-x-5 z-50"
        >
          <div className="tab-pill mx-auto flex h-16 w-full max-w-md items-center justify-around px-1.5">
            {tabs.map(({ href, label, Icon }) => {
              const active = activeHref === href;

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={(event) => {
                    // Guests browse Nearby freely; Orders and Profile need an account.
                    if (href !== "/" && signedIn === false) {
                      event.preventDefault();
                      askForAccount(href);
                    }
                  }}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-2xl text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint ${
                    active
                      ? "bg-brand-mint px-3.5 text-brand-forest"
                      : "text-brand-mint"
                  }`}
                >
                  <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={2} />
                  {active && <span className="whitespace-nowrap">{label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
