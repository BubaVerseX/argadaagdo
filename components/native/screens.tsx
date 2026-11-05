"use client";

import dynamic from "next/dynamic";

// Each is its own chunk, loaded only inside the app: the website downloads none
// of this. While a chunk loads, CSS paints the skeleton (app/native.css).
export const NativeHomeScreen = dynamic(() => import("./NativeHome"), { ssr: false });
export const NativeOfferScreen = dynamic(() => import("./NativeOffer"), { ssr: false });
export const NativeCheckoutScreen = dynamic(() => import("./NativeCheckout"), { ssr: false });
export const NativeOrdersScreen = dynamic(() => import("./NativeOrders"), { ssr: false });
export const NativeProfileScreen = dynamic(() => import("./NativeProfile"), { ssr: false });
export const NativeMapScreen = dynamic(() => import("./NativeMap"), { ssr: false });
export const NativeBusinessScreen = dynamic(() => import("./NativeBusiness"), { ssr: false });
export const NativeSubpageBar = dynamic(() => import("./NativeSubpageBar"), { ssr: false });
export const NativeShell = dynamic(() => import("./NativeShell"), { ssr: false });

/** The website footer has no counterpart in the app. */
export function NoChrome() {
  return null;
}
