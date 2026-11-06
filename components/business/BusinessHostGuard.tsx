"use client";

import { businessSiteUrl, isBusinessHostname } from "@/lib/businessArea";
import { isNativeApp } from "@/lib/native";
import { useEffect } from "react";

/**
 * Sends browsers from the customer host to the business host. The native apps
 * stay put: they wrap the customer host, and leaving it would open the system
 * browser and sign the owner out.
 */
export function BusinessHostGuard() {
  useEffect(() => {
    if (
      !businessSiteUrl ||
      isBusinessHostname(window.location.hostname) ||
      isNativeApp()
    ) {
      return;
    }

    const { pathname, search, hash } = window.location;
    window.location.replace(`${businessSiteUrl}${pathname}${search}${hash}`);
  }, []);

  return null;
}
