export type EmailNotificationEvent =
  | "account_verification"
  | "password_reset"
  | "business_approved"
  | "reservation_confirmed"
  | "reservation_cancelled"
  | "pickup_reminder"
  | "pickup_completed"
  | "rating_reminder"
  | "new_rating_received";

export type EmailNotificationPlaceholder = {
  event: EmailNotificationEvent;
  title: string;
  recipient: "customer" | "business" | "admin";
  trigger: string;
  status: "provider" | "app" | "cron";
  note: string;
};

export const emailNotificationPlaceholders: EmailNotificationPlaceholder[] = [
  {
    event: "account_verification",
    title: "Account verification",
    recipient: "customer",
    trigger: "Supabase Auth signup and resend verification",
    status: "provider",
    note: "Delivered by Supabase Auth through the configured Resend SMTP provider.",
  },
  {
    event: "password_reset",
    title: "Password reset",
    recipient: "customer",
    trigger: "Supabase Auth password reset request",
    status: "provider",
    note: "Delivered by Supabase Auth through the configured Resend SMTP provider.",
  },
  {
    event: "business_approved",
    title: "Business approved",
    recipient: "business",
    trigger: "Admin approves business",
    status: "app",
    note: "Sent by the app through Resend after admin approval succeeds.",
  },
  {
    event: "reservation_confirmed",
    title: "Reservation confirmed",
    recipient: "customer",
    trigger: "Verified payment finalizes the order",
    status: "app",
    note: "Sent by the app through Resend after the order becomes reserved.",
  },
  {
    event: "reservation_cancelled",
    title: "Reservation cancelled",
    recipient: "customer",
    trigger: "Cancellation RPC succeeds",
    status: "app",
    note: "Sent by the app through Resend after cancellation/refund succeeds.",
  },
  {
    event: "pickup_reminder",
    title: "Pickup reminder",
    recipient: "customer",
    trigger: "Daily protected pickup-reminder cron",
    status: "cron",
    note: "Sent by the app through Resend for same-day reservations nearing pickup.",
  },
  {
    event: "pickup_completed",
    title: "Pickup completed",
    recipient: "customer",
    trigger: "Business completes pickup",
    status: "app",
    note: "Sent by the app through Resend after complete_pickup succeeds.",
  },
  {
    event: "rating_reminder",
    title: "Rating reminder",
    recipient: "customer",
    trigger: "Business completes pickup",
    status: "app",
    note: "Sent by the app through Resend after pickup completion.",
  },
];

export function getEmailNotificationPlaceholders() {
  return emailNotificationPlaceholders;
}
