"use client";

import { useSyncExternalStore } from "react";
import { isNativeApp } from "@/lib/native";
import { appStoreUrl } from "@/lib/site";
import { useLanguage } from "@/lib/useLanguage";

function subscribe() {
  return () => {};
}

function isIosBrowser() {
  if (isNativeApp()) return false;

  const { userAgent, platform, maxTouchPoints } = window.navigator;
  // iPadOS Safari reports itself as a Mac, so touch support tells them apart.
  return /iPhone|iPad|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

// Device-dependent, so it renders nothing on the server and appears after hydration.
export default function AppStoreLink() {
  const { t } = useLanguage();
  const visible = useSyncExternalStore(subscribe, isIosBrowser, () => false);

  if (!visible) return null;

  return (
    <a
      href={appStoreUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-body underline underline-offset-4 transition hover:text-mint focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
    >
      {t("footer.appStore")}
    </a>
  );
}
