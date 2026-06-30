export type PaymentProviderId = "bog";

export type ProviderPaymentStatus =
  | "pending"
  | "authorized"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired"
  | "refunded";

export type CreatePaymentSessionInput = {
  paymentId: number;
  orderId: number;
  offerId: number;
  offerTitle: string;
  businessName: string;
  amount: number;
  currency: "GEL";
  externalOrderId: string;
};

export type CreatePaymentSessionResult = {
  provider: PaymentProviderId;
  providerReference: string;
  redirectUrl: string;
  externalOrderId: string;
};

export type VerifiedProviderPayment = {
  provider: PaymentProviderId;
  providerReference: string;
  externalOrderId: string;
  status: ProviderPaymentStatus;
  amount: number | null;
  currency: string | null;
  raw: unknown;
};

export type PaymentProvider = {
  id: PaymentProviderId;
  createPaymentSession(
    input: CreatePaymentSessionInput
  ): Promise<CreatePaymentSessionResult>;
  verifyPayment(providerReference: string): Promise<VerifiedProviderPayment>;
  refundPayment(input: {
    providerReference: string;
    amount: number;
    currency: "GEL";
  }): Promise<VerifiedProviderPayment>;
};
