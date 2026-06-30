import type { Language } from "@/lib/i18n";
import { getUserErrorMessage } from "@/lib/errors";
import {
  getEffectiveOrderStatus,
  isCancelledOrderStatus,
  isCollectedOrderStatus,
  isConfirmedOrderStatus,
  isPendingPaymentOrderStatus,
} from "@/lib/orderStatus";
import type { Order, OrderStatus } from "@/lib/types";
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

export function getPickupReminderMessage(order: Order, language: Language) {
  if (!isConfirmedOrderStatus(getEffectiveOrderStatus(order))) return "";

  const pickupStart = getPickupDateTime(order, "pickup_start");
  const pickupEnd = getPickupDateTime(order, "pickup_end");

  if (!pickupStart || !pickupEnd) return "";

  const now = new Date();

  if (now >= pickupStart && now <= pickupEnd) {
    return language === "ka"
      ? "წაღების დრო ახლა აქტიურია. არ დაგავიწყდეს კოდის ჩვენება."
      : "Pickup is open now. Do not forget your pickup code.";
  }

  const minutesUntilPickup = Math.ceil(
    (pickupStart.getTime() - now.getTime()) / 60000
  );

  if (minutesUntilPickup < 0 || minutesUntilPickup > 120) return "";

  if (minutesUntilPickup <= 60) {
    return language === "ka"
      ? `წაღება იწყება ${minutesUntilPickup} წუთში. არ დაგავიწყდეს კოდი.`
      : `Pickup starts in ${minutesUntilPickup} minutes. Do not forget your pickup code.`;
  }

  const hoursUntilPickup = Math.ceil(minutesUntilPickup / 60);

  return language === "ka"
    ? `წაღება იწყება ${hoursUntilPickup} საათში. არ დაგავიწყდეს კოდი.`
    : `Pickup starts in ${hoursUntilPickup} hours. Do not forget your pickup code.`;
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

export function getCustomerStatusLabel(
  status: OrderStatus,
  language: Language
) {
  if (isPendingPaymentOrderStatus(status)) {
    return language === "ka" ? "გადახდა მუშავდება" : "Payment pending";
  }
  if (isConfirmedOrderStatus(status)) {
    return language === "ka" ? "წაღების მოლოდინში" : "Waiting for pickup";
  }
  if (isCollectedOrderStatus(status)) {
    return language === "ka" ? "წაღებულია" : "Collected";
  }
  if (status === "no_show") {
    return language === "ka" ? "წაღება გამოტოვებულია" : "Missed Pickup";
  }
  if (status === "expired") {
    return language === "ka" ? "ვადაგასულია" : "Expired";
  }
  if (isCancelledOrderStatus(status)) {
    return language === "ka" ? "გაუქმებულია" : "Cancelled";
  }
  return language === "ka" ? "უცნობი" : "Unknown";
}
