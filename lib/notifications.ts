export const ARGADAAGDO_NOTIFICATION_EVENT = "argadaagdo:notification";

type NotificationMetadata = Record<
  string,
  string | number | boolean | null | undefined
>;

export type NotificationEvent =
  | "reservation_confirmed"
  | "order_cancelled"
  | "pickup_completed";

export type AppNotification = {
  event: NotificationEvent;
  title: string;
  message: string;
  createdAt: string;
  metadata?: NotificationMetadata;
};

type ReservationConfirmedInput = {
  offerId: number;
  offerTitle: string;
  businessName?: string | null;
  pickupStart?: string | null;
  pickupEnd?: string | null;
};

type OrderCancelledInput = {
  orderId: number;
  offerTitle?: string | null;
  businessName?: string | null;
};

type PickupCompletedInput = {
  orderId: number;
  offerTitle?: string | null;
  businessName?: string | null;
};

export function dispatchNotification(
  notification: Omit<AppNotification, "createdAt"> & { createdAt?: string }
) {
  const preparedNotification: AppNotification = {
    ...notification,
    createdAt: notification.createdAt || new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(ARGADAAGDO_NOTIFICATION_EVENT, {
        detail: preparedNotification,
      })
    );
  }

  if (process.env.NODE_ENV === "development") {
    console.info(
      "[ArGadaagdo notification placeholder]",
      preparedNotification
    );
  }

  return preparedNotification;
}

export function notifyReservationConfirmed({
  offerId,
  offerTitle,
  businessName,
  pickupStart,
  pickupEnd,
}: ReservationConfirmedInput) {
  return dispatchNotification({
    event: "reservation_confirmed",
    title: "Reservation confirmed",
    message: `${offerTitle} is reserved. Your pickup code is available in Orders.`,
    metadata: {
      offerId,
      offerTitle,
      businessName,
      pickupStart,
      pickupEnd,
    },
  });
}

export function notifyOrderCancelled({
  orderId,
  offerTitle,
  businessName,
}: OrderCancelledInput) {
  return dispatchNotification({
    event: "order_cancelled",
    title: "Order cancelled",
    message: offerTitle
      ? `${offerTitle} was cancelled successfully.`
      : "Your order was cancelled successfully.",
    metadata: {
      orderId,
      offerTitle,
      businessName,
    },
  });
}

export function notifyPickupCompleted({
  orderId,
  offerTitle,
  businessName,
}: PickupCompletedInput) {
  return dispatchNotification({
    event: "pickup_completed",
    title: "Pickup completed",
    message: offerTitle
      ? `${offerTitle} was marked as picked up.`
      : "The pickup was marked as completed.",
    metadata: {
      orderId,
      offerTitle,
      businessName,
    },
  });
}
