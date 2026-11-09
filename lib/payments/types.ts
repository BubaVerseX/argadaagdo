export type PaymentProviderId = "tbc";

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
  /** Language of the bank page (the customer's app language). */
  language?: "ka" | "en";
  /** Native split: send `amount` straight to the business's payout account. */
  split?: {
    iban: string;
    amount: number;
  };
};

export type CreatePaymentSessionResult = {
  provider: PaymentProviderId;
  providerReference: string;
  redirectUrl: string;
  externalOrderId: string;
  /**
   * True when the bank sends the business share straight to the business
   * (TBC split). False: the full amount comes to us and the share is paid
   * out by hand every week (admin page, "Payouts").
   */
  splitApplied: boolean;
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
