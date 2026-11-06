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

// Asked once, after the first sign-in: a short sheet first, then the
// system's own permission dialog. Apple 5.1.1(iv): the sheet only explains
// and continues to the system prompt (no "Allow / Not now" of our own); the
// small × closes it without asking.
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
    await enablePush();
    setShow(false);
  }

  function close() {
    markAsked();
    setShow(false);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-black/40" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="push-prompt-title"
        className="native-sheet relative w-full rounded-t-[28px] bg-[#fbf7ee] px-6 pb-[calc(1.5rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] pt-6 text-center"
      >
        <button
          type="button"
          onClick={close}
          aria-label={L("დახურვა", "Close")}
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-xl leading-none text-body"
        >
          ×
        </button>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-moss text-mint">
          <BellIcon className="h-6 w-6" strokeWidth={1.8} />
        </span>
        <h2 id="push-prompt-title" className="mt-4 text-lg font-semibold text-cream">
          {L("შეტყობინებები", "Notifications")}
        </h2>
        <p className="mt-1 text-sm leading-6 text-body">
          {L(
            "შეგახსენებთ წაღებას და გეტყვით ახალ ბოქსებზე.",
            "We'll remind you about pickups and new boxes."
          )}
        </p>
        <button
          type="button"
          onClick={() => void proceed()}
          disabled={busy}
          className="native-press mt-5 flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand-forest text-[15px] font-semibold text-brand-ground disabled:opacity-60"
        >
          {L("გაგრძელება", "Continue")}
        </button>
      </div>
    </div>
  );
}
