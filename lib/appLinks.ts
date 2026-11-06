import { SUPPORT_EMAIL } from "@/lib/legal/shared";
import { getNativeBrowser, isNativeApp } from "@/lib/native";

// Social profiles shown in the app's profile footer. Each link stays hidden
// until its handle is set (Vercel env, without the @).
const instagramHandle = (process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE || "").replace(/^@/, "").trim();
const xHandle = (process.env.NEXT_PUBLIC_X_HANDLE || "").replace(/^@/, "").trim();

export const socialLinks = [
  instagramHandle && {
    label: "Instagram",
    href: `https://instagram.com/${encodeURIComponent(instagramHandle)}`,
  },
  xHandle && { label: "X", href: `https://x.com/${encodeURIComponent(xHandle)}` },
].filter(Boolean) as { label: string; href: string }[];

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
