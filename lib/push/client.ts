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
  Plugins?: { PushNotifications?: PushPlugin; App?: { getInfo?: () => Promise<{ build: string }> } };
};

const TOKEN_KEY = "argadaagdo-push-token";
// Set when the person turns notifications off in Settings.
const OFF_KEY = "argadaagdo-push-off";
export const PUSH_ASKED_KEY = "argadaagdo-push-asked";

function capacitor() {
  return isNativeApp()
    ? ((window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor ?? null)
    : null;
}

function plugin() {
  return capacitor()?.Plugins?.PushNotifications ?? null;
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
      reject(new Error("timeout"));
    }, 15000);
    handles.push(
      push.addListener("registration", ((token: { value: string }) => {
        window.clearTimeout(timer);
        done();
        resolve(token.value);
      }) as never)
    );
    handles.push(
      push.addListener("registrationError", (() => {
        window.clearTimeout(timer);
        done();
        reject(new Error("registration"));
      }) as never)
    );
    void push.register().catch(reject);
  });
}

export type EnableResult = "on" | "denied" | "unsupported" | "failed";

/** Asks the OS (if needed), registers the device and links it to the account. */
export async function enablePush(): Promise<EnableResult> {
  const push = plugin();
  const os = platform();
  if (!push || !os || !(await isPushSupported())) return "unsupported";

  storage("set", PUSH_ASKED_KEY, "1");
  storage("remove", OFF_KEY);
  let permission = (await push.checkPermissions()).receive;
  if (permission !== "granted" && permission !== "denied") {
    permission = (await push.requestPermissions()).receive;
  }
  if (permission !== "granted") return "denied";

  try {
    const token = await registerDevice(push);
    const { error } = await supabase.rpc("register_push_device", {
      p_token: token,
      p_platform: os,
      p_language: currentLanguage(),
    });
    if (error) return "failed";
    storage("set", TOKEN_KEY, token);
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
