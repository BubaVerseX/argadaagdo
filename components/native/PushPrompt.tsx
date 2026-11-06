"use client";

import { BellIcon } from "@/components/icons";
import {
  enablePush,
  ensurePushRegistered,
  getPushPermission,
  isPushSupported,
  PUSH_ASKED_KEY,
} from "@/lib/push/client";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/useLanguage";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Asked once, right after sign-up (the first signed-in session on this
// phone): one full screen with a single "Continue" that leads straight to the
// system's permission dialog, where people allow or decline. Apple
// 5.1.1(iv): no "Allow / Not now" of our own. Turning it off/on later is the
// one switch in Settings.
const QUIET = /^\/(login|checkout\/|offers\/|staff\/)/;

function askedBefore() {
  try {
    return window.localStorage.getItem(PUSH_ASKED_KEY) === "1";
  } catch {
    return true;
  }
}

function markAsked() {
  try {
    window.localStorage.setItem(PUSH_ASKED_KEY, "1");
  } catch {
    // Asked again next time; harmless.
  }
}

export default function PushPrompt() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const L = (ka: string, en: string) => (language === "ka" ? ka : en);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (QUIET.test(pathname)) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session || !(await isPushSupported())) return;
      const permission = await getPushPermission();
      if (!active) return;
      if (permission === "granted") {
        // Already allowed on this phone (e.g. a new sign-in): register quietly.
        markAsked();
        void ensurePushRegistered();
        return;
      }
      if (permission === "denied" || askedBefore()) return;
      setShow(true);
    }, 1200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [pathname]);

  if (!show) return null;

  async function proceed() {
    setBusy(true);
    markAsked();
    try {
      await enablePush();
    } finally {
      setShow(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-prompt-title"
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-[#fbf7ee] px-8 pb-[calc(2rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] pt-[calc(2rem+var(--safe-area-inset-top,env(safe-area-inset-top,0px)))] text-center"
    >
      <div className="flex flex-1 flex-col items-center justify-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-moss text-mint">
          <BellIcon className="h-9 w-9" strokeWidth={1.6} />
        </span>
        <h2 id="push-prompt-title" className="mt-6 font-serif text-2xl font-bold text-cream">
          {L("შეტყობინებები", "Notifications")}
        </h2>
        <p className="mt-2 max-w-[18rem] text-[15px] leading-6 text-body">
          {L(
            "შეგახსენებთ წაღებას და გეტყვით ახალ ბოქსებზე.",
            "We'll remind you about pickups and new boxes."
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void proceed()}
        disabled={busy}
        className="native-press flex min-h-14 w-full max-w-sm items-center justify-center rounded-2xl bg-brand-forest text-base font-semibold text-brand-ground disabled:opacity-60"
      >
        {L("გაგრძელება", "Continue")}
      </button>
    </div>
  );
}
