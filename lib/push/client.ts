"use client";

import { isNativeApp } from "@/lib/native";
import { supabase } from "@/lib/supabase";

// Push notifications in the app (Capacitor Push Notifications plugin, which
// the native builds from 1.0.1 (3) include). The website and older app builds
// have no plugin, so everything here reports "unsupported" there.

type Permission = "granted" | "denied" | "prompt" | "prompt-with-rationale";
type Listener = { remove: () => Promise<void> };

type PushPlugin = {
  checkPermissions: () => Promise<{ receive: Permission }>;
  requestPermissions: () => Promise<{ receive: Permission }>;
  register: () => Promise<void>;
  addListener: (
    event: "registration" | "registrationError" | "pushNotificationActionPerformed",
    callback: (payload: never) => void
  ) => Promise<Listener>;
};

type CapacitorGlobal = {
  getPlatform?: () => string;
  isPluginAvailable?: (name: string) => boolean;
  Plugins?: { PushNotifications?: PushPlugin; App?: { getInfo?: () => Promise<{ build: string }> } };
};

const TOKEN_KEY = "argadaagdo-push-token";
// Set when the person turns notifications off in Settings.
const OFF_KEY = "argadaagdo-push-off";
export const PUSH_ASKED_KEY = "argadaagdo-push-asked";
// Last steps and errors of turning push on (shown in the hidden debug panel).
const DEBUG_KEY = "argadaagdo-push-debug";

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function logPush(step: string, error?: unknown) {
  try {
    const entries = JSON.parse(window.localStorage.getItem(DEBUG_KEY) || "[]") as string[];
    const time = new Date().toISOString().slice(11, 19);
    entries.push(`${time} ${step}${error === undefined ? "" : `: ${errorText(error)}`}`.slice(0, 200));
    window.localStorage.setItem(DEBUG_KEY, JSON.stringify(entries.slice(-8)));
  } catch {
    // Debug only.
  }
}

function capacitor() {
  return isNativeApp()
    ? ((window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor ?? null)
    : null;
}

function plugin() {
  const cap = capacitor();
  // Builds before 1.0.1 (3), e.g. App Store 1.0.0, have no push plugin.
  if (cap?.isPluginAvailable && !cap.isPluginAvailable("PushNotifications")) return null;
  return cap?.Plugins?.PushNotifications ?? null;
}

function platform(): "ios" | "android" | null {
  const name = capacitor()?.getPlatform?.();
  return name === "ios" || name === "android" ? name : null;
}

function storage(action: "get" | "set" | "remove", key: string, value = "") {
  try {
    if (action === "get") return window.localStorage.getItem(key);
    if (action === "set") window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // Private mode: push still works, it just asks again.
  }
  return null;
}

/**
 * Android needs Firebase (google-services.json) built into the app, or
 * registering crashes it. NEXT_PUBLIC_ANDROID_PUSH_MIN_BUILD is the first
 * Android versionCode built with it; until it is set, Android shows no push UI.
 */
export async function isPushSupported() {
  const push = plugin();
  const os = platform();
  if (!push || !os) return false;
  if (os === "ios") return true;

  const minBuild = Number(process.env.NEXT_PUBLIC_ANDROID_PUSH_MIN_BUILD || 0);
  if (!minBuild) return false;
  try {
    const info = await capacitor()?.Plugins?.App?.getInfo?.();
    return Number(info?.build || 0) >= minBuild;
  } catch {
    return false;
  }
}

export async function getPushPermission(): Promise<Permission | null> {
  const push = plugin();
  if (!push) return null;
  try {
    return (await push.checkPermissions()).receive;
  } catch {
    return null;
  }
}

/** On in this app = permission granted and this device registered for the account. */
export async function isPushOn() {
  return Boolean(storage("get", TOKEN_KEY)) && (await getPushPermission()) === "granted";
}

function currentLanguage() {
  return storage("get", "argadaagdo-language") === "en" ? "en" : "ka";
}

// Resolves with the device token once the OS hands it over.
function registerDevice(push: PushPlugin) {
  return new Promise<string>((resolve, reject) => {
    const handles: Promise<Listener>[] = [];
    const done = () => handles.forEach((handle) => void handle.then((h) => h.remove()));
    const timer = window.setTimeout(() => {
      done();
      reject(new Error("timeout: no device token from the phone within 15 s"));
    }, 15000);
    handles.push(
      push.addListener("registration", ((token: { value: string }) => {
        window.clearTimeout(timer);
        done();
        resolve(token.value);
      }) as never)
    );
    handles.push(
      push.addListener("registrationError", ((detail: { error?: string }) => {
        window.clearTimeout(timer);
        done();
        reject(new Error(`iOS/Android registration error: ${detail?.error || "unknown"}`));
      }) as never)
    );
    logPush("register() called");
    void push.register().catch((error: unknown) => {
      window.clearTimeout(timer);
      done();
      reject(new Error(`register() failed: ${errorText(error)}`));
    });
  });
}

export type EnableResult = "on" | "denied" | "unsupported" | "failed";

/** Asks the OS (if needed), registers the device and links it to the account. */
// One attempt at a time: app start, the pre-prompt and the Settings switch
// can all ask at once, and the phone hands over a single token anyway.
let enabling: Promise<EnableResult> | null = null;

export function enablePush(): Promise<EnableResult> {
  enabling ??= enablePushOnce().finally(() => {
    enabling = null;
  });
  return enabling;
}

async function enablePushOnce(): Promise<EnableResult> {
  const push = plugin();
  const os = platform();
  logPush("turn on tapped");
  if (!push || !os || !(await isPushSupported())) {
    logPush(`unsupported (plugin ${push ? "yes" : "no"}, platform ${os || "none"})`);
    return "unsupported";
  }

  storage("set", PUSH_ASKED_KEY, "1");
  storage("remove", OFF_KEY);
  let permission: Permission;
  try {
    permission = (await push.checkPermissions()).receive;
    logPush(`permission before: ${permission}`);
    if (permission !== "granted" && permission !== "denied") {
      permission = (await push.requestPermissions()).receive;
      logPush(`permission after asking: ${permission}`);
    }
  } catch (error) {
    logPush("permission check failed", error);
    return "failed";
  }
  if (permission !== "granted") return "denied";

  try {
    const token = await registerDevice(push);
    logPush(`device token received (${token.slice(0, 6)}…)`);
    const { error } = await supabase.rpc("register_push_device", {
      p_token: token,
      p_platform: os,
      p_language: currentLanguage(),
    });
    if (error) {
      logPush("saving the device failed", error.message);
      return "failed";
    }
    storage("set", TOKEN_KEY, token);
    logPush("on");
    return "on";
  } catch (error) {
    logPush("failed", error);
    return "failed";
  }
}

/**
 * Stops notifications for this account on this device. `turnedOff` remembers
 * the choice (the Settings switch); signing out passes false, so the next
 * account on this phone gets them again if the phone allows it.
 */
export async function disablePush({ turnedOff = true } = {}) {
  const token = storage("get", TOKEN_KEY);
  storage("remove", TOKEN_KEY);
  if (turnedOff) storage("set", OFF_KEY, "1");
  if (!token) return;
  await supabase.rpc("unregister_push_device", { p_token: token }).then(
    () => undefined,
    () => undefined
  );
}

/**
 * At app start: refresh the registration (tokens can change, and the language
 * may have), and open the right screen when a notification is tapped.
 */
export function startPush(openPath: (path: string) => void) {
  const push = plugin();
  if (!push) return () => {};

  const tapped = push.addListener("pushNotificationActionPerformed", ((action: {
    notification?: { data?: { url?: unknown } };
  }) => {
    const url = action.notification?.data?.url;
    if (typeof url === "string" && url.startsWith("/")) openPath(url);
  }) as never);

  void ensurePushRegistered({ refresh: true });

  return () => void tapped.then((handle) => handle.remove());
}

/**
 * Allowed on the phone and not turned off here: register this device for the
 * signed-in account without asking. Also finishes a registration the server
 * couldn't save last time. `refresh` re-sends an existing registration.
 */
export async function ensurePushRegistered({ refresh = false } = {}) {
  if (storage("get", OFF_KEY) === "1") return;
  if (!refresh && storage("get", TOKEN_KEY)) return;
  if (!(await isPushSupported()) || (await getPushPermission()) !== "granted") return;
  const { data } = await supabase.auth.getSession();
  if (data.session) await enablePush();
}

/**
 * In the app but without push support (old build, or an Android build from
 * before Firebase): the person has to update the app to get notifications.
 */
export async function pushNeedsAppUpdate() {
  return isNativeApp() && !(await isPushSupported());
}

/**
 * Opens this app's page in iPhone Settings, where notifications can be turned
 * back on after "Don't Allow". Capacitor hands any non-website address to iOS,
 * which opens "app-settings:" in Settings (works in every build, no plugin).
 * Android has no such link: returns false and the caller shows the path.
 */
export function openPhoneNotificationSettings() {
  if (platform() !== "ios") return false;
  window.location.href = "app-settings:";
  return true;
}

/** Whether the phone can open its own settings from the app (iOS only). */
export function canOpenPhoneSettings() {
  return platform() === "ios";
}

/** Everything the hidden debug panel in Settings shows. */
export async function getPushDiagnostics() {
  const cap = capacitor();
  const lines: [string, string][] = [];
  let version = "?";
  try {
    const info = await cap?.Plugins?.App?.getInfo?.();
    if (info) version = `${(info as { version?: string }).version ?? "?"} (${info.build})`;
  } catch (error) {
    version = `error: ${errorText(error)}`;
  }
  let permission = "-";
  const push = plugin();
  if (push) {
    try {
      permission = (await push.checkPermissions()).receive;
    } catch (error) {
      permission = `error: ${errorText(error)}`;
    }
  }
  const { data } = await supabase.auth.getSession();
  let log: string[] = [];
  try {
    log = JSON.parse(window.localStorage.getItem(DEBUG_KEY) || "[]") as string[];
  } catch {
    log = [];
  }
  lines.push(["App", isNativeApp() ? `${platform() || "?"} ${version}` : "website"]);
  lines.push(["Push plugin", push ? "yes" : "no"]);
  lines.push([
    "Plugins",
    Object.keys(cap?.Plugins || {}).sort().join(", ") || "-",
  ]);
  lines.push(["Supported", (await isPushSupported()) ? "yes" : "no"]);
  lines.push(["iOS permission", permission]);
  lines.push(["Token saved", storage("get", TOKEN_KEY) ? "yes" : "no"]);
  lines.push(["Turned off by user", storage("get", OFF_KEY) ? "yes" : "no"]);
  lines.push(["Signed in", data.session ? "yes" : "no"]);
  lines.push(["Site", window.location.host]);
  lines.push(["Last error", log.filter((line) => /fail|error|timeout|unsupported/i.test(line)).pop() || "-"]);
  return { lines, log };
}
