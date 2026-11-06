"use client";

import { BellIcon } from "@/components/icons";
import {
  disablePush,
  enablePush,
  getPushPermission,
  isPushOn,
  isPushSupported,
} from "@/lib/push/client";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/useLanguage";
import { useEffect, useState } from "react";

/** The push notification switch (Settings, and on top of Notifications). */
export default function PushToggle({ compact = false }: { compact?: boolean }) {
  const { language } = useLanguage();
  const L = (ka: string, en: string) => (language === "ka" ? ka : en);
  const [supported, setSupported] = useState(false);
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
    const result = (await response?.json().catch(() => null)) as { sent?: number } | null;
    setTestNote(
      response?.ok && result?.sent
        ? L("გაიგზავნა — რამდენიმე წამში მოვა.", "Sent — it should arrive in a few seconds.")
        : L("ჯერ ვერ გაიგზავნა. სცადე მოგვიანებით.", "Couldn't send yet. Please try again later.")
    );
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      const ok = await isPushSupported();
      if (!active || !ok) return;
      const [isOn, permission] = await Promise.all([isPushOn(), getPushPermission()]);
      if (!active) return;
      setSupported(true);
      setOn(isOn);
      setDenied(permission === "denied");
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!supported || (compact && on)) return null;

  async function toggle() {
    setBusy(true);
    setFailed(false);
    if (on) {
      await disablePush();
      setOn(false);
    } else {
      const result = await enablePush();
      setOn(result === "on");
      setDenied(result === "denied");
      setFailed(result === "failed");
    }
    setBusy(false);
  }

  return (
    <section className="rounded-[24px] bg-card px-4 py-3">
      <div className="flex min-h-11 items-center gap-3">
        <BellIcon className="h-5 w-5 shrink-0 text-sage" strokeWidth={1.8} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-cream">{L("შეტყობინებები", "Notifications")}</p>
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
          disabled={busy || (denied && !on)}
          onClick={() => void toggle()}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            on ? "bg-mint" : "bg-well"
          }`}
        >
          <span
            className={`absolute left-0 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              on ? "translate-x-7" : "translate-x-1"
            }`}
          />
        </button>
      </div>
      {denied && !on && (
        <p className="mt-2 text-xs leading-5 text-body">
          {L(
            "შეტყობინებები ტელეფონის პარამეტრებშია გამორთული: Settings → ArGadaagdo → Notifications.",
            "Notifications are off in your phone settings: Settings → ArGadaagdo → Notifications."
          )}
        </p>
      )}
      {on && !compact && (
        <button type="button" onClick={() => void sendTest()} className="mt-1 text-xs font-bold text-mint">
          {testNote || L("სატესტო შეტყობინების გაგზავნა", "Send me a test notification")}
        </button>
      )}
      {failed && (
        <p className="mt-2 text-xs leading-5 text-danger">
          {L("ვერ ჩაირთო. სცადე მოგვიანებით.", "Couldn't turn them on. Please try again later.")}
        </p>
      )}
    </section>
  );
}
