"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/useLanguage";

// Admin 2-step sign-in (check-2 #13): after the password, a 6-digit code from
// an authenticator app (Google Authenticator, 1Password, Authy...). The first
// time it shows a QR code to set the app up. The database only treats a
// session as admin once it has passed this step (private.is_admin requires
// aal2, 20261107150000_admin_two_step.sql). Lost the phone? Remove the factor
// in Supabase → Authentication → Users → the admin → MFA, then set it up again.

type Step =
  | { kind: "loading" }
  | { kind: "enroll"; factorId: string; qr: string; secret: string }
  | { kind: "verify"; factorId: string }
  | { kind: "error"; message: string };

export function AdminTwoStep({ onDone }: { onDone: () => void }) {
  const { language } = useLanguage();
  const L = (ka: string, en: string) => (language === "ka" ? ka : en);
  const [step, setStep] = useState<Step>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    let active = true;

    async function start() {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (!active) return;
      if (error) {
        setStep({ kind: "error", message: error.message });
        return;
      }

      const verified = data.totp.find((factor) => factor.status === "verified");
      if (verified) {
        setStep({ kind: "verify", factorId: verified.id });
        return;
      }

      // Drop half-finished set-ups, then start a new one.
      for (const factor of data.all.filter((item) => item.status !== "verified")) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
      const enrolled = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `ArGadaagdo admin ${new Date().toISOString().slice(0, 10)}`,
      });
      if (!active) return;
      if (enrolled.error || !enrolled.data) {
        setStep({ kind: "error", message: enrolled.error?.message || "enroll failed" });
        return;
      }
      setStep({
        kind: "enroll",
        factorId: enrolled.data.id,
        qr: enrolled.data.totp.qr_code,
        secret: enrolled.data.totp.secret,
      });
    }

    void start();
    return () => {
      active = false;
    };
  }, []);

  async function verify() {
    if (step.kind !== "enroll" && step.kind !== "verify") return;
    const token = code.replace(/\D/g, "");
    if (token.length !== 6) return;
    setBusy(true);
    setWrong(false);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: step.factorId, code: token });
    setBusy(false);
    if (error) {
      setWrong(true);
      setCode("");
      return;
    }
    onDone();
  }

  return (
    <section className="mx-auto w-full max-w-md px-4 py-10">
      <div className="ui-card rounded-3xl p-6">
        <h1 className="text-2xl font-semibold text-cream">{L("ორეტაპიანი შესვლა", "2-step sign-in")}</h1>

        {step.kind === "loading" && <p className="mt-3 text-body">{L("ერთი წამით...", "One moment...")}</p>}

        {step.kind === "error" && (
          <p className="mt-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {L("ვერ ჩაიტვირთა. განაახლე გვერდი.", "Couldn't load. Reload the page.")} ({step.message})
          </p>
        )}

        {step.kind === "enroll" && (
          <>
            <p className="mt-3 text-sm leading-6 text-body">
              {L(
                "ადმინის პანელს მეორე ნაბიჯი სჭირდება. ავთენტიფიკატორ აპლიკაციაში (Google Authenticator, 1Password, Authy) დაასკანერე კოდი და ჩაწერე 6 ციფრი.",
                "The admin area needs a second step. Scan this code with an authenticator app (Google Authenticator, 1Password, Authy) and type the 6 digits."
              )}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={step.qr} alt={L("QR კოდი", "QR code")} className="mx-auto mt-4 h-48 w-48 rounded-2xl bg-white p-2" />
            <p className="mt-3 break-all text-center font-mono text-xs text-body">{step.secret}</p>
          </>
        )}

        {step.kind === "verify" && (
          <p className="mt-3 text-sm leading-6 text-body">
            {L("ჩაწერე 6-ნიშნა კოდი ავთენტიფიკატორ აპლიკაციიდან.", "Type the 6-digit code from your authenticator app.")}
          </p>
        )}

        {(step.kind === "enroll" || step.kind === "verify") && (
          <>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(event) => {
                if (event.key === "Enter") void verify();
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label={L("6-ნიშნა კოდი", "6-digit code")}
              placeholder="123456"
              className="premium-input mt-4 w-full p-4 text-center font-mono text-2xl tracking-[0.3em]"
            />
            {wrong && (
              <p className="mt-2 text-sm font-semibold text-danger">
                {L("კოდი არასწორია ან ვადა გაუვიდა. სცადე ახალი.", "Wrong or expired code. Try the next one.")}
              </p>
            )}
            <button
              type="button"
              onClick={() => void verify()}
              disabled={busy || code.length !== 6}
              className="premium-button mt-4 min-h-12 w-full rounded-2xl font-semibold disabled:opacity-60"
            >
              {busy ? "…" : L("დადასტურება", "Confirm")}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
