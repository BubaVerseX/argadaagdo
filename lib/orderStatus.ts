import type { OrderStatus } from "@/lib/types";

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

export function getOrderStatusLabel(status: OrderStatus) {
  if (isConfirmedOrderStatus(status)) return "Reserved";
  if (isCollectedOrderStatus(status)) return "Collected";
  if (isCancelledOrderStatus(status)) return "Cancelled";
  return "Unknown";
}

export function getOrderStatusClassName(status: OrderStatus) {
  if (isCollectedOrderStatus(status)) return "bg-green-100 text-green-700";
  if (isCancelledOrderStatus(status)) return "bg-red-100 text-red-700";
  return "bg-yellow-100 text-yellow-700";
}

export function getInactiveOrderMessage(status: OrderStatus) {
  if (isCollectedOrderStatus(status)) return "Reservation collected";
  if (isCancelledOrderStatus(status)) return "Reservation cancelled";
  return "Pickup code available";
}
