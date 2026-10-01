import { ClockIcon, XIcon } from "@/components/icons";
import { useEffect, useRef } from "react";
import type { Language, TranslationKey } from "@/lib/i18n";
import { formatPickupWindow } from "@/lib/offerLifecycle";
import type { Order } from "@/lib/types";

type PickupVerificationModalProps = {
  t: (key: TranslationKey) => string;
  language: Language;
  order: Order;
  code: string;
  error: string;
  updatingOrderId: number | null;
  onCodeChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function PickupVerificationModal({
  t,
  language,
  order,
  code,
  error,
  updatingOrderId,
  onCodeChange,
  onClose,
  onSubmit,
}: PickupVerificationModalProps) {
  const isGeorgian = language === "ka";
  const codeInputRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Dialog basics: focus the code field, close on Escape, stop the page
  // behind from scrolling, and give focus back to where it was on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    codeInputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#2e2a22]/60 px-4 py-6 sm:py-10">
      <div className="mx-auto flex min-h-full max-w-lg items-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pickup-verification-title"
          className="w-full rounded-[2rem] bg-[#ece4d6] p-5 shadow-[16px_16px_32px_#d1c6b0,-16px_-16px_32px_#ffffff] sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[#a67c52]">
                {isGeorgian ? "წაღების ოპერაციები" : "Pickup Operations"}
              </p>
              <h3
                id="pickup-verification-title"
                className="mt-2 text-2xl font-black text-[#2e2a22]"
              >
                {isGeorgian
                  ? "შეამოწმე მომხმარებლის წაღების კოდი"
                  : "Verify Customer Pickup Code"}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={updatingOrderId !== null}
              aria-label={
                isGeorgian
                  ? "წაღების შემოწმების დახურვა"
                  : "Close pickup verification"
              }
              className="soft-raised flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#2e2a22] transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              <XIcon className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>

          <div className="mt-5 rounded-3xl bg-[#f4efe4] p-4">
            <p className="text-lg font-black text-[#2e2a22]">
              {order.offers?.title || t("common.offerUnavailable")}
            </p>
            <p className="mt-2 font-semibold text-[#6b6152]">
              {t("businessDashboard.customer")}:{" "}
              {order.profiles?.email || t("common.unavailable")}
            </p>
            <p className="mt-1 flex items-center gap-1.5 font-semibold text-[#6b6152]">
              <ClockIcon className="h-4 w-4 shrink-0 text-[#8a8072]" strokeWidth={1.8} />
              {t("common.pickup")}:{" "}
              {order.offers
                ? formatPickupWindow(order.offers, language)
                : t("orders.pickupUnavailable")}
            </p>
          </div>

          <p className="mt-5 font-semibold leading-7 text-[#6b6152]">
            {isGeorgian
              ? "სთხოვე მომხმარებელს, შეკვეთების გვერდიდან წაღების კოდი გაჩვენოს. შეკვეთის გადაცემამდე კოდი აქ შეიყვანე."
              : "Ask the customer to show the pickup code from their Orders page. Enter it here before handing over the order."}
          </p>

          <label
            htmlFor="pickup-verification-code"
            className="mt-5 block text-sm font-black uppercase tracking-wide text-[#6b6152]"
          >
            {t("orders.pickupCode")}
          </label>
          <input
            ref={codeInputRef}
            id="pickup-verification-code"
            value={code}
            onChange={(event) => onCodeChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSubmit();
              }
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="premium-input mt-2 w-full p-4 font-mono text-2xl tracking-widest"
            placeholder="123456"
          />

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-2xl bg-red-50 px-4 py-3 font-bold text-red-700"
            >
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={updatingOrderId !== null}
              className="premium-button-secondary px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("common.cancel")}
            </button>

            <button
              type="button"
              onClick={onSubmit}
              disabled={updatingOrderId !== null}
              className="premium-button px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updatingOrderId === order.id
                ? isGeorgian
                  ? "სრულდება..."
                  : "Completing..."
                : isGeorgian
                ? "შემოწმება და წაღების დასრულება"
                : "Verify & Complete Pickup"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
