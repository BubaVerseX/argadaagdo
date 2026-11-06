"use client";

import { isNativeApp } from "@/lib/native";
import { useEffect, useState, type ComponentType } from "react";

type Loader = () => Promise<{ default: ComponentType }>;

// Each screen is its own chunk, loaded only inside the app: the website
// downloads none of it. Not next/dynamic: that suspends, and React holds a
// revealed Suspense boundary back for a few hundred milliseconds, which was
// most of the app's cold start. Until the chunk is there, CSS paints the
// skeleton (app/native.css).
function lazyScreen(load: Loader) {
  let loaded: ComponentType | null = null;
  let request: Promise<ComponentType> | null = null;

  const preload = () => {
    request ??= load().then((module) => {
      loaded = module.default;
      return module.default;
    });
    return request;
  };

  function LazyScreen() {
    const [Screen, setScreen] = useState<ComponentType | null>(() => loaded);

    useEffect(() => {
      if (Screen) return;
      let active = true;
      void preload().then((component) => {
        if (active) setScreen(() => component);
      });
      return () => {
        active = false;
      };
    }, [Screen]);

    return Screen ? <Screen /> : null;
  }

  return Object.assign(LazyScreen, { preload });
}

export const NativeHomeScreen = lazyScreen(() => import("./NativeHome"));
export const NativeOfferScreen = lazyScreen(() => import("./NativeOffer"));
export const NativeCheckoutScreen = lazyScreen(() => import("./NativeCheckout"));
export const NativeOrdersScreen = lazyScreen(() => import("./NativeOrders"));
export const NativeProfileScreen = lazyScreen(() => import("./NativeProfile"));
export const NativeMapScreen = lazyScreen(() => import("./NativeMap"));
export const NativeBusinessScreen = lazyScreen(() => import("./NativeBusiness"));
export const NativeLoginScreen = lazyScreen(() => import("./NativeLogin"));
export const NativeSettingsScreen = lazyScreen(() => import("./NativeSettings"));
export const NativeNotificationsScreen = lazyScreen(() => import("./NativeNotifications"));
export const NativePaymentScreen = lazyScreen(() => import("./NativePayment"));
export const NativeFavoritesScreen = lazyScreen(() => import("./NativeFavorites"));
export const NativeSubpageBar = lazyScreen(() => import("./NativeSubpageBar"));
export const NativeShell = lazyScreen(() => import("./NativeShell"));

// Inside the app, start this route's chunk while the page hydrates instead of
// after it, so a cold launch doesn't wait for the two one after the other.
if (typeof window !== "undefined" && isNativeApp()) {
  const path = window.location.pathname;

  void NativeShell.preload();
  if (path === "/" || path === "/discover") void NativeHomeScreen.preload();
  else if (path.startsWith("/offers/")) void NativeOfferScreen.preload();
  else if (path.startsWith("/checkout/")) void NativeCheckoutScreen.preload();
  else if (path === "/orders") void NativeOrdersScreen.preload();
  else if (path === "/profile") void NativeProfileScreen.preload();
  else if (path === "/map") void NativeMapScreen.preload();
  else if (path === "/business/dashboard") void NativeBusinessScreen.preload();
  else if (path === "/login") void NativeLoginScreen.preload();
  else if (path === "/settings") void NativeSettingsScreen.preload();
  else if (path === "/notifications") void NativeNotificationsScreen.preload();
  else if (path === "/payment") void NativePaymentScreen.preload();
  else if (path === "/favorites") void NativeFavoritesScreen.preload();
  else void NativeSubpageBar.preload();
}

/** The website footer has no counterpart in the app. */
export function NoChrome() {
  return null;
}
