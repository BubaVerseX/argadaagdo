import { SUPPORT_EMAIL } from "@/lib/legal/shared";
import { getNativeBrowser, isNativeApp } from "@/lib/native";

// Official social profiles (from the owner, 6 Nov 2026), shown in the website
// footer and the app's profile footer. A Vercel env handle (without the @)
// overrides each one.
const instagramHandle =
  (process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE || "").replace(/^@/, "").trim() || "ar_gadaagdo_app";
const xHandle = (process.env.NEXT_PUBLIC_X_HANDLE || "").replace(/^@/, "").trim() || "Przemos3k";

export const instagramUrl = `https://www.instagram.com/${encodeURIComponent(instagramHandle)}/`;
export const xUrl = `https://x.com/${encodeURIComponent(xHandle)}`;

export const socialLinks = [
  { label: "Instagram", href: instagramUrl },
  { label: "X", href: xUrl },
];

export const supportEmail = SUPPORT_EMAIL;

/** Opens an outside link in the in-app browser inside the app, a new tab on the web. */
export function openExternal(href: string) {
  const browser = getNativeBrowser();
  if (isNativeApp() && browser) {
    void browser.open({ url: href });
    return;
  }
  window.open(href, "_blank", "noopener,noreferrer");
}

type AppInfo = { version: string; build: string };

/** The installed app's version ("1.0.1 (3)"), or the web build's. */
export async function getAppVersionLabel() {
  const plugin = (window as unknown as {
    Capacitor?: { Plugins?: { App?: { getInfo?: () => Promise<AppInfo> } } };
  }).Capacitor?.Plugins?.App;

  try {
    if (isNativeApp() && plugin?.getInfo) {
      const info = await plugin.getInfo();
      return `${info.version} (${info.build})`;
    }
  } catch {
    // Fall through to the web version.
  }

  return process.env.NEXT_PUBLIC_APP_VERSION || "web";
}
