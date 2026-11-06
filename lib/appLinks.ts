import { SUPPORT_EMAIL } from "@/lib/legal/shared";
import { getNativeBrowser, isNativeApp } from "@/lib/native";

// Official social profiles (from the owner, 6 Nov 2026), shown in the website
// footer and the app's profile footer. A Vercel env handle (without the @)
// overrides Instagram. X is shown only when NEXT_PUBLIC_X_HANDLE is set (the
// old default handle returned 404).
const instagramHandle =
  (process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE || "").replace(/^@/, "").trim() || "ar_gadaagdo_app";
const xHandle = (process.env.NEXT_PUBLIC_X_HANDLE || "").replace(/^@/, "").trim();

export const instagramUrl = `https://www.instagram.com/${encodeURIComponent(instagramHandle)}/`;
/** Empty when no X handle is configured; callers hide the link then. */
export const xUrl = xHandle ? `https://x.com/${encodeURIComponent(xHandle)}` : "";

export type SocialLink = { label: string; href: string; appUrl: string };

export const socialLinks: SocialLink[] = [
  {
    label: "Instagram",
    href: instagramUrl,
    appUrl: `instagram://user?username=${encodeURIComponent(instagramHandle)}`,
  },
  ...(xUrl
    ? [
        {
          label: "X",
          href: xUrl,
          appUrl: `twitter://user?screen_name=${encodeURIComponent(xHandle)}`,
        },
      ]
    : []),
];

/**
 * In the app: opens the profile in the installed Instagram / X app, and in the
 * in-app browser when that app isn't installed (the shell hands the app link
 * to the system, which fails silently, so "we never left" means "not
 * installed"). On the website: a new tab.
 */
export function openSocial(link: SocialLink) {
  if (!isNativeApp()) {
    window.open(link.href, "_blank", "noopener,noreferrer");
    return;
  }

  let left = false;
  const markLeft = () => {
    if (document.hidden) left = true;
  };
  const app = (window as unknown as {
    Capacitor?: {
      Plugins?: {
        App?: {
          addListener?: (
            event: "appStateChange",
            callback: (state: { isActive: boolean }) => void
          ) => Promise<{ remove: () => Promise<void> }>;
        };
      };
    };
  }).Capacitor?.Plugins?.App;
  const appListener = app?.addListener?.("appStateChange", (state) => {
    if (!state.isActive) left = true;
  });
  document.addEventListener("visibilitychange", markLeft);

  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", markLeft);
    void appListener?.then((handle) => handle.remove());
    if (!left) openExternal(link.href);
  }, 1500);

  window.location.href = link.appUrl;
}

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
