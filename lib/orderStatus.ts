import type { OrderStatus } from "@/lib/types";

export function isConfirmedOrderStatus(status: OrderStatus) {
  return status === "reserved" || status === "confirmed";
}

export function getOrderStatusLabel(status: OrderStatus) {
  if (isConfirmedOrderStatus(status)) return "Confirmed";
  if (status === "no_show") return "No-show";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function getOrderStatusClassName(status: OrderStatus) {
  if (status === "completed") return "bg-green-100 text-green-700";
  if (status === "refunded") return "bg-blue-100 text-blue-700";
  if (status === "cancelled" || status === "no_show") {
    return "bg-red-100 text-red-700";
  }
  return "bg-yellow-100 text-yellow-700";
}

export function getInactiveOrderMessage(status: OrderStatus) {
  if (status === "completed") return "Pickup completed";
  if (status === "refunded") return "Reservation refunded";
  if (status === "no_show") return "Marked as no-show";
  if (status === "cancelled") return "Reservation cancelled";
  return "Pickup code available";
}
