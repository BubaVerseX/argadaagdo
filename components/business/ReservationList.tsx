import { TimelineSteps } from "@/components/TimelineSteps";
import { Pagination } from "@/components/Pagination";
import { ClockIcon, ReceiptIcon } from "@/components/icons";
import { getBusinessTimelineSteps, type ReservationFilter } from "@/lib/business/dashboard";
import { getGreenBagLabel } from "@/lib/offerCategories";
import type { Language, TranslationKey } from "@/lib/i18n";
import {
  formatDisplayDateTime,
  formatMoney,
  formatPickupWindow,
  isLateHandoverOpen,
  isOrderPastPickupEnd,
} from "@/lib/offerLifecycle";
import {
  getOrderStatusClassName,
  getOrderStatusLabel,
  isConfirmedOrderStatus,
} from "@/lib/orderStatus";
import type { Order } from "@/lib/types";

// Display labels for profiles.reliability_status values (shown raw in English).
const georgianReliabilityLabels = new Map<string, string>([
  ["excellent", "შესანიშნავი"],
  ["good", "კარგი"],
  ["warning", "გაფრთხილება"],
  ["restricted", "შეზღუდული"],
]);

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
  const isGeorgian = language === "ka";
  const text = (ka: string, en: string) => (isGeorgian ? ka : en);
  // reservationSummary is [reserved, collected, cancelled, no-show].
  const counts: Partial<Record<ReservationFilter, number>> = {
    all: orders.length,
    reserved: reservationSummary[0]?.value,
    collected: reservationSummary[1]?.value,
    cancelled: reservationSummary[2]?.value,
    no_show: reservationSummary[3]?.value,
  };
  const filters: Array<{ value: ReservationFilter; label: string }> = [
    { value: "reserved", label: text("აქტიური", "Active") },
    { value: "collected", label: text("გაცემული", "Collected") },
    { value: "cancelled", label: text("გაუქმებული", "Cancelled") },
    { value: "no_show", label: text("არ მოვიდა", "No-show") },
    { value: "all", label: text("ყველა", "All") },
  ];

  return (
    <div id="reservations" className="mt-4 scroll-mt-24">
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive = reservationFilter === filter.value;

          return (
            <button
              key={filter.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onReservationFilterChange(filter.value)}
              className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive ? "action-pill" : "ui-card text-body hover:text-mint"
              }`}
            >
              {filter.label}
              {counts[filter.value] ? ` ${counts[filter.value]}` : ""}
            </button>
          );
        })}
      </div>

      {orders.length > 8 && (
        <input
          value={reservationSearch}
          onChange={(event) => onReservationSearchChange(event.target.value)}
          className="premium-input mt-3 w-full px-4 py-3 font-semibold"
          placeholder={text("ელფოსტით ძიება", "Search by email")}
          aria-label={text("ჯავშნების ძიება ელფოსტით", "Search reservations by email")}
        />
      )}

      <div className="mt-4 grid gap-3">
        {filteredOrders.length === 0 && (
          <p className="ui-card flex items-center gap-3 rounded-2xl p-4 font-semibold text-body">
            <ReceiptIcon className="h-5 w-5 shrink-0 text-mint" strokeWidth={1.6} />
            {normalizedReservationSearch
              ? text("ვერ მოიძებნა", "Nothing found")
              : reservationFilter === "reserved"
              ? text("ახლა არავინ ელოდება", "Nobody waiting")
              : text("აქ ჯერ არაფერია", "Nothing here yet")}
          </p>
        )}

        {filteredOrders.map((order) => {
          const timelineSteps = getBusinessTimelineSteps(order, language);
          const active = isConfirmedOrderStatus(order.status);
          const pastPickup = isOrderPastPickupEnd(order.offers);
          // Missed pickup: no refund, but the business may still hand it over.
          const lateHandover =
            (active && pastPickup) ||
            (order.status === "no_show" && isLateHandoverOpen(order.offers));

          return (
            <div key={order.id} className="ui-card rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold">
                    {order.offers?.title || t("common.offerUnavailable")}
                  </h3>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-body">
                    <ClockIcon className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.8} />
                    <span className="truncate">
                      {order.offers
                        ? formatPickupWindow(order.offers, language)
                        : t("orders.pickupUnavailable")}{" "}
                      · {formatMoney(order.amount || order.offers?.price || 0)} · #{order.id}
                    </span>
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getOrderStatusClassName(order.status)}`}
                >
                  {getOrderStatusLabel(order.status, language)}
                </span>
              </div>

              {(active || lateHandover) && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => onOpenPickupVerification(order)}
                    disabled={updatingOrderId !== null}
                    className={`${
                      lateHandover ? "premium-button-secondary" : "premium-button"
                    } min-h-11 w-full px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto`}
                  >
                    {updatingOrderId === order.id
                      ? text("სრულდება...", "Completing...")
                      : lateHandover
                      ? text("მაინც გაცემა კოდით", "Hand over late with code")
                      : text("კოდით გაცემა", "Hand over with code")}
                  </button>
                  {active && pastPickup && (
                    <button
                      type="button"
                      onClick={() => onMarkNoShow(order)}
                      disabled={updatingOrderId !== null}
                      className="min-h-11 w-full rounded-full bg-danger-soft px-5 py-2.5 font-semibold text-danger transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {text("არ მოვიდა", "Mark no-show")}
                    </button>
                  )}
                </div>
              )}
              {lateHandover && (
                <p className="mt-2 text-xs text-body">
                  {text(
                    "წაღების დრო დასრულდა: თანხა არ ბრუნდება. თუ მომხმარებელი მოვიდა, შეგიძლია მაინც გასცე 12 საათის განმავლობაში.",
                    "The pickup window has ended: no refund. If the customer turns up, you may still hand it over within 12 hours."
                  )}
                </p>
              )}

              <details className="group mt-2">
                <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-semibold text-mint [&::-webkit-details-marker]:hidden">
                  {text("დეტალები", "Details")}
                  <span aria-hidden="true" className="ml-1 transition group-open:rotate-180">⌄</span>
                </summary>
                <dl className="grid gap-1 rounded-2xl bg-well p-3 text-sm">
                  {[
                    {
                      label: text("ზომა", "Bag"),
                      value: order.offers ? getGreenBagLabel(order.offers, language) : "—",
                    },
                    {
                      label: text("მომხმარებელი", "Customer"),
                      value: order.profiles?.email || t("common.unavailable"),
                    },
                    {
                      label: text("საიმედოობა", "Reliability"),
                      value: `${order.profiles?.reliability_score ?? "—"} · ${
                        (isGeorgian && order.profiles?.reliability_status
                          ? georgianReliabilityLabels.get(order.profiles.reliability_status)
                          : undefined) ||
                        order.profiles?.reliability_status ||
                        "—"
                      }`,
                    },
                    {
                      label: text("შექმნილია", "Created"),
                      value: formatDisplayDateTime(order.created_at, language),
                    },
                    {
                      label: text("საკომისიო", "Platform fee"),
                      value: order.platform_fee ? formatMoney(order.platform_fee) : "—",
                    },
                    {
                      label: text("შენი თანხა", "Your amount"),
                      value: order.business_amount ? formatMoney(order.business_amount) : "—",
                    },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between gap-3">
                      <dt className="text-body">{row.label}</dt>
                      <dd className="min-w-0 truncate text-right font-semibold text-cream">{row.value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-2 rounded-2xl bg-well p-3">
                  <TimelineSteps
                    steps={timelineSteps}
                    columnsClassName="sm:grid-cols-5"
                    ariaLabel={text("ჯავშნის ეტაპები", "Reservation timeline")}
                  />
                </div>
              </details>
            </div>
          );
        })}
      </div>

      <Pagination
        className="mt-5"
        page={reservationPage}
        totalItems={filteredOrderCount}
        pageSize={reservationPageSize}
        label={t("businessDashboard.reservations")}
        onPageChange={onReservationPageChange}
      />
    </div>
  );
}
