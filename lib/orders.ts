import type { Language } from "@/lib/i18n";
import { getUserErrorMessage } from "@/lib/errors";
import {
  getEffectiveOrderStatus,
  isCancelledOrderStatus,
  isCollectedOrderStatus,
  isFailedCheckoutOrder,
  isPendingPaymentOrderStatus,
} from "@/lib/orderStatus";
import type { Order } from "@/lib/types";
import type { TimelineStep } from "@/components/TimelineSteps";

function normalizeTime(value: string | null | undefined) {
  return value ? value.slice(0, 5) : "";
}

export function getCancellationErrorMessage(message?: string) {
  const normalizedMessage = (message || "").toLowerCase();

  if (normalizedMessage.includes("cancellation window has closed")) {
    return "Cancellation deadline has passed. You can cancel only up to 2 hours before pickup.";
  }

  if (normalizedMessage.includes("only reserved orders")) {
    return "Only confirmed reservations can be cancelled.";
  }

  if (normalizedMessage.includes("order not found")) {
    return "This order could not be found or no longer belongs to your account.";
  }

  return getUserErrorMessage(
    message,
    "Order could not be cancelled. Please try again."
  );
}

export function getLoginRedirectUrl(path: string) {
  return `/login?redirect=${encodeURIComponent(path)}`;
}

function getTbilisiDateTimeKey(date = new Date()) {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tbilisi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const timeParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tbilisi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const year = dateParts.find((part) => part.type === "year")?.value || "1970";
  const month = dateParts.find((part) => part.type === "month")?.value || "01";
  const day = dateParts.find((part) => part.type === "day")?.value || "01";
  const hour = timeParts.find((part) => part.type === "hour")?.value || "00";
  const minute = timeParts.find((part) => part.type === "minute")?.value || "00";

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function getCancellationDeadlineKey(order: Order) {
  const offer = order.offers;
  if (!offer?.pickup_date || !offer.pickup_start) return null;

  const pickupDate = new Date(
    `${offer.pickup_date}T${normalizeTime(offer.pickup_start)}:00+04:00`
  );

  if (Number.isNaN(pickupDate.getTime())) return null;

  pickupDate.setHours(pickupDate.getHours() - 2);
  return getTbilisiDateTimeKey(pickupDate);
}

export function canShowCancellationAvailable(order: Order) {
  const deadline = getCancellationDeadlineKey(order);
  if (!deadline) return true;
  return getTbilisiDateTimeKey() <= deadline;
}

export function getPickupDateTime(
  order: Order,
  field: "pickup_start" | "pickup_end"
) {
  const offer = order.offers;
  const timeValue = offer?.[field];

  if (!offer?.pickup_date || !timeValue) return null;

  const pickupDate = new Date(
    `${offer.pickup_date}T${normalizeTime(timeValue)}:00+04:00`
  );

  return Number.isNaN(pickupDate.getTime()) ? null : pickupDate;
}

export function isPickupWindowOpen(order: Order) {
  const pickupStart = getPickupDateTime(order, "pickup_start");
  const pickupEnd = getPickupDateTime(order, "pickup_end");

  if (!pickupStart || !pickupEnd) return false;

  const now = new Date();
  return now >= pickupStart && now <= pickupEnd;
}

// The in-app "Collected" slider is offered from one hour before the pickup
// window until it ends (mirrors collect_my_order in the database). After the
// window only the business can still hand the box over, with the code.
export function isCollectWindowOpen(order: Order) {
  const pickupStart = getPickupDateTime(order, "pickup_start");
  const pickupEnd = getPickupDateTime(order, "pickup_end");

  if (!pickupStart || !pickupEnd) return false;

  const now = Date.now();
  return now >= pickupStart.getTime() - 60 * 60 * 1000 && now <= pickupEnd.getTime();
}

/** Free cancellation ends 2 h before pickup starts (begin_customer_refund). */
export function getCancellationDeadline(offer: {
  pickup_date?: string | null;
  pickup_start?: string | null;
} | null | undefined) {
  if (!offer?.pickup_date || !offer.pickup_start) return null;
  const start = new Date(`${offer.pickup_date}T${normalizeTime(offer.pickup_start)}:00+04:00`);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() - 2 * 60 * 60 * 1000);
}

/** Whether a box reserved now could still be cancelled (deadline in the future). */
export function isCancellationOpen(deadline: Date | null) {
  return deadline ? deadline.getTime() > Date.now() : true;
}

export function getCustomerTimelineSteps(
  order: Order,
  language: Language
): TimelineStep[] {
  const displayStatus = getEffectiveOrderStatus(order);
  const isPendingPayment = isPendingPaymentOrderStatus(displayStatus);
  const isCollected = isCollectedOrderStatus(displayStatus);
  const isStopped =
    isCancelledOrderStatus(displayStatus) || displayStatus === "expired";
  const readyForPickup = isPickupWindowOpen(order);
  const rated = Boolean(order.rated_at);
  const labels =
    language === "ka"
      ? [
          "გადახდა",
          "დაჯავშნილი",
          "წასაღებად მზად",
          "წაღებული",
          "შეფასებული",
        ]
      : ["Payment", "Reserved", "Ready for pickup", "Collected", "Rated"];

  if (isPendingPayment) {
    return labels.map((label, index) => ({
      label,
      state: index === 0 ? "current" : "pending",
    }));
  }

  // Cancelled before payment went through (abandoned, failed or expired
  // checkout): it never got past the payment step.
  if (isStopped && isFailedCheckoutOrder(order)) {
    return labels.map((label, index) => ({
      label,
      state: index === 0 ? "stopped" : "pending",
    }));
  }

  if (isStopped) {
    return labels.map((label, index) => ({
      label,
      state:
        index <= 1 ? "done" : index === 2 ? "stopped" : "pending",
    }));
  }

  const currentIndex = rated ? 4 : isCollected ? 3 : readyForPickup ? 2 : 1;

  return labels.map((label, index) => ({
    label,
    state:
      index < currentIndex
        ? "done"
        : index === currentIndex
        ? "current"
        : "pending",
  }));
}
