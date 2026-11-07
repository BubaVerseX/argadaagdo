"use client";

import { BellIcon } from "@/components/icons";
import {
  canOpenPhoneSettings,
  disablePush,
  enablePush,
  getNewBoxesPush,
  getPushPermission,
  isPushOn,
  isPushSupported,
  openPhoneNotificationSettings,
  pushNeedsAppUpdate,
  setNewBoxesPush,
} from "@/lib/push/client";
import { useLanguage } from "@/lib/useLanguage";
import { useEffect, useState } from "react";

/** The push notification switch (Settings, and on top of Notifications). */
export default function PushToggle({
  compact = false,
  heading,
}: {
  compact?: boolean;
  /** Small label shown above the switch, only when the switch shows. */
  heading?: string;
}) {
  const { language } = useLanguage();
  const L = (ka: string, en: string) => (language === "ka" ? ka : en);
  const [supported, setSupported] = useState(false);
  // In the app, but this build has no push support (e.g. App Store 1.0.0).
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [on, setOn] = useState(false);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // Marketing: new boxes from places this account saved (off until turned on).
  const [newBoxes, setNewBoxes] = useState(false);
  const [newBoxesBusy, setNewBoxesBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const ok = await isPushSupported();
      if (!active) return;
      if (!ok) {
        setNeedsUpdate(await pushNeedsAppUpdate());
        return;
      }
      const [isOn, permission] = await Promise.all([
        isPushOn(),
        getPushPermission(),
      ]);
      if (!active) return;
      setSupported(true);
      setOn(isOn);
      setDenied(permission === "denied");
      if (isOn) {
        const marketing = await getNewBoxesPush();
        if (active) setNewBoxes(marketing);
      }
    };
    void refresh();
    // Coming back from iPhone Settings: show the new permission state.
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!supported) {
    // Settings only: a short hint instead of a switch that can't work.
    if (!needsUpdate || compact) return null;
    return (
      <>
        {heading && (
          <h2 className="px-1 pt-2 text-xs font-medium text-body">{heading}</h2>
        )}
        <section className="flex min-h-11 items-center gap-3 rounded-[22px] bg-card px-4 py-2.5">
          <BellIcon
            className="h-[18px] w-[18px] shrink-0 text-sage"
            strokeWidth={1.8}
          />
          <p className="text-[13px] leading-5 text-body">
            {L(
              "განაახლე აპი შეტყობინებებისთვის",
              "Update the app to get notifications"
            )}
          </p>
        </section>
      </>
    );
  }

  if (compact && on) return null;

  async function toggle() {
    // Turned off in the phone's settings: only the phone can turn it on again.
    if (denied && !on) {
      openPhoneNotificationSettings();
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      if (on) {
        await disablePush();
        setOn(false);
        setNewBoxes(false);
      } else {
        const result = await enablePush();
        setOn(result === "on");
        setDenied(result === "denied");
        setFailed(result === "failed" || result === "unsupported");
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function toggleNewBoxes() {
    setNewBoxesBusy(true);
    const next = !newBoxes;
    const ok = await setNewBoxesPush(next);
    if (ok) setNewBoxes(next);
    setNewBoxesBusy(false);
  }

  // Order updates, and under it (only while that is on) new boxes from saved
  // places. If the phone's own setting blocks it, the first switch opens
  // iPhone Settings (Android: one short line where to look).
  return (
    <section className="rounded-[22px] bg-card px-4 py-2.5">
      <div className="flex min-h-11 items-center gap-3">
        <BellIcon
          className="h-[18px] w-[18px] shrink-0 text-sage"
          strokeWidth={1.8}
        />
        <p className="min-w-0 flex-1 text-[15px] text-cream">
          {L("შეკვეთების განახლებები", "Order updates")}
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={L("შეკვეთების განახლებები", "Order updates")}
          disabled={busy || (denied && !on && !canOpenPhoneSettings())}
          onClick={() => void toggle()}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            on ? "bg-mint" : "bg-[rgba(15,58,50,0.16)]"
          }`}
        >
          <span
            className={`absolute left-0 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              on ? "translate-x-7" : "translate-x-1"
            }`}
          />
        </button>
      </div>
      {denied && !on && !canOpenPhoneSettings() && (
        <p className="pb-1 text-xs leading-5 text-body">
          {L(
            "ჩართე ტელეფონის პარამეტრებში: Apps → ArGadaagdo → Notifications.",
            "Turn on in phone settings: Apps → ArGadaagdo → Notifications."
          )}
        </p>
      )}
      {failed && (
        <p className="pb-1 text-xs leading-5 text-danger">
          {L("ვერ ჩაირთო. სცადე ხელახლა.", "Couldn't turn on. Try again.")}
        </p>
      )}
      {on && !compact && (
        <div className="flex min-h-11 items-center gap-3 border-t border-line pt-2">
          <span aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
          <p className="min-w-0 flex-1 text-[15px] leading-5 text-cream">
            {L("ახალი ბოქსები შენახული ადგილებიდან", "New boxes from places you saved")}
          </p>
          <button
            type="button"
            role="switch"
            aria-checked={newBoxes}
            aria-label={L("ახალი ბოქსები შენახული ადგილებიდან", "New boxes from places you saved")}
            disabled={newBoxesBusy}
            onClick={() => void toggleNewBoxes()}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
              newBoxes ? "bg-mint" : "bg-[rgba(15,58,50,0.16)]"
            }`}
          >
            <span
              className={`absolute left-0 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                newBoxes ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      )}
    </section>
  );
}
