import { TimelineSteps } from "@/components/TimelineSteps";
import { Pagination } from "@/components/Pagination";
import { ClockIcon, ReceiptIcon } from "@/components/icons";
import { getBusinessTimelineSteps, type ReservationFilter } from "@/lib/business/dashboard";
import type { Language, TranslationKey } from "@/lib/i18n";
import {
  formatDisplayDateTime,
  formatMoney,
  formatPickupWindow,
  isOrderPastPickupEnd,
} from "@/lib/offerLifecycle";
import {
  getOrderStatusClassName,
  getOrderStatusLabel,
  isConfirmedOrderStatus,
} from "@/lib/orderStatus";
import type { Order } from "@/lib/types";

type ReservationSummaryItem = {
  label: string;
  value: number;
  className: string;
};

type ReservationListProps = {
  t: (key: TranslationKey) => string;
  language: Language;
  orders: Order[];
  filteredOrders: Order[];
  filteredOrderCount: number;
  reservationSummary: ReservationSummaryItem[];
  reservationFilter: ReservationFilter;
  reservationSearch: string;
  normalizedReservationSearch: string;
  updatingOrderId: number | null;
  reservationPage: number;
  reservationPageSize: number;
  onReservationSearchChange: (value: string) => void;
  onReservationFilterChange: (value: ReservationFilter) => void;
  onReservationPageChange: (page: number) => void;
  onOpenPickupVerification: (order: Order) => void;
  onMarkNoShow: (order: Order) => void;
};

export function ReservationList({
  t,
  language,
  orders,
  filteredOrders,
  filteredOrderCount,
  reservationSummary,
  reservationFilter,
  reservationSearch,
  normalizedReservationSearch,
  updatingOrderId,
  reservationPage,
  reservationPageSize,
  onReservationSearchChange,
  onReservationFilterChange,
  onReservationPageChange,
  onOpenPickupVerification,
  onMarkNoShow,
}: ReservationListProps) {
  return (
    <div
      id="reservations"
      className="premium-card mt-6 scroll-mt-24 rounded-3xl p-5 sm:mt-8 sm:rounded-[2rem] sm:p-8"
    >
      <p className="text-xs font-black uppercase tracking-widest text-[#a67c52] sm:text-sm">
        Pickup Operations
      </p>
      <h2 className="mt-2 text-2xl font-black sm:text-3xl">
        {t("businessDashboard.reservations")}
      </h2>

      <div className="premium-muted-card mt-5 rounded-2xl p-4 sm:p-5">
        <p className="text-sm font-black uppercase tracking-widest text-[#6b6152]">
          {t("businessOnboarding.reservationGuidanceTitle")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            t("businessOnboarding.reservationGuidanceText"),
            t("businessOnboarding.pickupStepAskCode"),
            t("businessOnboarding.pickupStepEnterCode"),
            t("businessOnboarding.pickupStepComplete"),
          ].map((step) => (
            <span
              key={step}
              className="soft-raised rounded-full px-4 py-2 text-sm font-black leading-6 text-[#2e2a22]"
            >
              {step}
            </span>
          ))}
        </div>
      </div>

      {orders.length > 0 && (
        <div className="mt-6 rounded-3xl bg-[#f4efe4] p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[#6b6152]">
                {t("businessDashboard.reservationSummary")}
              </p>
              <h3 className="mt-2 text-2xl font-black text-[#2e2a22]">
                {t("businessDashboard.totalReservationsMetric")}: {orders.length}
              </h3>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {reservationSummary.map((item) => (
              <div
                key={item.label}
                className={`rounded-2xl p-4 ${item.className}`}
              >
                <p className="text-sm font-black">{item.label}</p>
                <p className="mt-2 text-3xl font-black">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <input
          value={reservationSearch}
          onChange={(event) => onReservationSearchChange(event.target.value)}
          className="premium-input px-4 py-3 font-semibold"
          placeholder="Search customer email..."
          aria-label="Search reservations by customer email"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {[
          { value: "all", label: "All" },
          { value: "reserved", label: "Active" },
          { value: "collected", label: "Completed" },
          { value: "cancelled", label: "Cancelled" },
          { value: "no_show", label: "No-show" },
        ].map((filter) => {
          const isActive = reservationFilter === filter.value;

          return (
            <button
              key={filter.value}
              type="button"
              aria-pressed={isActive}
              onClick={() =>
                onReservationFilterChange(filter.value as ReservationFilter)
              }
              className={`min-h-11 rounded-full px-5 py-2.5 font-black transition ${
                isActive
                  ? "soft-pressed text-[#a67c52]"
                  : "soft-raised text-[#6b6152] hover:text-[#a67c52]"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4">
        {filteredOrders.length === 0 && (
          <div className="soft-raised rounded-3xl p-6 text-center sm:p-8">
            <div className="soft-pressed mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
              <ReceiptIcon className="h-6 w-6 text-[#a67c52]" strokeWidth={1.6} />
            </div>
            <h3 className="mt-4 text-2xl font-black text-[#2e2a22]">
              {orders.length === 0
                ? t("businessDashboard.noReservations")
                : normalizedReservationSearch
                ? "No reservations found"
                : reservationFilter === "reserved"
                ? "No active reservations"
                : t("businessDashboard.noFilteredReservations")}
            </h3>
            <p className="mx-auto mt-2 max-w-md font-semibold leading-7 text-[#6b6152]">
              {orders.length === 0
                ? t("businessDashboard.noReservationsHint")
                : normalizedReservationSearch
                ? "Try searching a different customer email."
                : reservationFilter === "reserved"
                ? "Completed, cancelled and no-show reservations are kept in history. Use the filters above to review them."
                : t("businessDashboard.noFilteredReservationsHint")}
            </p>
          </div>
        )}

        {filteredOrders.map((order) => {
          const timelineSteps = getBusinessTimelineSteps(order, language);

          return (
            <div
              key={order.id}
              className="soft-raised flex flex-col gap-5 rounded-3xl p-5 lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <h3 className="text-xl font-black sm:text-2xl">
                  {order.offers?.title || t("common.offerUnavailable")}
                </h3>

                <p className="mt-2 font-semibold text-[#6b6152]">
                  {t("businessDashboard.customer")}:{" "}
                  {order.profiles?.email || t("common.unavailable")}
                </p>

                <p className="mt-1 font-semibold text-[#6b6152]">
                  {t("businessDashboard.created")}:{" "}
                  {formatDisplayDateTime(order.created_at, language)}
                </p>

                <p className="mt-1 font-black text-[#a67c52]">
                  {order.offers
                    ? formatMoney(order.offers.price)
                    : t("common.unavailable")}
                </p>

                <div className="mt-3 grid gap-2 rounded-2xl bg-[#f4efe4] p-4 text-sm font-semibold text-[#6b6152] sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-[#6b6152]">
                      Business receipt
                    </p>
                    <p className="mt-1">Reservation ID: #{order.id}</p>
                    <p>
                      Gross:{" "}
                      {order.amount
                        ? formatMoney(order.amount)
                        : order.offers
                        ? formatMoney(order.offers.price)
                        : t("common.unavailable")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-[#6b6152]">
                      Payout estimate
                    </p>
                    <p>
                      Platform fee:{" "}
                      {order.platform_fee
                        ? formatMoney(order.platform_fee)
                        : t("common.unavailable")}
                    </p>
                    <p>
                      Business amount:{" "}
                      {order.business_amount
                        ? formatMoney(order.business_amount)
                        : t("common.unavailable")}
                    </p>
                  </div>
                </div>

                <p className="mt-1 flex items-center gap-1.5 font-semibold text-[#6b6152]">
                  <ClockIcon className="h-4 w-4 shrink-0 text-[#8a8072]" strokeWidth={1.8} />
                  {t("common.pickup")}:{" "}
                  {order.offers
                    ? formatPickupWindow(order.offers, language)
                    : t("orders.pickupUnavailable")}
                </p>

                <p className="mt-1 text-sm font-bold text-[#6b6152]">
                  {t("businessDashboard.reliability")}:{" "}
                  {order.profiles?.reliability_score ??
                    t("common.unavailable")}{" "}
                  ·{" "}
                  {order.profiles?.reliability_status ||
                    t("common.unavailable")}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-4 py-2 text-sm font-black ${getOrderStatusClassName(order.status)}`}
                  >
                    {getOrderStatusLabel(order.status, language)}
                  </span>

                  {isConfirmedOrderStatus(order.status) && (
                    <span className="rounded-full bg-[#f4efe4] px-4 py-2 text-sm font-black text-[#6b6152]">
                      Pickup code:{" "}
                      {order.pickup_code
                        ? `••••${String(order.pickup_code).slice(-2)}`
                        : "pending"}
                    </span>
                  )}
                </div>

                {isConfirmedOrderStatus(order.status) && (
                  <p className="mt-3 rounded-2xl bg-[#f4efe4] px-4 py-3 text-sm font-bold leading-6 text-[#6b6152]">
                    Ask the customer for the full code, then use Verify &
                    Complete Pickup.
                  </p>
                )}

                <div className="mt-4 rounded-3xl bg-[#f4efe4] p-4">
                  <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#6b6152]">
                    Reservation timeline
                  </p>
                  <TimelineSteps
                    steps={timelineSteps}
                    columnsClassName="sm:grid-cols-5"
                    ariaLabel="Reservation timeline"
                  />
                </div>
              </div>

              {isConfirmedOrderStatus(order.status) && (
                <div className="flex flex-col gap-3 lg:flex-row">
                  {isOrderPastPickupEnd(order.offers) && (
                    <button
                      onClick={() => onMarkNoShow(order)}
                      disabled={updatingOrderId !== null}
                      className="min-h-12 w-full rounded-full bg-red-50 px-5 py-3 font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
                    >
                      {updatingOrderId === order.id
                        ? "Updating..."
                        : "Mark No-Show"}
                    </button>
                  )}

                  {!isOrderPastPickupEnd(order.offers) && (
                    <button
                      onClick={() => onOpenPickupVerification(order)}
                      disabled={updatingOrderId !== null}
                      className="premium-button w-full px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
                    >
                      {updatingOrderId === order.id
                        ? "Completing..."
                        : "Verify & Complete Pickup"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Pagination
        className="mt-5"
        page={reservationPage}
        totalItems={filteredOrderCount}
        pageSize={reservationPageSize}
        label="Reservations"
        onPageChange={onReservationPageChange}
      />
    </div>
  );
}
