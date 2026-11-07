"use client";

import { BellIcon } from "@/components/icons";
import {
  enablePush,
  getPushPermission,
  isPushSupported,
  markPushAsked,
  setNewBoxesPush,
  wasPushAsked,
} from "@/lib/push/client";
import { PUSH_CONSENT_VERSION, recordConsent } from "@/lib/consents";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/useLanguage";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Asked once per account on this phone, after its first sign-in (check-2 #10):
// - order updates only (confirmed, pickup reminder, cancelled);
// - "new boxes from places you saved" is a separate, unticked option;
// - phone not asked yet: one "Continue" that leads straight to the system
//   dialog (Apple 5.1.1(iv): no "Not now" of our own before it);
// - phone already allowed (e.g. a second account): this account chooses
//   "Turn on" or "Not now", nothing is turned on silently.
// Both choices can be changed later in Settings.
const QUIET = /^\/(login|checkout\/|offers\/|staff\/|privacy|terms)/;

type Mode = "system" | "account";

export default function PushPrompt() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const L = (ka: string, en: string) => (language === "ka" ? ka : en);
  const [mode, setMode] = useState<Mode | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [newBoxes, setNewBoxes] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (QUIET.test(pathname)) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      const id = data.session?.user.id;
      if (!id || wasPushAsked(id) || !(await isPushSupported())) return;
      const permission = await getPushPermission();
      if (!active) return;
      if (permission === "denied") {
        markPushAsked(id);
        return;
      }
      setUserId(id);
      setMode(permission === "granted" ? "account" : "system");
    }, 1200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [pathname]);

  if (!mode || !userId) return null;

  async function turnOn() {
    if (!userId) return;
    setBusy(true);
    markPushAsked(userId);
    try {
      const result = await enablePush();
      if (result === "on" && newBoxes) await setNewBoxesPush(true);
    } finally {
      setMode(null);
    }
  }

  function notNow() {
    if (!userId) return;
    markPushAsked(userId);
    void recordConsent("push_orders", PUSH_CONSENT_VERSION, false, "app");
    setMode(null);
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
          {L("შეტყობინებები შეკვეთებზე", "Order notifications")}
        </h2>
        <p className="mt-2 max-w-[19rem] text-[15px] leading-6 text-body">
          {L(
            "გეტყვით, როცა შეკვეთა დადასტურდება, და შეგახსენებთ წაღებას.",
            "We'll tell you when your order is confirmed and remind you about pickup."
          )}
        </p>
        <label className="mt-6 flex max-w-[19rem] cursor-pointer items-start gap-3 rounded-2xl bg-card px-4 py-3 text-left text-sm leading-5 text-body">
          <input
            type="checkbox"
            checked={newBoxes}
            onChange={(event) => setNewBoxes(event.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0"
          />
          <span>
            {L(
              "ასევე მაცნობეთ ახალ ბოქსებზე იმ ადგილებიდან, რომლებიც შევინახე",
              "Also tell me about new boxes from places I saved"
            )}
          </span>
        </label>
      </div>
      <button
        type="button"
        onClick={() => void turnOn()}
        disabled={busy}
        className="native-press flex min-h-14 w-full max-w-sm items-center justify-center rounded-2xl bg-brand-forest text-base font-semibold text-brand-ground disabled:opacity-60"
      >
        {mode === "system" ? L("გაგრძელება", "Continue") : L("ჩართვა", "Turn on")}
      </button>
      {mode === "account" && (
        <button
          type="button"
          onClick={notNow}
          disabled={busy}
          className="mt-2 min-h-11 w-full max-w-sm rounded-2xl text-sm font-semibold text-body disabled:opacity-60"
        >
          {L("ახლა არა", "Not now")}
        </button>
      )}
    </div>
  );
}
