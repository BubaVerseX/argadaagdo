import type { TimelineStep } from "@/components/TimelineSteps";
import type { Language } from "@/lib/i18n";
import {
  isCancelledOrderStatus,
  isCollectedOrderStatus,
  isConfirmedOrderStatus,
} from "@/lib/orderStatus";
import type { Business, Order } from "@/lib/types";

export type ReservationFilter =
  | "all"
  | "reserved"
  | "collected"
  | "cancelled"
  | "no_show";

export type MetricTone = "neutral" | "green" | "yellow";

export const actionCooldownMs = 2500;
export const allowedImageTypes = ["image/png", "image/jpeg", "image/webp"];
export const maxImageSizeBytes = 5 * 1024 * 1024;

export const metricToneStyles: Record<
  MetricTone,
  { card: string; label: string; value: string }
> = {
  neutral: {
    card: "bg-gray-50 text-gray-950",
    label: "text-gray-600",
    value: "text-gray-950",
  },
  green: {
    card: "bg-green-50 text-green-950",
    label: "text-green-700",
    value: "text-green-800",
  },
  yellow: {
    card: "bg-yellow-50 text-yellow-950",
    label: "text-yellow-800",
    value: "text-yellow-800",
  },
};

export function createImageFileName(file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `${crypto.randomUUID()}-${safeName}`;
}

export function isApprovedBusiness(business: Business) {
  return business.approved === true || String(business.approved) === "true";
}

export function getImageValidationError(file: File) {
  if (file.size > maxImageSizeBytes) {
    return "Image is too large. Please upload a file under 5MB.";
  }
  if (!allowedImageTypes.includes(file.type)) {
    return "Invalid image type. Please use JPG, PNG, or WebP.";
  }
  return "";
}

export function getBusinessTimelineSteps(
  order: Order,
  language: Language
): TimelineStep[] {
  const labels =
    language === "ka"
      ? [
          "დაჯავშნილი",
          "წაღების მოლოდინი",
          "დასრულებული",
          "გაუქმებული",
          "არ გამოცხადდა",
        ]
      : ["Reserved", "Waiting for pickup", "Completed", "Cancelled", "No-show"];
  const status = order.status;

  if (status === "no_show") {
    return labels.map((label, index) => ({
      label,
      state: index < 2 ? "done" : index === 4 ? "stopped" : "pending",
    }));
  }

  if (isCancelledOrderStatus(status)) {
    return labels.map((label, index) => ({
      label,
      state: index === 0 ? "done" : index === 3 ? "stopped" : "pending",
    }));
  }

  if (isCollectedOrderStatus(status)) {
    return labels.map((label, index) => ({
      label,
      state: index < 2 ? "done" : index === 2 ? "current" : "pending",
    }));
  }

  const waitingForPickup = isConfirmedOrderStatus(status);

  return labels.map((label, index) => ({
    label,
    state:
      index === 0
        ? "done"
        : index === 1 && waitingForPickup
        ? "current"
        : "pending",
  }));
}
