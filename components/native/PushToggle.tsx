"use client";

import { BellIcon } from "@/components/icons";
import {
  canOpenPhoneSettings,
  disablePush,
  enablePush,
  getPushPermission,
  isPushOn,
  isPushSupported,
  openPhoneNotificationSettings,
  pushNeedsAppUpdate,
} from "@/lib/push/client";
import { supabase } from "@/lib/supabase";
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
  const [testNote, setTestNote] = useState("");

  async function sendTest() {
    setTestNote("");
    const { data } = await supabase.auth.getSession();
    const response = await fetch("/api/push/test", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session?.access_token || ""}` },
    }).catch(() => null);
    const result = (await response?.json().catch(() => null)) as {
      sent?: number;
    } | null;
    setTestNote(
      response?.ok && result?.sent
        ? L(
            "გაიგზავნა — რამდენიმე წამში მოვა.",
            "Sent — it should arrive in a few seconds."
          )
        : L(
            "ჯერ ვერ გაიგზავნა. სცადე მოგვიანებით.",
            "Couldn't send yet. Please try again later."
          )
    );
  }

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

  return (
    <>
      {heading && (
        <h2 className="px-1 pt-2 text-xs font-medium text-body">{heading}</h2>
      )}
      <section className="rounded-[22px] bg-card px-4 py-2.5">
        <div className="flex min-h-11 items-center gap-3">
          <BellIcon
            className="h-[18px] w-[18px] shrink-0 text-sage"
            strokeWidth={1.8}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] text-cream">
              {L("შეტყობინებები", "Notifications")}
            </p>
            <p className="text-xs leading-5 text-body">
              {L(
                "დადასტურება, წაღების შეხსენება, ახალი ბოქსები",
                "Confirmations, pickup reminders, new boxes"
              )}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={L("შეტყობინებები", "Notifications")}
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
        {denied && !on &&
          (canOpenPhoneSettings() ? (
            <button
              type="button"
              onClick={() => openPhoneNotificationSettings()}
              className="mt-1 min-h-11 text-left text-xs font-bold text-mint"
            >
              {L(
                "გამორთულია iPhone-ის პარამეტრებში — გახსნა",
                "Off in iPhone Settings — open Settings"
              )}
            </button>
          ) : (
            <p className="mt-2 text-xs leading-5 text-body">
              {L(
                "გამორთულია ტელეფონის პარამეტრებში: Settings → Apps → ArGadaagdo → Notifications.",
                "Off in your phone settings: Settings → Apps → ArGadaagdo → Notifications."
              )}
            </p>
          ))}
        {on && !compact && (
          <button
            type="button"
            onClick={() => void sendTest()}
            className="mt-1 text-xs font-bold text-mint"
          >
            {testNote ||
              L("სატესტო შეტყობინების გაგზავნა", "Send me a test notification")}
          </button>
        )}
        {failed && (
          <p className="mt-2 text-xs leading-5 text-danger">
            {L(
              "ვერ ჩაირთო. სცადე მოგვიანებით.",
              "Couldn't turn them on. Please try again later."
            )}
          </p>
        )}
      </section>
    </>
  );
}
