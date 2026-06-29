export type PaymentStatus =
  | "pending"
  | "authorized"
  | "paid"
  | "failed"
  | "refunded"
  | "cancelled"
  | "expired";

export type Payment = {
  id: number;
  order_id: number;
  user_id: string;
  offer_id: number;
  amount: number | string;
  platform_fee: number | string;
  business_amount: number | string;
  status: PaymentStatus;
  provider: string;
  provider_reference: string | null;
  created_at: string | null;
  refunded_at?: string | null;
};
