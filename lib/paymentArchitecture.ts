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
export const businessPayoutRate = 0.9;

export const paymentProviderPreparation = [
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

export const paymentArchitectureNotes = {
  currentFlow: [
    "Customer opens checkout for an active offer.",
    "Customer confirms the reservation rules.",
    "Frontend asks the server to create a Bank of Georgia checkout session.",
    "RPC creates a pending order and payment hold, then decreases inventory atomically.",
    "Verified provider callback marks the order reserved and creates the pickup code.",
  ],
  futureFlow: [
    "Additional providers can implement the same provider abstraction.",
    "TBC, Stripe or wallet methods can be added without changing order lifecycle rules.",
    "Webhook verification must remain server-side for every provider.",
  ],
  refundFlow: [
    "Customer cancels inside the allowed cancellation window.",
    "cancel_paid_order(p_order_id) validates ownership, status and deadline.",
    "Order becomes refunded, payment becomes refunded, and inventory is restored once.",
    "Future provider integration should trigger an actual refund before or alongside the database status update.",
  ],
  payoutFlow: [
    "Each paid order stores amount, platform_fee and business_amount.",
    "Platform fee target is 10%.",
    "Business payout target is 90%.",
    "Future payout jobs can group completed non-refunded orders into weekly payouts.",
  ],
} as const;

export const checkoutPaymentSteps = [
  {
    number: "1",
    title: "Reservation",
    text: "Review the offer, pickup time and cancellation rules.",
  },
  {
    number: "2",
    title: "Payment",
    text: "Payment provider integration is prepared for a future release.",
  },
  {
    number: "3",
    title: "Pickup",
    text: "After confirmation, use your pickup code during the pickup window.",
  },
] as const;

export const adminPaymentPanelSections = [
  {
    title: "Payments",
    text: "Track paid reservations and provider references after payment integration.",
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
    text: "Prepare weekly payout batches for completed pickups.",
  },
] as const;

export function toPaymentAmount(value: number | string | null | undefined) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function calculatePaymentPreparationSummary(orders: Order[]) {
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
