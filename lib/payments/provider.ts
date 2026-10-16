import {
  createTbcPaymentSession,
  refundTbcPayment,
  verifyTbcPayment,
} from "@/lib/payments/tbc";
import type {
  CreatePaymentSessionInput,
  PaymentProvider,
  PaymentProviderId,
} from "@/lib/payments/types";

const tbcProvider: PaymentProvider = {
  id: "tbc",
  createPaymentSession: createTbcPaymentSession,
  verifyPayment: verifyTbcPayment,
  refundPayment: refundTbcPayment,
};

export function getPaymentProvider(
  provider: PaymentProviderId = "tbc"
): PaymentProvider {
  if (provider === "tbc") return tbcProvider;

  throw new Error("Unsupported payment provider.");
}

export function normalizePaymentProvider(value: unknown): PaymentProviderId {
  void value;
  return "tbc";
}

export type { CreatePaymentSessionInput, PaymentProviderId };
