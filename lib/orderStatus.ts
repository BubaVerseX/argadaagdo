import {
  getTbilisiDateKeyFromValue,
  isOrderPastPickupEnd,
} from "@/lib/offerLifecycle";
import type { Order, OrderStatus } from "@/lib/types";
import type { Language } from "@/lib/i18n";

export function isConfirmedOrderStatus(status: OrderStatus) {
  return status === "reserved" || status === "confirmed";
}

export function isCollectedOrderStatus(status: OrderStatus) {
  return status === "collected" || status === "completed";
}

export function isCancelledOrderStatus(status: OrderStatus) {
  return (
    status === "cancelled" || status === "refunded" || status === "no_show"
  );
}

export function isExpiredOrderStatus(status: OrderStatus) {
  return status === "expired";
}

export function getEffectiveOrderStatus(order: Order): OrderStatus {
  if (
    isConfirmedOrderStatus(order.status) &&
    isOrderPastPickupEnd(
      order.offers,
      getTbilisiDateKeyFromValue(order.created_at)
    )
  ) {
    return "expired";
  }

  return order.status;
}

export function getOrderStatusLabel(status: OrderStatus, language: Language = "en") {
  if (isConfirmedOrderStatus(status)) {
    return language === "ka" ? "დაჯავშნილი" : "Reserved";
  }
  if (isCollectedOrderStatus(status)) {
    return language === "ka" ? "წაღებული" : "Collected";
  }
  if (isExpiredOrderStatus(status)) {
    return language === "ka" ? "ვადაგასული" : "Expired";
  }
  if (status === "no_show") {
    return language === "ka" ? "არ გამოცხადდა" : "No show";
  }
  if (isCancelledOrderStatus(status)) {
    return language === "ka" ? "გაუქმებული" : "Cancelled";
  }
  return language === "ka" ? "უცნობი" : "Unknown";
}

export function getOrderStatusClassName(status: OrderStatus) {
  if (isCollectedOrderStatus(status)) return "bg-green-100 text-green-700";
  if (isExpiredOrderStatus(status)) return "bg-gray-100 text-gray-700";
  if (isCancelledOrderStatus(status)) return "bg-red-100 text-red-700";
  return "bg-yellow-100 text-yellow-700";
}

export function getInactiveOrderMessage(status: OrderStatus, language: Language = "en") {
  if (isCollectedOrderStatus(status)) {
    return language === "ka" ? "ჯავშანი წაღებულია" : "Reservation collected";
  }
  if (isCancelledOrderStatus(status)) {
    return language === "ka" ? "ჯავშანი გაუქმებულია" : "Reservation cancelled";
  }
  if (isExpiredOrderStatus(status)) {
    return language === "ka" ? "ჯავშანი ვადაგასულია" : "Reservation expired";
  }
  return language === "ka" ? "წაღების კოდი ხელმისაწვდომია" : "Pickup code available";
}
