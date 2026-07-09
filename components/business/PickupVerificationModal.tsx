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
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1a1815]/60 px-4 py-6 sm:py-10">
      <div className="mx-auto flex min-h-full max-w-lg items-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pickup-verification-title"
          className="w-full rounded-[2rem] bg-white p-5 shadow-2xl sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[#5c7a5c]">
                Pickup Operations
              </p>
              <h3
                id="pickup-verification-title"
                className="mt-2 text-2xl font-black text-[#1a1815]"
              >
                Verify Customer Pickup Code
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={updatingOrderId !== null}
              aria-label="Close pickup verification"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ece7da] font-black text-[#1a1815] transition hover:bg-[#d9d5cb] disabled:cursor-not-allowed disabled:opacity-60"
            >
              ×
            </button>
          </div>

          <div className="mt-5 rounded-3xl bg-[#ece7da] p-4">
            <p className="text-lg font-black text-[#1a1815]">
              {order.offers?.title || t("common.offerUnavailable")}
            </p>
            <p className="mt-2 font-semibold text-[#6b6558]">
              {t("businessDashboard.customer")}:{" "}
              {order.profiles?.email || t("common.unavailable")}
            </p>
            <p className="mt-1 font-semibold text-[#6b6558]">
              {t("common.pickup")}:{" "}
              {order.offers
                ? formatPickupWindow(order.offers, language)
                : t("orders.pickupUnavailable")}
            </p>
          </div>

          <p className="mt-5 font-semibold leading-7 text-[#6b6558]">
            Ask the customer to show the pickup code from their Orders page.
            Enter it here before handing over the order.
          </p>

          <label
            htmlFor="pickup-verification-code"
            className="mt-5 block text-sm font-black uppercase tracking-wide text-[#6b6558]"
          >
            Pickup Code
          </label>
          <input
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
            <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 font-bold text-red-700">
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
              Cancel
            </button>

            <button
              type="button"
              onClick={onSubmit}
              disabled={updatingOrderId !== null}
              className="premium-button px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updatingOrderId === order.id
                ? "Completing..."
                : "Verify & Complete Pickup"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
