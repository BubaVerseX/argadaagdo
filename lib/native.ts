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
  Plugins?: Record<string, unknown>;
};

function getCapacitor(): CapacitorGlobal | null {
  if (typeof window === "undefined") return null;

  const capacitor = (window as unknown as { Capacitor?: CapacitorGlobal })
    .Capacitor;

  return capacitor?.isNativePlatform?.() ? capacitor : null;
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
