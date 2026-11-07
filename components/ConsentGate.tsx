"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DATA_TRANSFER_CONSENT_VERSION,
  getMyConsents,
  recordConsent,
} from "@/lib/consents";
import { isNativeApp } from "@/lib/native";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/useLanguage";

// Accounts created before the sign-up checkbox (7 Nov 2026) confirm the
// transfer of data abroad once (PDP Law Art. 37): one screen, "I agree" or
// sign out. Legal pages stay readable. Once agreed, a per-account flag on the
// device skips the check next time.
const EXEMPT = /^\/(privacy|terms|refund-policy|pickup-policy|login|staff\/|offline)/;

function okKey(userId: string) {
  return `argadaagdo-consent:${userId}:${DATA_TRANSFER_CONSENT_VERSION}`;
}

function readOk(userId: string) {
  try {
    return window.localStorage.getItem(okKey(userId)) === "1";
  } catch {
    return false;
  }
}

function writeOk(userId: string) {
  try {
    window.localStorage.setItem(okKey(userId), "1");
  } catch {
    // Checked with the server again next time; harmless.
  }
}

export default function ConsentGate() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const L = (ka: string, en: string) => (language === "ka" ? ka : en);
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function check(id: string | null) {
      if (!id || readOk(id)) {
        if (active) setUserId(null);
        return;
      }
      const consents = await getMyConsents();
      // Unreachable server: never lock people out over a failed check.
      if (!active || consents === null) return;
      const agreed = consents.some((consent) => consent.kind === "data_transfer" && consent.granted);
      if (agreed) writeOk(id);
      setUserId(agreed ? null : id);
    }

    void supabase.auth.getSession().then(({ data }) => check(data.session?.user.id ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Never call Supabase inside this callback directly (it can deadlock).
      window.setTimeout(() => void check(session?.user.id ?? null), 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (!userId || EXEMPT.test(pathname)) return null;

  async function agree() {
    if (!userId) return;
    setBusy(true);
    setFailed(false);
    const ok = await recordConsent(
      "data_transfer",
      DATA_TRANSFER_CONSENT_VERSION,
      true,
      isNativeApp() ? "app" : "web"
    );
    setBusy(false);
    if (!ok) {
      setFailed(true);
      return;
    }
    writeOk(userId);
    setUserId(null);
  }

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
    setUserId(null);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-gate-title"
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 px-3 pb-[calc(0.75rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] pt-[calc(0.75rem+var(--safe-area-inset-top,env(safe-area-inset-top,0px)))] sm:items-center"
    >
      <div className="w-full max-w-md rounded-[28px] bg-card p-5 text-cream shadow-[var(--shadow-card)] sm:p-6">
        <h2 id="consent-gate-title" className="text-xl font-semibold leading-snug">
          {L("თანხმობა მონაცემების გადაცემაზე", "Your consent to data transfer")}
        </h2>
        <p className="mt-3 text-[15px] leading-6 text-body">
          {L(
            "არ გადააგდოს მუშაობისთვის ვიყენებთ საქართველოს გარეთ მყოფ პროვაიდერებს (აშშ, ევროკავშირი, გაერთიანებული სამეფო, ავსტრალია): სერვერები, ელფოსტა, შეტყობინებები. საქართველოს კანონი ამისთვის შენს წერილობით თანხმობას ითხოვს.",
            "To run ArGadaagdo, we use providers outside Georgia (USA, EU, UK, Australia) for servers, emails and notifications. Georgian law asks for your written consent to that."
          )}
        </p>
        <Link
          href="/privacy#transfers"
          className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-mint underline underline-offset-4"
        >
          {L("დეტალები კონფიდენციალურობის პოლიტიკაში", "Details in the Privacy Policy")}
        </Link>
        {failed && (
          <p className="mt-2 rounded-2xl bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
            {L("ვერ შევინახეთ. სცადე ხელახლა.", "Couldn't save. Please try again.")}
          </p>
        )}
        <button
          type="button"
          onClick={() => void agree()}
          disabled={busy}
          className="premium-button mt-4 min-h-12 w-full rounded-2xl px-6 py-3 font-semibold disabled:opacity-60"
        >
          {L("ვეთანხმები", "I agree")}
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={busy}
          className="mt-2 min-h-11 w-full rounded-2xl text-sm font-semibold text-body disabled:opacity-60"
        >
          {L("გასვლა ანგარიშიდან", "Sign out")}
        </button>
      </div>
    </div>
  );
}
