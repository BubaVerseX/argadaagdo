"use client";

import type { useAuthForm } from "@/lib/useAuthForm";
import { useLanguage } from "@/lib/useLanguage";
import { useEffect, useRef, useState } from "react";

type AuthForm = ReturnType<typeof useAuthForm>;

/**
 * "Enter the code from your email": six boxes over one real input, so paste,
 * the iPhone/Android "code from Mail" suggestion and screen readers all work.
 * Shared by the website login and the app login.
 */
export default function EmailCodeStep({
  form,
  tone = "web",
}: {
  form: AuthForm;
  tone?: "web" | "app";
}) {
  const { language } = useLanguage();
  const L = (ka: string, en: string) => (language === "ka" ? ka : en);
  const inputRef = useRef<HTMLInputElement>(null);
  const [now, setNow] = useState(() => Date.now());
  const digits = form.code.padEnd(6, " ").slice(0, 6).split("");
  const waitSeconds = Math.max(0, Math.ceil((form.resendAvailableAt - now) / 1000));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (waitSeconds <= 0) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [waitSeconds]);

  function change(value: string) {
    const clean = value.replace(/\D/g, "").slice(0, 6);
    form.setCode(clean);
    if (clean.length === 6) void form.verifyEmailCode(clean);
  }

  const card = tone === "app" ? "bg-card" : "ui-card";
  const errorTone = form.messageTone === "error";

  return (
    <section className={`${card} grid gap-4 rounded-[22px] p-5`}>
      <div>
        <h2 className="text-lg font-semibold text-cream">
          {L("შეიყვანე კოდი ელფოსტიდან", "Enter the code from your email")}
        </h2>
        <p className="mt-1 break-words text-sm leading-6 text-body">
          {L("6-ციფრიანი კოდი გამოგიგზავნეთ:", "We sent a 6-digit code to")}{" "}
          <span className="font-semibold text-cream">{form.codeEmail}</span>
        </p>
      </div>

      <label className="relative block" onClick={() => inputRef.current?.focus()}>
        <span className="sr-only">{L("კოდი", "Code")}</span>
        <input
          ref={inputRef}
          value={form.code}
          onChange={(event) => change(event.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          disabled={form.verifyingCode}
          aria-invalid={errorTone || undefined}
          className="absolute inset-0 h-full w-full cursor-text opacity-0"
        />
        <span aria-hidden="true" className="grid grid-cols-6 gap-2">
          {digits.map((digit, index) => {
            const active = index === Math.min(form.code.length, 5) && !form.verifyingCode;
            return (
              <span
                key={index}
                className={`flex h-14 items-center justify-center rounded-xl border text-2xl font-semibold text-cream ${
                  errorTone
                    ? "border-danger"
                    : active
                      ? "border-mint ring-2 ring-mint/40"
                      : "border-line"
                } bg-well`}
              >
                {digit.trim()}
              </span>
            );
          })}
        </span>
      </label>

      {form.message && (
        <p
          role={errorTone ? "alert" : "status"}
          className={`text-sm font-semibold ${errorTone ? "text-danger" : "text-mint"}`}
        >
          {form.message}
        </p>
      )}

      {form.verifyingCode && (
        <p role="status" className="text-sm text-body">
          {L("მოწმდება…", "Checking…")}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => void form.resendCode()}
          disabled={waitSeconds > 0 || form.resendingVerification}
          className="min-h-11 text-sm font-semibold text-mint disabled:text-muted"
        >
          {waitSeconds > 0
            ? L(
                `კოდის ხელახლა გაგზავნა (${waitSeconds} წმ)`,
                `Resend code (${waitSeconds}s)`
              )
            : L("კოდის ხელახლა გაგზავნა", "Resend code")}
        </button>
        <button
          type="button"
          onClick={form.leaveCodeStep}
          className="min-h-11 text-sm text-body underline-offset-4 hover:underline"
        >
          {L("სხვა ელფოსტა", "Different email")}
        </button>
      </div>
    </section>
  );
}
