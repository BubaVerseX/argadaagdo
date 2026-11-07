"use client";

import { isNativeApp, removeNativeListener } from "@/lib/native";
import { PUSH_CONSENT_VERSION, recordConsent } from "@/lib/consents";
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
  // The native bridge returns the handle itself ({ remove }), the web
  // plugin a Promise of it: handle both (lib/push/client.ts removeListener).
  addListener: (
    event: "registration" | "registrationError" | "pushNotificationActionPerformed",
    callback: (payload: never) => void
  ) => Promise<Listener> | Listener;
};

type CapacitorGlobal = {
  getPlatform?: () => string;
  isPluginAvailable?: (name: string) => boolean;
  Plugins?: { PushNotifications?: PushPlugin; App?: { getInfo?: () => Promise<{ build: string }> } };
};

const TOKEN_KEY = "argadaagdo-push-token";
// Per account on this phone (check-2 #10): a second account is asked again
// instead of inheriting the first one's notifications.
// - asked: the one-time ask was shown to this account;
// - on: this account turned order notifications on here;
// - off: this account turned them off in Settings.
export const PUSH_ASKED_KEY = "argadaagdo-push-asked";
const pushAskedKey = (userId: string) => `${PUSH_ASKED_KEY}:${userId}`;
const pushOnKey = (userId: string) => `argadaagdo-push-on:${userId}`;
const pushOffKey = (userId: string) => `argadaagdo-push-off:${userId}`;

async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export function wasPushAsked(userId: string) {
  return storage("get", pushAskedKey(userId)) === "1";
}

export function markPushAsked(userId: string) {
  storage("set", pushAskedKey(userId), "1");
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
    const handles: (Promise<Listener> | Listener)[] = [];
    const done = () => handles.forEach(removeNativeListener);
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
    void push.register().catch((error: unknown) => {
      window.clearTimeout(timer);
      done();
      reject(error instanceof Error ? error : new Error("register() failed"));
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
  if (!push || !os || !(await isPushSupported())) {
    return "unsupported";
  }

  const userId = await currentUserId();
  if (!userId) return "failed";
  markPushAsked(userId);
  storage("remove", pushOffKey(userId));
  let permission: Permission;
  try {
    permission = (await push.checkPermissions()).receive;
    if (permission !== "granted" && permission !== "denied") {
      permission = (await push.requestPermissions()).receive;
    }
  } catch {
    return "failed";
  }
  if (permission !== "granted") {
    void recordConsent("push_orders", PUSH_CONSENT_VERSION, false, os);
    return "denied";
  }

  try {
    const token = await registerDevice(push);
    const { error } = await supabase.rpc("register_push_device", {
      p_token: token,
      p_platform: os,
      p_language: currentLanguage(),
    });
    if (error) {
      return "failed";
    }
    storage("set", TOKEN_KEY, token);
    const wasOn = storage("get", pushOnKey(userId)) === "1";
    storage("set", pushOnKey(userId), "1");
    if (!wasOn) void recordConsent("push_orders", PUSH_CONSENT_VERSION, true, os);
    return "on";
  } catch {
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
  if (turnedOff) {
    const userId = await currentUserId();
    if (userId) {
      storage("set", pushOffKey(userId), "1");
      storage("remove", pushOnKey(userId));
      void recordConsent("push_orders", PUSH_CONSENT_VERSION, false, platform() ?? "app");
    }
  }
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

  return () => removeNativeListener(tapped);
}

/**
 * Allowed on the phone and not turned off here: register this device for the
 * signed-in account without asking. Also finishes a registration the server
 * couldn't save last time. `refresh` re-sends an existing registration.
 */
export async function ensurePushRegistered({ refresh = false } = {}) {
  const userId = await currentUserId();
  // Only an account that turned notifications on here, never a second
  // account on the same phone without asking it first.
  if (!userId || storage("get", pushOnKey(userId)) !== "1") return;
  if (storage("get", pushOffKey(userId)) === "1") return;
  if (!refresh && storage("get", TOKEN_KEY)) return;
  if (!(await isPushSupported()) || (await getPushPermission()) !== "granted") return;
  await enablePush();
}

/** The "new boxes from places you saved" choice for this account on this device. */
export async function getNewBoxesPush() {
  const token = storage("get", TOKEN_KEY);
  if (!token) return false;
  const { data } = await supabase.rpc("get_my_push_device", { p_token: token });
  const row = (Array.isArray(data) ? data[0] : data) as { notify_new_boxes?: boolean } | null;
  return Boolean(row?.notify_new_boxes);
}

export async function setNewBoxesPush(on: boolean) {
  const token = storage("get", TOKEN_KEY);
  if (!token) return false;
  const { data, error } = await supabase.rpc("set_push_new_boxes", {
    p_token: token,
    p_on: on,
    p_version: PUSH_CONSENT_VERSION,
  });
  return !error && data === true;
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
