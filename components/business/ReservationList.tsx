import { TimelineSteps } from "@/components/TimelineSteps";
import { Pagination } from "@/components/Pagination";
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
      className="mt-6 scroll-mt-24 rounded-3xl bg-white p-5 shadow-sm sm:mt-8 sm:rounded-[2rem] sm:p-8"
    >
      <p className="text-xs font-black uppercase tracking-widest text-green-700 sm:text-sm">
        Pickup Operations
      </p>
      <h2 className="mt-2 text-2xl font-black sm:text-3xl">
        {t("businessDashboard.reservations")}
      </h2>

      <div className="mt-5 rounded-2xl bg-green-50 p-4 sm:p-5">
        <p className="text-sm font-black uppercase tracking-widest text-green-700">
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
              className="rounded-full bg-white px-4 py-2 text-sm font-black leading-6 text-green-900"
            >
              ✓ {step}
            </span>
          ))}
        </div>
      </div>

      {orders.length > 0 && (
        <div className="mt-6 rounded-3xl border border-green-100 bg-green-50/60 p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-green-700">
                {t("businessDashboard.reservationSummary")}
              </p>
              <h3 className="mt-2 text-2xl font-black text-gray-950">
                {t("businessDashboard.totalReservationsMetric")}: {orders.length}
              </h3>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {reservationSummary.map((item) => (
              <div
                key={item.label}
                className={`rounded-2xl p-4 shadow-sm ${item.className}`}
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
          className="min-h-12 rounded-2xl border bg-white px-4 py-3 font-semibold text-gray-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
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
                  ? "bg-green-700 text-white"
                  : "bg-green-50 text-green-800 hover:bg-green-100"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4">
        {filteredOrders.length === 0 && (
          <div className="rounded-3xl border border-dashed border-green-200 bg-green-50/60 p-6 text-center sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl">
              ✓
            </div>
            <h3 className="mt-4 text-2xl font-black text-gray-950">
              {orders.length === 0
                ? t("businessDashboard.noReservations")
                : normalizedReservationSearch
                ? "No reservations found"
                : reservationFilter === "reserved"
                ? "No active reservations"
                : t("businessDashboard.noFilteredReservations")}
            </h3>
            <p className="mx-auto mt-2 max-w-md font-semibold leading-7 text-gray-700">
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
              className="flex flex-col gap-5 rounded-2xl border p-5 lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <h3 className="text-xl font-black sm:text-2xl">
                  {order.offers?.title || t("common.offerUnavailable")}
                </h3>

                <p className="mt-2 font-semibold text-gray-700">
                  {t("businessDashboard.customer")}:{" "}
                  {order.profiles?.email || t("common.unavailable")}
                </p>

                <p className="mt-1 font-semibold text-gray-600">
                  {t("businessDashboard.created")}:{" "}
                  {formatDisplayDateTime(order.created_at, language)}
                </p>

                <p className="mt-1 font-black text-green-700">
                  {order.offers
                    ? formatMoney(order.offers.price)
                    : t("common.unavailable")}
                </p>

                <div className="mt-3 grid gap-2 rounded-2xl bg-[#F7F6EF] p-4 text-sm font-semibold text-gray-700 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-gray-500">
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
                    <p className="text-xs font-black uppercase tracking-wide text-gray-500">
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

                <p className="mt-1 font-semibold text-gray-600">
                  {t("common.pickup")}:{" "}
                  {order.offers
                    ? formatPickupWindow(order.offers, language)
                    : t("orders.pickupUnavailable")}
                </p>

                <p className="mt-1 text-sm font-bold text-gray-500">
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
                    <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-black text-gray-700">
                      Pickup code:{" "}
                      {order.pickup_code
                        ? `••••${String(order.pickup_code).slice(-2)}`
                        : "pending"}
                    </span>
                  )}
                </div>

                {isConfirmedOrderStatus(order.status) && (
                  <p className="mt-3 rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold leading-6 text-green-900">
                    Ask the customer for the full code, then use Verify &
                    Complete Pickup.
                  </p>
                )}

                <div className="mt-4 rounded-3xl border border-green-100 bg-[#F7F6EF] p-4">
                  <p className="mb-3 text-sm font-black uppercase tracking-widest text-green-700">
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
                      className="min-h-12 w-full rounded-full bg-red-600 px-5 py-3 font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
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
                      className="min-h-12 w-full rounded-full bg-green-700 px-5 py-3 font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
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
