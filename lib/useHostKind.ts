"use client";

import { isBusinessHostname } from "@/lib/businessArea";
import { useSyncExternalStore } from "react";

export type HostKind = "business" | "customer";

const subscribe = () => () => {};

function getHostKind(): HostKind {
  return isBusinessHostname(window.location.hostname) ? "business" : "customer";
}

/**
 * Which site this page is on. Pages are prerendered once for both hosts, so
 * the answer is null on the server and during hydration, then the real host.
 */
export function useHostKind(): HostKind | null {
  return useSyncExternalStore(subscribe, getHostKind, () => null);
}
