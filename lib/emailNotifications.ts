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
    trigger: "When you create an account or ask for a new confirmation link",
    status: "provider",
    note: "Contains the link that confirms your email address.",
  },
  {
    event: "password_reset",
    title: "Password reset",
    recipient: "customer",
    trigger: "When you choose “Forgot password?” on the sign-in page",
    status: "provider",
    note: "Contains a secure link to set a new password.",
  },
  {
    event: "business_approved",
    title: "Business approved",
    recipient: "business",
    trigger: "When our team approves a business application",
    status: "app",
    note: "Lets the owner know they can start publishing offers.",
  },
  {
    event: "reservation_confirmed",
    title: "Reservation confirmed",
    recipient: "customer",
    trigger: "When your payment is confirmed",
    status: "app",
    note: "Includes your reservation details. Your pickup code is in Orders.",
  },
  {
    event: "reservation_cancelled",
    title: "Reservation cancelled",
    recipient: "customer",
    trigger: "When you cancel a reservation before the deadline",
    status: "app",
    note: "Confirms the cancellation and the refund.",
  },
  {
    event: "pickup_reminder",
    title: "Pickup reminder",
    recipient: "customer",
    trigger: "On the morning of your pickup day",
    status: "cron",
    note: "Reminds you of the pickup time and place.",
  },
  {
    event: "pickup_completed",
    title: "Pickup completed",
    recipient: "customer",
    trigger: "When the business confirms your pickup",
    status: "app",
    note: "Confirms that you collected your order.",
  },
  {
    event: "rating_reminder",
    title: "Rating reminder",
    recipient: "customer",
    trigger: "After your pickup",
    status: "app",
    note: "Invites you to rate the business.",
  },
];

export function getEmailNotificationPlaceholders() {
  return emailNotificationPlaceholders;
}
