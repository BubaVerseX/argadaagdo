"use client";

import { normalizeGeorgianMobile } from "@/lib/verification";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/useLanguage";
import { useState } from "react";

function getPhoneErrorMessage(
  error: { code?: string; message?: string },
  isGeorgian: boolean
) {
  const text = `${error.code || ""} ${error.message || ""}`.toLowerCase();

  if (text.includes("phone_exists") || text.includes("already been registered")) {
    return isGeorgian
      ? "ეს ნომერი უკვე სხვა ანგარიშზეა მიბმული."
      : "This number is already linked to another account.";
  }

  if (text.includes("rate_limit") || text.includes("rate limit")) {
    return isGeorgian
      ? "ძალიან ბევრი მცდელობა. მოიცადე ერთი წუთი."
      : "Too many attempts. Wait a minute and try again.";
  }

  if (text.includes("otp_expired") || text.includes("expired") || text.includes("invalid")) {
    return isGeorgian
      ? "კოდი არასწორია ან ვადა გაუვიდა."
      : "That code is wrong or has expired.";
  }

  return isGeorgian
    ? "SMS ვერ გაიგზავნა. სცადე ხელახლა."
    : "The SMS could not be sent. Please try again.";
}

/** Phone number, then SMS code. Attaches a confirmed phone to the signed-in account. */
export function PhoneVerification({
  onVerified,
}: {
  onVerified: (phone: string) => void;
}) {
  const { language } = useLanguage();
  const isGeorgian = language === "ka";
  const [phoneInput, setPhoneInput] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendCode() {
    if (busy) return;

    const phone = normalizeGeorgianMobile(phoneInput);

    if (!phone) {
      setError(
        isGeorgian
          ? "შეიყვანე ქართული მობილურის ნომერი: 5XX XXX XXX."
          : "Enter a Georgian mobile number: 5XX XXX XXX."
      );
      return;
    }

    setBusy(true);
    setError("");

    const { error: sendError } = await supabase.auth.updateUser({ phone });

    setBusy(false);

    if (sendError) {
      setError(getPhoneErrorMessage(sendError, isGeorgian));
      return;
    }

    setSentTo(phone);
    setCode("");
  }

  async function confirmCode() {
    if (busy) return;

    setBusy(true);
    setError("");

    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: sentTo,
      token: code.trim(),
      type: "phone_change",
    });

    setBusy(false);

    if (verifyError) {
      setError(getPhoneErrorMessage(verifyError, isGeorgian));
      return;
    }

    onVerified(sentTo);
  }

  return (
    <div className="grid gap-4">
      {!sentTo ? (
        <>
          <label className="grid gap-2 text-sm font-semibold text-body">
            {isGeorgian ? "მობილურის ნომერი" : "Mobile number"}
            <input
              value={phoneInput}
              onChange={(event) => setPhoneInput(event.target.value)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="5XX XXX XXX"
              maxLength={20}
              className="premium-input p-4 font-medium"
            />
          </label>
          <button
            type="button"
            onClick={() => void sendCode()}
            disabled={busy}
            className="premium-button px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy
              ? isGeorgian
                ? "იგზავნება..."
                : "Sending..."
              : isGeorgian
                ? "კოდის გაგზავნა"
                : "Send code"}
          </button>
        </>
      ) : (
        <>
          <label className="grid gap-2 text-sm font-semibold text-body">
            {isGeorgian ? `SMS კოდი (${sentTo})` : `SMS code (${sentTo})`}
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="premium-input p-4 text-center text-xl font-semibold tracking-widest"
            />
          </label>
          <button
            type="button"
            onClick={() => void confirmCode()}
            disabled={busy || code.trim().length !== 6}
            className="premium-button px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGeorgian ? "დადასტურება" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => {
              setSentTo("");
              setError("");
            }}
            className="min-h-11 text-sm font-semibold text-body underline-offset-4 hover:underline"
          >
            {isGeorgian ? "ნომრის შეცვლა / თავიდან გაგზავნა" : "Change number / send again"}
          </button>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
