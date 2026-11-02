"use client";

import BrandMark from "@/components/BrandMark";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Notice from "@/components/Notice";
import { CheckCircleIcon, LockIcon } from "@/components/icons";
import { getGreenBagLabel } from "@/lib/offerCategories";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/useLanguage";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Summary = {
  business_id: number;
  business_name: string;
  department_name: string;
  is_default: boolean;
  sales_paused: boolean;
};

type StaffReservation = {
  order_id: number;
  title: string;
  category: string | null;
  size: string | null;
  pickup_date: string;
  pickup_start: string | null;
  pickup_end: string | null;
  status: string;
  customer_hint: string | null;
  created_at: string;
  completed_at: string | null;
};

type Tone = "success" | "error" | "warning";

const REFRESH_MS = 20000;

function pinStorageKey(departmentId: string) {
  return `argadaagdo-staff-pin-${departmentId}`;
}

// Random token kept on this device; wrong PINs/codes are counted per device
// (plus IP) in the database, so nobody can lock a whole department out.
function getDeviceToken() {
  const key = "argadaagdo-staff-device";
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const token = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(key, token);
    return token;
  } catch {
    return "nostorage";
  }
}

function describePinError(message: string, isGeorgian: boolean) {
  if (message.includes("pin_locked") || message.includes("staff_pin_locked")) {
    return isGeorgian
      ? "ამ მოწყობილობიდან ძალიან ბევრი არასწორი ცდა იყო. სცადე 15 წუთში, ან სთხოვე მფლობელს განბლოკვა პანელიდან."
      : "Too many wrong attempts from this device. Try again in 15 minutes, or ask the owner to unlock it from the dashboard.";
  }
  if (message.includes("rate_limited")) {
    return isGeorgian ? "ძალიან სწრაფად. სცადე წამში." : "Too fast. Try again in a second.";
  }
  if (message.includes("pin_invalid")) {
    return isGeorgian ? "არასწორი PIN." : "Wrong PIN.";
  }
  return isGeorgian
    ? "გვერდი ვერ ჩაიტვირთა. სცადე თავიდან."
    : "The page could not be loaded. Please try again.";
}

// Department staff page: no owner login. Staff enter the department PIN once
// (kept in sessionStorage on this device), then see today's reservations and
// complete pickups by the customer's 6-digit code. Everything goes through the
// PIN-gated staff_* RPCs; nothing here can read other orders.
export default function StaffDepartmentPage() {
  const params = useParams<{ departmentId: string }>();
  const departmentId = Number(params.departmentId);
  const { language, t } = useLanguage();
  const isGeorgian = language === "ka";
  const [pinInput, setPinInput] = useState("");
  const [pin, setPin] = useState<string | null>(null);
  const [checkingPin, setCheckingPin] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [reservations, setReservations] = useState<StaffReservation[]>([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<Tone>("success");
  const [lastCompleted, setLastCompleted] = useState<StaffReservation | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    async (activePin: string, silent = false) => {
      if (!Number.isFinite(departmentId)) return false;
      // staff_session returns {status, summary, reservations} and never raises
      // for a bad PIN, so wrong attempts are counted per device.
      const sessionResult = await supabase.rpc("staff_session", {
        p_department_id: departmentId,
        p_pin: activePin,
        p_device: getDeviceToken(),
      });
      const payload = (sessionResult.data || {}) as {
        status?: string;
        summary?: Summary;
        reservations?: StaffReservation[];
      };
      const failure =
        sessionResult.error?.message || (payload.status !== "ok" ? payload.status || "error" : null);

      if (failure) {
        if (!silent) {
          setMessageTone("error");
          setMessage(describePinError(failure, isGeorgian));
        }
        if (/pin_invalid|pin_locked/.test(failure)) {
          setPin(null);
          try {
            window.sessionStorage.removeItem(pinStorageKey(String(departmentId)));
          } catch {}
        }
        return false;
      }

      setSummary(payload.summary || null);
      setReservations(payload.reservations || []);
      return true;
    },
    [departmentId, isGeorgian]
  );

  // Restore a PIN remembered on this device (sessionStorage) and unlock.
  useEffect(() => {
    let active = true;

    async function restoreRememberedPin() {
      let stored: string | null = null;
      try {
        stored = window.sessionStorage.getItem(pinStorageKey(String(departmentId)));
      } catch {}
      if (!stored) return;
      const ok = await load(stored, true);
      if (ok && active) setPin(stored);
    }

    void restoreRememberedPin();

    return () => {
      active = false;
    };
  }, [departmentId, load]);

  useEffect(() => {
    if (!pin) return;
    const timer = window.setInterval(() => void load(pin, true), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [pin, load]);

  async function submitPin() {
    const candidate = pinInput.trim();
    if (candidate.length < 4 || checkingPin) return;
    setCheckingPin(true);
    setMessage("");
    const ok = await load(candidate);
    setCheckingPin(false);
    if (ok) {
      setPin(candidate);
      setPinInput("");
      try {
        window.sessionStorage.setItem(pinStorageKey(String(departmentId)), candidate);
      } catch {}
      window.setTimeout(() => codeInputRef.current?.focus(), 50);
    }
  }

  function signOut() {
    setPin(null);
    setSummary(null);
    setReservations([]);
    try {
      window.sessionStorage.removeItem(pinStorageKey(String(departmentId)));
    } catch {}
  }

  async function completeByCode() {
    if (!pin || busy) return;
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setMessageTone("warning");
      setMessage(isGeorgian ? "შეიყვანე 6-ნიშნა წაღების კოდი." : "Enter the 6-digit pickup code.");
      return;
    }
    setBusy(true);
    setMessage("");
    const { data, error } = await supabase.rpc("staff_collect", {
      p_department_id: departmentId,
      p_pin: pin,
      p_pickup_code: trimmed,
      p_device: getDeviceToken(),
    });
    setBusy(false);

    if (error || data === "pin_invalid" || data === "pin_locked" || data === "rate_limited") {
      setMessageTone("error");
      setMessage(describePinError(error?.message || String(data), isGeorgian));
      if (data === "pin_invalid" || data === "pin_locked") signOut();
      return;
    }

    if (data === "completed") {
      const matched =
        reservations.find((r) => ["reserved", "confirmed"].includes(r.status)) || null;
      setLastCompleted(matched);
      setMessageTone("success");
      setMessage(isGeorgian ? "წაღება დადასტურდა. გადაეცი ჩანთა." : "Pickup confirmed. Hand over the bag.");
      setCode("");
      await load(pin, true);
      return;
    }

    setMessageTone(data === "locked" ? "error" : "warning");
    setMessage(
      data === "locked"
        ? isGeorgian
          ? "ძალიან ბევრი არასწორი კოდი. ეს მოწყობილობა 15 წუთით დაიბლოკა; მფლობელს პანელიდან განბლოკვა შეუძლია."
          : "Too many wrong codes. This device is locked for 15 minutes; the owner can unlock it from the dashboard."
        : data === "ambiguous"
        ? isGeorgian
          ? "ამ კოდით ორი ღია ჯავშანია. დაასრულე მფლობელის პანელიდან."
          : "Two open reservations share this code. Complete it from the owner dashboard."
        : isGeorgian
        ? "კოდი არ ემთხვევა ამ დეპარტამენტის ღია ჯავშანს."
        : "That code doesn't match an open reservation in this department."
    );
  }

  async function togglePause() {
    if (!pin || !summary || busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("staff_pause", {
      p_department_id: departmentId,
      p_pin: pin,
      p_paused: !summary.sales_paused,
      p_device: getDeviceToken(),
    });
    setBusy(false);
    const pauseStatus = (data as { status?: string } | null)?.status;
    if (error || pauseStatus !== "ok") {
      setMessageTone("error");
      setMessage(describePinError(error?.message || String(pauseStatus), isGeorgian));
      return;
    }
    setMessageTone("success");
    setMessage(
      summary.sales_paused
        ? isGeorgian
          ? "გაყიდვები ისევ ჩართულია."
          : "Sales are back on."
        : isGeorgian
        ? "დღეს ახალი ჩანთები აღარ გაიყიდება."
        : "No more bags will be sold today."
    );
    await load(pin, true);
  }

  const openReservations = reservations.filter((r) => ["reserved", "confirmed"].includes(r.status));
  const doneReservations = reservations.filter((r) => !["reserved", "confirmed"].includes(r.status));

  return (
    <main className="app-shell min-h-screen px-4 pb-16 pt-6 sm:px-6">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
        <BrandMark />
        <LanguageSwitcher />
      </div>

      {!pin ? (
        <div className="premium-card mx-auto mt-8 max-w-md rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-well text-mint">
              <LockIcon className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-mint">
                {isGeorgian ? "თანამშრომლის რეჟიმი" : "Staff mode"}
              </p>
              <h1 className="text-2xl font-semibold text-cream">
                {isGeorgian ? "შეიყვანე დეპარტამენტის PIN" : "Enter the department PIN"}
              </h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-body">
            {isGeorgian
              ? "PIN-ს ბიზნესის მფლობელი აყენებს ბიზნეს პანელში. ამ მოწყობილობაზე ის ბრაუზერის დახურვამდე იმახსოვრება."
              : "The owner sets the PIN in the business dashboard. It stays remembered on this device until the browser is closed."}
          </p>
          <input
            value={pinInput}
            onChange={(event) => setPinInput(event.target.value.replace(/\D/g, "").slice(0, 8))}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submitPin();
            }}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            aria-label="PIN"
            className="premium-input mt-5 w-full p-4 text-center font-mono text-2xl font-semibold tracking-[0.3em]"
            placeholder="••••"
          />
          {message && (
            <div className="mt-4">
              <Notice tone={messageTone}>{message}</Notice>
            </div>
          )}
          <button
            type="button"
            onClick={() => void submitPin()}
            disabled={checkingPin || pinInput.length < 4}
            className="premium-button cta-glow mt-5 w-full py-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checkingPin ? t("common.loading") : isGeorgian ? "შესვლა" : "Continue"}
          </button>
        </div>
      ) : (
        <div className="mx-auto mt-6 grid max-w-2xl gap-5">
          <div className="premium-card rounded-3xl p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-mint">
                  {summary?.business_name || t("common.loading")}
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-cream sm:text-3xl">
                  {summary
                    ? summary.is_default && summary.department_name === "Main"
                      ? isGeorgian
                        ? "მთავარი"
                        : "Main"
                      : summary.department_name
                    : ""}
                </h1>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="premium-button-secondary min-h-10 px-4 py-2 text-sm"
              >
                {isGeorgian ? "გასვლა" : "Lock"}
              </button>
            </div>

            <label className="mt-5 grid gap-2 text-sm font-semibold text-body">
              {isGeorgian ? "მომხმარებლის წაღების კოდი" : "Customer's pickup code"}
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  ref={codeInputRef}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void completeByCode();
                  }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  className="premium-input flex-1 p-4 text-center font-mono text-3xl font-semibold tracking-[0.3em]"
                  placeholder="000000"
                />
                <button
                  type="button"
                  onClick={() => void completeByCode()}
                  disabled={busy || code.length !== 6}
                  className="premium-button cta-glow min-h-14 px-6 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGeorgian ? "წაღების დადასტურება" : "Confirm pickup"}
                </button>
              </div>
            </label>

            {message && (
              <div className="mt-4">
                <Notice tone={messageTone}>{message}</Notice>
              </div>
            )}

            {lastCompleted && messageTone === "success" && (
              <div className="ui-card mt-4 flex items-center gap-3 rounded-2xl p-4">
                <CheckCircleIcon className="h-8 w-8 shrink-0 text-mint" strokeWidth={1.8} />
                <div className="min-w-0">
                  <p className="font-semibold text-cream">{lastCompleted.title}</p>
                  <p className="text-sm text-body">{getGreenBagLabel(lastCompleted, language)}</p>
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <p className="text-sm text-body">
                {summary?.sales_paused
                  ? isGeorgian
                    ? "დღეს ახალი ჩანთები არ იყიდება."
                    : "No new bags are being sold today."
                  : isGeorgian
                  ? "მწვანე ჩანთები იყიდება."
                  : "Green Bags are on sale."}
              </p>
              <button
                type="button"
                disabled={busy || !summary}
                onClick={() => void togglePause()}
                className={`${
                  summary?.sales_paused ? "premium-button" : "premium-button-danger"
                } min-h-10 px-4 py-2 text-sm disabled:opacity-60`}
              >
                {summary?.sales_paused
                  ? isGeorgian
                    ? "გაყიდვების ჩართვა"
                    : "Turn sales back on"
                  : isGeorgian
                  ? "დღეს ჩანთები არ არის"
                  : "Today: no bags"}
              </button>
            </div>
          </div>

          <div className="premium-card rounded-3xl p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-cream">
              {isGeorgian ? "წასაღებად მზად" : "Waiting for pickup"}{" "}
              <span className="text-body">({openReservations.length})</span>
            </h2>
            <div className="mt-4 grid gap-3">
              {openReservations.length === 0 && (
                <p className="rounded-2xl bg-well p-4 text-sm text-body">
                  {isGeorgian ? "ღია ჯავშნები არ არის." : "No open reservations."}
                </p>
              )}
              {openReservations.map((reservation) => (
                <div key={reservation.order_id} className="ui-card rounded-2xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-cream">{reservation.title}</p>
                    <span className="rounded-full bg-well px-3 py-1 text-xs font-semibold text-mint">
                      {getGreenBagLabel(reservation, language)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-body">
                    #{reservation.order_id} · {reservation.pickup_date} ·{" "}
                    {reservation.pickup_start?.slice(0, 5)}–{reservation.pickup_end?.slice(0, 5)}
                    {reservation.customer_hint ? ` · ${reservation.customer_hint}` : ""}
                  </p>
                </div>
              ))}
            </div>

            {doneReservations.length > 0 && (
              <>
                <h3 className="mt-6 text-sm font-semibold uppercase tracking-widest text-body">
                  {isGeorgian ? "დასრულებული" : "Done"}
                </h3>
                <div className="mt-3 grid gap-2">
                  {doneReservations.slice(0, 20).map((reservation) => (
                    <div
                      key={reservation.order_id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-well px-4 py-3 text-sm"
                    >
                      <span className="font-semibold text-cream">
                        #{reservation.order_id} · {reservation.title}
                      </span>
                      <span className="text-body">
                        {["collected", "completed"].includes(reservation.status)
                          ? isGeorgian
                            ? "წაღებულია"
                            : "Collected"
                          : isGeorgian
                          ? "არ გამოცხადდა"
                          : "No-show"}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
