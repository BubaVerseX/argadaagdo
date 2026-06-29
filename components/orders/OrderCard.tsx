import { TimelineSteps } from "@/components/TimelineSteps";
import { createMapsSearchUrl } from "@/lib/maps";
import {
  formatMoney,
  formatPickupTimeRange,
  getOfferDateLabel,
} from "@/lib/offerLifecycle";
import {
  getEffectiveOrderStatus,
  getOrderStatusClassName,
  isCancelledOrderStatus,
  isCollectedOrderStatus,
  isConfirmedOrderStatus,
} from "@/lib/orderStatus";
import {
  canShowCancellationAvailable,
  getCustomerStatusLabel,
  getCustomerTimelineSteps,
  getPickupReminderMessage,
} from "@/lib/orders";
import type { Language, TranslationKey } from "@/lib/i18n";
import type { Order } from "@/lib/types";

type OrderCardProps = {
  order: Order;
  language: Language;
  t: (key: TranslationKey) => string;
  selectedRating: number;
  reviewText: string;
  cancellingOrderId: number | null;
  ratingOrderId: number | null;
  onCancelOrder: (order: Order) => void;
  onRateOrder: (order: Order) => void;
  onRatingChange: (orderId: number, rating: number) => void;
  onReviewChange: (orderId: number, value: string) => void;
};

export function OrderCard({
  order,
  language,
  t,
  selectedRating,
  reviewText,
  cancellingOrderId,
  ratingOrderId,
  onCancelOrder,
  onRateOrder,
  onRatingChange,
  onReviewChange,
}: OrderCardProps) {
  const businessAddress =
    order.offers?.businesses?.address || t("common.addressUnavailable");
  const mapsUrl = createMapsSearchUrl(
    order.offers?.businesses?.address,
    order.offers?.businesses?.name
  );
  const displayStatus = getEffectiveOrderStatus(order);
  const statusClass = getOrderStatusClassName(displayStatus);
  const isConfirmed = isConfirmedOrderStatus(displayStatus);
  const isCancellationAvailable =
    isConfirmed && canShowCancellationAvailable(order);
  const pickupDateLabel = order.offers
    ? getOfferDateLabel(order.offers, language)
    : t("orders.pickupUnavailable");
  const pickupTimeLabel = order.offers
    ? formatPickupTimeRange(order.offers, language)
    : t("orders.pickupUnavailable");
  const inactiveOrderMessage = isCollectedOrderStatus(displayStatus)
    ? t("orders.collectedMessage")
    : displayStatus === "no_show"
    ? t("orders.noShowMessage")
    : displayStatus === "expired"
    ? t("orders.expiredMessage")
    : isCancelledOrderStatus(displayStatus)
    ? t("orders.cancelledMessage")
    : t("orders.pickupCodeAvailable");
  const pickupReminderMessage = getPickupReminderMessage(order, language);
  const timelineSteps = getCustomerTimelineSteps(order, language);

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-5 md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="order-2 lg:order-1">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-4 py-2 text-sm font-black ${statusClass}`}
            >
              {getCustomerStatusLabel(displayStatus, language)}
            </span>

            <span className="rounded-full bg-green-50 px-4 py-2 text-sm font-black text-green-700">
              {order.offers?.businesses?.business_type || t("common.food")}
            </span>

            {isCollectedOrderStatus(displayStatus) && !order.rated_at && (
              <span className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-black text-yellow-900">
                Ready to rate
              </span>
            )}
          </div>

          <h2 className="mt-4 text-2xl font-black sm:text-3xl">
            {order.offers?.title || t("common.offerUnavailable")}
          </h2>

          <p className="mt-2 text-lg font-bold text-gray-800">
            {order.offers?.businesses?.name || t("common.businessUnavailable")}
          </p>

          <div className="mt-4 rounded-3xl border border-green-100 bg-white p-4">
            <p className="mb-3 text-sm font-black uppercase tracking-widest text-green-700">
              Order timeline
            </p>
            <TimelineSteps steps={timelineSteps} ariaLabel="Order timeline" />
          </div>

          {pickupReminderMessage && (
            <div className="mt-4 rounded-3xl border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm font-black uppercase tracking-widest text-yellow-800">
                Pickup reminder
              </p>
              <p className="mt-2 font-bold leading-7 text-yellow-950">
                {pickupReminderMessage}
              </p>
            </div>
          )}

          <div className="mt-4 rounded-3xl bg-[#F7F6EF] p-4">
            <p className="text-sm font-black uppercase tracking-widest text-green-700">
              {t("orders.pickupReminder")}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                  {t("orders.pickupDate")}
                </p>
                <p className="mt-1 font-black text-gray-950">
                  {pickupDateLabel}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                  {t("orders.pickupTime")}
                </p>
                <p className="mt-1 font-black text-gray-950">
                  {pickupTimeLabel}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                  {t("orders.businessName")}
                </p>
                <p className="mt-1 font-black text-gray-950">
                  {order.offers?.businesses?.name ||
                    t("common.businessUnavailable")}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                  {t("orders.businessAddress")}
                </p>
                <p className="mt-1 font-semibold text-gray-700">
                  {businessAddress}
                </p>
                {order.offers?.businesses?.address && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${t("common.openMap")} ${
                      order.offers?.businesses?.name ||
                      order.offers?.title ||
                      "pickup location"
                    }`}
                    className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-full bg-green-50 px-4 py-2 text-sm font-black text-green-700 transition hover:bg-green-100 sm:w-auto"
                  >
                    {t("common.openMap")}
                  </a>
                )}
              </div>
            </div>

            <p className="mt-3 font-black text-green-700">
              {t("common.price")}:{" "}
              {order.offers
                ? formatMoney(order.offers.price)
                : t("common.unavailable")}
            </p>

            <div className="mt-4 rounded-2xl bg-white p-4">
              <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                Receipt
              </p>
              <div className="mt-2 grid gap-1 text-sm font-semibold text-gray-700">
                <p>Reservation ID: #{order.id}</p>
                <p>
                  Amount:{" "}
                  {order.amount
                    ? formatMoney(order.amount)
                    : order.offers
                    ? formatMoney(order.offers.price)
                    : t("common.unavailable")}
                </p>
                <p>Payment reference: prepared for future provider</p>
              </div>
            </div>
          </div>
        </div>

        <div className="order-1 rounded-3xl bg-[#F7F6EF] p-4 text-center sm:rounded-[2rem] sm:p-5 lg:order-2 lg:min-w-[280px]">
          <p className="text-sm font-black uppercase tracking-widest text-gray-500">
            {t("orders.pickupCode")}
          </p>

          {isConfirmed ? (
            <>
              <div className="mt-3 rounded-2xl border-2 border-green-200 bg-white px-4 py-5 shadow-sm sm:rounded-3xl sm:px-6 sm:py-6">
                <p className="text-sm font-black text-green-700">
                  {t("orders.pickupCode")}:
                </p>
                <p className="font-mono text-3xl font-black tracking-[0.18em] text-green-700 sm:text-4xl">
                  {order.pickup_code || t("common.pending")}
                </p>
              </div>

              <p className="mt-3 text-sm font-bold text-gray-600">
                {t("orders.showCode")}
              </p>

              <div className="mt-4 rounded-2xl bg-green-50 p-4 text-left">
                <p className="text-sm font-black leading-6 text-green-900">
                  {t("orders.activePickupReminder")}
                </p>
              </div>

              <div className="mt-4 rounded-2xl bg-white p-4 text-left shadow-sm">
                <p className="text-sm font-black text-gray-800">
                  {isCancellationAvailable
                    ? t("orders.cancelAvailable")
                    : t("orders.cancelUnavailable")}
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-600">
                  {t("orders.ratingBeforePickup")}
                </p>
              </div>
            </>
          ) : (
            <div className="mt-3 rounded-2xl bg-white px-5 py-5 font-bold text-gray-600 shadow-sm">
              {inactiveOrderMessage}
            </div>
          )}

          {isConfirmed && isCancellationAvailable && (
            <button
              onClick={() => onCancelOrder(order)}
              disabled={cancellingOrderId !== null}
              className="mt-5 min-h-12 w-full rounded-full bg-red-600 px-6 py-3 font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancellingOrderId === order.id
                ? "Cancelling..."
                : t("orders.cancelReservation")}
            </button>
          )}

          {isCollectedOrderStatus(displayStatus) && (
            <div className="mt-5 rounded-2xl bg-white p-4 text-left shadow-sm">
              {order.rated_at ? (
                <p className="text-center font-black text-green-700">
                  {t("orders.reviewThanks")}
                </p>
              ) : (
                <>
                  <p className="text-center text-base font-black text-green-800">
                    {t("orders.ratePickup")}
                  </p>
                  <p className="mt-1 text-center text-sm font-semibold text-gray-600">
                    {t("orders.ratingAvailable")}
                  </p>
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        aria-label={`Rate this pickup ${rating} out of 5`}
                        onClick={() => onRatingChange(order.id, rating)}
                        disabled={ratingOrderId !== null}
                        className={`min-h-10 rounded-full font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          selectedRating === rating
                            ? "bg-yellow-400 text-yellow-950"
                            : "bg-yellow-50 text-yellow-800 hover:bg-yellow-100"
                        }`}
                      >
                        ⭐ {rating}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={reviewText}
                    onChange={(event) =>
                      onReviewChange(order.id, event.target.value)
                    }
                    maxLength={500}
                    placeholder={t("orders.reviewPlaceholder")}
                    className="mt-3 min-h-24 w-full rounded-2xl border bg-white p-3 text-sm font-semibold text-gray-800 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                  />

                  <button
                    type="button"
                    onClick={() => onRateOrder(order)}
                    disabled={ratingOrderId !== null || !selectedRating}
                    className="mt-3 min-h-11 w-full rounded-full bg-green-700 px-5 py-2.5 font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {ratingOrderId === order.id
                      ? "Saving review..."
                      : t("orders.submitReview")}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
