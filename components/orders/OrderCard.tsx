"use client";

import { TimelineSteps } from "@/components/TimelineSteps";
import { ChevronDownIcon } from "@/components/icons";
import { createMapsSearchUrl } from "@/lib/maps";
import {
  formatMoney,
  formatPickupTimeRange,
  getOfferDateLabel,
} from "@/lib/offerLifecycle";
import {
  getEffectiveOrderStatus,
  getOrderStatusLabel,
  isCollectedOrderStatus,
  isConfirmedOrderStatus,
  isPendingPaymentOrderStatus,
} from "@/lib/orderStatus";
import {
  canShowCancellationAvailable,
  getCustomerTimelineSteps,
  isCollectWindowOpen,
} from "@/lib/orders";
import type { Language, TranslationKey } from "@/lib/i18n";
import type { Order } from "@/lib/types";
import type { ReactNode } from "react";

type T = (key: TranslationKey) => string;

function formatCode(code: string) {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

/** 6.11.2026 — the same short date in both languages. */
function formatShortDate(value: string, language: Language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(language === "ka" ? "ka-GE" : "en-GB", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

function isFreeOrder(order: Order) {
  const amount = order.amount ?? order.offers?.price ?? null;
  return amount !== null && Number(amount) === 0;
}

function amountLabel(order: Order, t: T) {
  if (isFreeOrder(order)) return t("native.orders.free");
  // What the customer paid; the offer's price may have changed since.
  if (order.amount) return formatMoney(order.amount);
  return order.offers ? formatMoney(order.offers.price) : t("common.unavailable");
}

export function isActiveOrder(order: Order) {
  const status = getEffectiveOrderStatus(order);
  return isConfirmedOrderStatus(status) || isPendingPaymentOrderStatus(status);
}

type RatingProps = {
  selectedRating: number;
  reviewText: string;
  ratingOrderId: number | null;
  onRateOrder: (order: Order) => void;
  onRatingChange: (orderId: number, rating: number) => void;
  onReviewChange: (orderId: number, value: string) => void;
};

/** Status steps, amount, reservation number and (after pickup) the rating. */
function OrderDetails({
  order,
  language,
  t,
  rating,
}: {
  order: Order;
  language: Language;
  t: T;
  rating?: RatingProps;
}) {
  const isGeorgian = language === "ka";
  const status = getEffectiveOrderStatus(order);
  const steps = getCustomerTimelineSteps(order, language);

  return (
    <div className="grid gap-3 text-sm text-body">
      <TimelineSteps
        // A free reservation has no payment step.
        steps={isFreeOrder(order) ? steps.slice(1) : steps}
        ariaLabel={isGeorgian ? "შეკვეთის ეტაპები" : "Order timeline"}
      />
      <p>
        {t("native.orders.amount")}: {amountLabel(order, t)} · #{order.id}
      </p>

      {rating && isCollectedOrderStatus(status) && (
        order.rated_at ? (
          <p className="font-semibold text-mint">{t("orders.reviewThanks")}</p>
        ) : (
          <div>
            <p className="font-semibold text-cream">{t("orders.ratePickup")}</p>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={
                    isGeorgian
                      ? `წაღების შეფასება: ${value} 5-დან`
                      : `Rate this pickup ${value} out of 5`
                  }
                  aria-pressed={rating.selectedRating === value}
                  onClick={() => rating.onRatingChange(order.id, value)}
                  disabled={rating.ratingOrderId !== null}
                  className={`min-h-11 rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    rating.selectedRating === value ? "bg-brand-mint text-brand-forest" : "bg-well text-body"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
            <textarea
              value={rating.reviewText}
              onChange={(event) => rating.onReviewChange(order.id, event.target.value)}
              maxLength={500}
              aria-label={t("orders.reviewLabel")}
              placeholder={t("orders.reviewPlaceholder")}
              className="premium-input mt-2 min-h-20 w-full p-3 text-sm"
            />
            <button
              type="button"
              onClick={() => rating.onRateOrder(order)}
              disabled={rating.ratingOrderId !== null || !rating.selectedRating}
              className="premium-button mt-2 min-h-11 w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {rating.ratingOrderId === order.id ? "…" : t("orders.submitReview")}
            </button>
          </div>
        )
      )}
    </div>
  );
}

function DetailsToggle({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-1.5 text-[13px] font-medium text-body [&::-webkit-details-marker]:hidden">
        {label}
        <ChevronDownIcon
          className="h-4 w-4 transition-transform group-open:rotate-180"
          strokeWidth={2}
        />
      </summary>
      <div className="pt-2">{children}</div>
    </details>
  );
}

type ActiveOrderCardProps = {
  order: Order;
  language: Language;
  t: T;
  cancellingOrderId: number | null;
  onAskCancel: (order: Order) => void;
  onOpenCollect?: (order: Order) => void;
};

/** An active reservation: pickup by swipe first (code only as a backup), then the essentials. */
export function ActiveOrderCard({
  order,
  language,
  t,
  cancellingOrderId,
  onAskCancel,
  onOpenCollect,
}: ActiveOrderCardProps) {
  const status = getEffectiveOrderStatus(order);
  const confirmed = isConfirmedOrderStatus(status);
  const canCancel = confirmed && canShowCancellationAvailable(order);
  const canCollect =
    confirmed && Boolean(order.pickup_code) && Boolean(onOpenCollect) && isCollectWindowOpen(order);
  const business = order.offers?.businesses;
  const place = [business?.name, business?.address].filter(Boolean).join(" · ");
  const isGeorgian = language === "ka";

  return (
    <div className="overflow-hidden rounded-[24px] bg-card text-cream shadow-[var(--shadow-card)]">
      <div className="bg-well px-4 py-6 text-center">
        {confirmed ? (
          <>
            {canCollect ? (
              <>
                <button
                  type="button"
                  onClick={() => onOpenCollect?.(order)}
                  className="native-press action-pill min-h-14 w-full rounded-2xl px-4 text-base font-bold"
                >
                  {isGeorgian ? "წაღება →" : "Collect →"}
                </button>
                <p className="mt-2 text-[13px] text-body">
                  {isGeorgian
                    ? "გადაასრიალე თანამშრომლის თვალწინ."
                    : "Swipe in front of the staff."}
                </p>
              </>
            ) : (
              <p className="text-[15px] font-semibold text-cream">
                {isGeorgian
                  ? "წაღების ღილაკი გამოჩნდება წაღებამდე 1 საათით ადრე."
                  : "The pickup button appears 1 hour before pickup."}
              </p>
            )}
            <p className="mt-3 text-[12px] text-muted">
              {isGeorgian ? "სარეზერვო კოდი" : "Backup code"}:{" "}
              <span className="whitespace-nowrap font-mono text-sm font-semibold tracking-[0.12em] text-body">
                {order.pickup_code ? formatCode(order.pickup_code) : t("common.pending")}
              </span>
            </p>
          </>
        ) : (
          <p className="font-semibold">{t("native.orders.pending")}</p>
        )}
      </div>

      <div className="grid gap-1 px-[18px] pb-3 pt-4">
        <h2 className="text-lg font-semibold leading-snug">
          {order.offers?.title || t("common.offerUnavailable")}
        </h2>
        {place && (
          <a
            href={createMapsSearchUrl(business?.address, business?.name)}
            target="_blank"
            rel="noreferrer"
            className="truncate text-sm text-body underline-offset-2 hover:underline"
          >
            {place}
          </a>
        )}
        {order.offers && (
          <p className="text-sm text-body">
            {getOfferDateLabel(order.offers, language)}{" "}
            {formatPickupTimeRange(order.offers, language)}
          </p>
        )}

        {canCancel && (
          <button
            type="button"
            disabled={cancellingOrderId !== null}
            onClick={() => onAskCancel(order)}
            className="native-press mt-3 min-h-11 rounded-2xl border border-line text-sm font-semibold text-body disabled:opacity-60"
          >
            {cancellingOrderId === order.id ? "…" : t("native.orders.cancel")}
          </button>
        )}

        <DetailsToggle label={t("native.orders.details")}>
          <OrderDetails order={order} language={language} t={t} />
        </DetailsToggle>
      </div>
    </div>
  );
}

type PastOrderRowProps = RatingProps & {
  order: Order;
  language: Language;
  t: T;
};

/** One line per past order; the rest (and rating) behind a tap. */
export function PastOrderRow({ order, language, t, ...rating }: PastOrderRowProps) {
  const status = getEffectiveOrderStatus(order);
  const canRate = isCollectedOrderStatus(status) && !order.rated_at;
  // get_my_pickup_codes still returns the code of a missed order while the
  // business can hand it over late (12 h after the window).
  const lateCode = status === "no_show" && order.pickup_code ? order.pickup_code : null;

  return (
    <details className="group rounded-[18px] bg-card" open={lateCode ? true : undefined}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-cream">
            {order.offers?.title || order.offers?.businesses?.name || t("common.offerUnavailable")}
          </span>
          <span className="block truncate text-[13px] text-body">
            {getOrderStatusLabel(status, language)}
            {order.created_at ? ` · ${formatShortDate(order.created_at, language)}` : ""}
          </span>
        </span>
        {canRate && (
          <span className="flex-none text-[13px] font-bold text-cream">
            {t("native.orders.rate")}
          </span>
        )}
        <ChevronDownIcon
          className="h-4 w-4 flex-none text-body transition-transform group-open:rotate-180"
          strokeWidth={2}
        />
      </summary>
      <div className="px-4 pb-4">
        {order.offers?.businesses?.name && (
          <p className="mb-2 text-sm text-body">{order.offers.businesses.name}</p>
        )}
        {lateCode && (
          <div className="mb-3 rounded-2xl bg-well px-4 py-4 text-center">
            <p className="whitespace-nowrap font-mono text-[2rem] font-bold leading-none tracking-[0.08em] text-brand-forest">
              {formatCode(lateCode)}
            </p>
            <p className="mt-2 text-[13px] leading-snug text-body">
              {t("orders.missedLateHandover")}
            </p>
          </div>
        )}
        <OrderDetails order={order} language={language} t={t} rating={rating} />
      </div>
    </details>
  );
}
