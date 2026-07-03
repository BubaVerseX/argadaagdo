import type { Order } from "@/lib/types";

export const paymentStatuses = [
  "pending",
  "authorized",
  "paid",
  "failed",
  "refunded",
  "cancelled",
  "expired",
] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];

export const currentDatabasePaymentStatuses = [
  "pending",
  "authorized",
  "paid",
  "refunded",
  "failed",
  "cancelled",
  "expired",
] as const;

export const platformFeeRate = 0.1;

export const paymentProviderOptions = [
  {
    id: "bank_of_georgia",
    name: "Bank of Georgia",
    role: "Primary Georgian card payment provider for production checkout.",
  },
  {
    id: "tbc_bank",
    name: "TBC Bank",
    role: "Likely local card payment provider and bank integration option.",
  },
  {
    id: "stripe",
    name: "Stripe",
    role: "International card provider if available for the operating entity.",
  },
  {
    id: "paypal",
    name: "PayPal",
    role: "Optional wallet provider for international customers.",
  },
  {
    id: "apple_pay",
    name: "Apple Pay",
    role: "Future wallet method through a supported card provider.",
  },
  {
    id: "google_pay",
    name: "Google Pay",
    role: "Future wallet method through a supported card provider.",
  },
] as const;

export const adminPaymentPanelSections = [
  {
    title: "Payments",
    text: "Track paid reservations and provider references.",
  },
  {
    title: "Refunds",
    text: "Monitor cancellations, refunded orders and provider refund statuses.",
  },
  {
    title: "Revenue",
    text: "Review gross revenue, platform fees and business payout estimates.",
  },
  {
    title: "Failed payments",
    text: "Watch failed, cancelled or expired provider sessions.",
  },
  {
    title: "Pending payouts",
    text: "Review weekly payout estimates for completed pickups.",
  },
] as const;

export function toPaymentAmount(value: number | string | null | undefined) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function calculatePaymentSummary(orders: Order[]) {
  const activePaidOrders = orders.filter(
    (order) =>
      order.status === "reserved" ||
      order.status === "confirmed" ||
      order.status === "completed" ||
      order.status === "collected" ||
      order.status === "no_show"
  );
  const refundedOrders = orders.filter(
    (order) => order.status === "refunded" || order.status === "cancelled"
  );
  const completedOrders = orders.filter(
    (order) => order.status === "completed" || order.status === "collected"
  );

  return {
    activePaidCount: activePaidOrders.length,
    refundedCount: refundedOrders.length,
    completedCount: completedOrders.length,
    grossRevenue: activePaidOrders.reduce(
      (total, order) => total + toPaymentAmount(order.amount),
      0
    ),
    platformRevenue: activePaidOrders.reduce(
      (total, order) => total + toPaymentAmount(order.platform_fee),
      0
    ),
    businessPayout: activePaidOrders.reduce(
      (total, order) => total + toPaymentAmount(order.business_amount),
      0
    ),
    refundedAmount: refundedOrders.reduce(
      (total, order) => total + toPaymentAmount(order.amount),
      0
    ),
    pendingPayoutEstimate: completedOrders.reduce(
      (total, order) => total + toPaymentAmount(order.business_amount),
      0
    ),
  };
}
