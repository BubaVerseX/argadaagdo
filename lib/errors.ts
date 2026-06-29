import { logger } from "@/lib/logger";

export type FormattedAppError = {
  userMessage: string;
  developerMessage: string;
  code?: string;
};

const fallbackUserMessage =
  "Something went wrong. Please try again in a moment.";

function getErrorText(error: unknown) {
  if (error instanceof Error) return error.message;

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  if (typeof error === "string") return error;

  return "Unknown error";
}

function getErrorCode(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return undefined;
}

export function getUserErrorMessage(
  error: unknown,
  fallback = fallbackUserMessage
) {
  const message = getErrorText(error).toLowerCase();

  if (message.includes("row-level security") || message.includes("permission")) {
    return "This action is not allowed for your account. Please sign in again or contact support.";
  }

  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("failed to fetch") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("abort")
  ) {
    return "Network problem. Please check your connection and try again.";
  }

  if (
    message.includes("supabase") ||
    message.includes("database") ||
    message.includes("temporarily unavailable")
  ) {
    return "Marketplace data is temporarily unavailable. Please try again in a moment.";
  }

  if (
    message.includes("storage") ||
    message.includes("bucket") ||
    message.includes("object")
  ) {
    return "Image storage is temporarily unavailable. Please try again with the image in a moment.";
  }

  if (message.includes("sold out") || message.includes("quantity")) {
    return "This offer is no longer available.";
  }

  if (message.includes("pickup code")) {
    return "Pickup code could not be verified. Please check the code and try again.";
  }

  if (message.includes("deadline") || message.includes("2 hours")) {
    return "Cancellation window has closed for this reservation.";
  }

  if (message.includes("active reservations") || message.includes("max")) {
    return "You already have 3 active reservations. Complete or cancel one before reserving another.";
  }

  if (message.includes("invalid login") || message.includes("invalid credentials")) {
    return "Email or password is incorrect.";
  }

  if (message.includes("duplicate") || message.includes("unique")) {
    return "This item already exists. Please refresh and try again.";
  }

  return fallback;
}

export function formatAppError(
  error: unknown,
  fallback = fallbackUserMessage
): FormattedAppError {
  return {
    userMessage: getUserErrorMessage(error, fallback),
    developerMessage: getErrorText(error),
    code: getErrorCode(error),
  };
}

export function logAppError(
  message: string,
  error: unknown,
  context?: Record<string, unknown>
) {
  const formattedError = formatAppError(error);
  logger.error(message, {
    ...context,
    error: formattedError.developerMessage,
    code: formattedError.code,
  });

  return formattedError;
}
