// Helpers for the iOS/Android app shells (Capacitor). The apps load the live
// site via server.url, and Capacitor injects `window.Capacitor` with the
// installed native plugins — so no plugin package is bundled into the web
// build; in a normal browser every helper here returns null.

type PluginListenerHandle = { remove: () => Promise<void> };

type CapacitorBrowserPlugin = {
  open: (options: { url: string }) => Promise<void>;
  addListener: (
    eventName: "browserFinished",
    listener: () => void
  ) => Promise<PluginListenerHandle>;
};

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: Record<string, unknown>;
};

function getCapacitor(): CapacitorGlobal | null {
  if (typeof window === "undefined") return null;

  const capacitor = (window as unknown as { Capacitor?: CapacitorGlobal })
    .Capacitor;

  return capacitor?.isNativePlatform?.() ? capacitor : null;
}

export function isNativeApp() {
  return getCapacitor() !== null;
}

/**
 * The installed app's platform and build number (CFBundleVersion on iOS,
 * versionCode on Android); null on the website. `build` is null when the
 * App plugin can't tell.
 */
export async function getNativeAppInfo(): Promise<{
  platform: string;
  build: string | null;
} | null> {
  const capacitor = getCapacitor();
  if (!capacitor) return null;

  const platform = capacitor.getPlatform?.() || "";
  const app = capacitor.Plugins?.App as
    | { getInfo?: () => Promise<{ build?: string }> }
    | undefined;

  try {
    const info = await app?.getInfo?.();
    return { platform, build: info?.build ?? null };
  } catch {
    return { platform, build: null };
  }
}

// In-app browser (SFSafariViewController / Chrome Custom Tabs). Inside the
// app, navigating the WebView to another host hands the URL to Safari or
// Chrome, where the customer isn't signed in and the app is left behind.
export function getNativeBrowser(): CapacitorBrowserPlugin | null {
  const browser = getCapacitor()?.Plugins?.Browser as
    | CapacitorBrowserPlugin
    | undefined;

  return browser &&
    typeof browser.open === "function" &&
    typeof browser.addListener === "function"
    ? browser
    : null;
}

type NativeListenerHandle = { remove?: () => unknown } | null | undefined;

/**
 * Removes a Capacitor listener whatever shape addListener returned. In the
 * real apps the native bridge returns the handle itself ({ remove }), not a
 * Promise, so `.then()` on it throws (that broke push registration until
 * 2026-11-07). Safe with both shapes, with undefined, and never throws.
 */
export function removeNativeListener(
  handle: NativeListenerHandle | Promise<NativeListenerHandle>
) {
  void Promise.resolve(handle)
    .then((listener) => listener?.remove?.())
    .catch(() => undefined);
}
