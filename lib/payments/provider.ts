import {
  createBogPaymentSession,
  refundBogPayment,
  verifyBogPayment,
} from "@/lib/payments/bog";
import type {
  CreatePaymentSessionInput,
  PaymentProvider,
  PaymentProviderId,
} from "@/lib/payments/types";

const bogProvider: PaymentProvider = {
  id: "bog",
  createPaymentSession: createBogPaymentSession,
  verifyPayment: verifyBogPayment,
  refundPayment: refundBogPayment,
};

export function getPaymentProvider(
  provider: PaymentProviderId = "bog"
): PaymentProvider {
  if (provider === "bog") return bogProvider;

  throw new Error("Unsupported payment provider.");
}

export function normalizePaymentProvider(value: unknown): PaymentProviderId {
  if (value === "bog" || value === "bank_of_georgia") return "bog";
  return "bog";
}

export type { CreatePaymentSessionInput, PaymentProviderId };
