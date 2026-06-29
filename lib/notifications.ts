export const ARGADAAGDO_NOTIFICATION_EVENT = "argadaagdo:notification";

type NotificationMetadata = Record<
  string,
  string | number | boolean | null | undefined
>;

export type NotificationEvent =
  | "business_registration_submitted"
  | "business_approved"
  | "offer_published"
  | "account_updated"
  | "profile_updated"
  | "reservation_confirmed"
  | "order_cancelled"
  | "pickup_reminder"
  | "pickup_completed"
  | "rating_submitted"
  | "new_rating_received";

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

type BusinessInput = {
  businessName: string;
};

type OfferInput = {
  offerId?: number;
  offerTitle: string;
  businessName?: string | null;
};

type RatingInput = {
  orderId: number;
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

export function notifyBusinessRegistrationSubmitted({
  businessName,
}: BusinessInput) {
  return dispatchNotification({
    event: "business_registration_submitted",
    title: "Business submitted",
    message: `${businessName} was submitted for admin approval.`,
    metadata: {
      businessName,
    },
  });
}

export function notifyBusinessApproved({ businessName }: BusinessInput) {
  return dispatchNotification({
    event: "business_approved",
    title: "Business approved",
    message: `${businessName} can now publish offers.`,
    metadata: {
      businessName,
    },
  });
}

export function notifyOfferPublished({
  offerId,
  offerTitle,
  businessName,
}: OfferInput) {
  return dispatchNotification({
    event: "offer_published",
    title: "Offer published",
    message: `${offerTitle} is now visible to customers.`,
    metadata: {
      offerId,
      offerTitle,
      businessName,
    },
  });
}

export function notifyProfileUpdated({ businessName }: BusinessInput) {
  return dispatchNotification({
    event: "profile_updated",
    title: "Profile updated",
    message: `${businessName} profile details were saved.`,
    metadata: {
      businessName,
    },
  });
}

export function notifyAccountUpdated() {
  return dispatchNotification({
    event: "account_updated",
    title: "Account updated",
    message: "Your account details were saved.",
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

export function notifyRatingSubmitted({
  orderId,
  businessName,
}: RatingInput) {
  return dispatchNotification({
    event: "rating_submitted",
    title: "Rating submitted",
    message: businessName
      ? `Thanks for rating ${businessName}.`
      : "Thanks for sharing your rating.",
    metadata: {
      orderId,
      businessName,
    },
  });
}
