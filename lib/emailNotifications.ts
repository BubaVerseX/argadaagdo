export type EmailNotificationEvent =
  | "account_created"
  | "email_verified"
  | "business_approved"
  | "reservation_confirmed"
  | "reservation_cancelled"
  | "pickup_reminder"
  | "pickup_completed"
  | "new_rating_received";

export type EmailNotificationPlaceholder = {
  event: EmailNotificationEvent;
  title: string;
  recipient: "customer" | "business" | "admin";
  trigger: string;
  status: "placeholder";
  note: string;
};

export const emailNotificationPlaceholders: EmailNotificationPlaceholder[] = [
  {
    event: "account_created",
    title: "Account created",
    recipient: "customer",
    trigger: "After successful signup",
    status: "placeholder",
    note: "Supabase Auth handles verification email. Product welcome email can be added later.",
  },
  {
    event: "email_verified",
    title: "Email verified",
    recipient: "customer",
    trigger: "After confirmed email session",
    status: "placeholder",
    note: "No provider is connected yet, so the app should keep using in-app guidance.",
  },
  {
    event: "business_approved",
    title: "Business approved",
    recipient: "business",
    trigger: "Admin approves business",
    status: "placeholder",
    note: "Future email should tell the owner they can open the dashboard and publish offers.",
  },
  {
    event: "reservation_confirmed",
    title: "Reservation confirmed",
    recipient: "customer",
    trigger: "Reservation RPC succeeds",
    status: "placeholder",
    note: "Future email should include offer, pickup window, address and pickup code guidance.",
  },
  {
    event: "reservation_cancelled",
    title: "Reservation cancelled",
    recipient: "customer",
    trigger: "Cancellation RPC succeeds",
    status: "placeholder",
    note: "Future email should confirm cancellation/refund status for paid reservations.",
  },
  {
    event: "pickup_reminder",
    title: "Pickup reminder",
    recipient: "customer",
    trigger: "Before pickup window",
    status: "placeholder",
    note: "Future scheduled job can send this 2 hours before pickup.",
  },
  {
    event: "pickup_completed",
    title: "Pickup completed",
    recipient: "customer",
    trigger: "Business completes pickup",
    status: "placeholder",
    note: "Future email should thank the customer and invite a rating.",
  },
  {
    event: "new_rating_received",
    title: "New rating received",
    recipient: "business",
    trigger: "Customer submits rating",
    status: "placeholder",
    note: "Future email should notify the business that a new review is visible.",
  },
];

export function getEmailNotificationPlaceholders() {
  return emailNotificationPlaceholders;
}

export function createEmailNotificationPlaceholder(
  event: EmailNotificationEvent
) {
  const placeholder = emailNotificationPlaceholders.find(
    (item) => item.event === event
  );

  return {
    event,
    status: "placeholder" as const,
    message: placeholder
      ? `${placeholder.title} email is prepared as a future notification event.`
      : "Email notification placeholder is not configured yet.",
  };
}
