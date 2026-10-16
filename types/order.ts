import type { Business } from "@/types/business";
import type { Offer } from "@/types/offer";
import type { Profile } from "@/types/profile";

export type OrderStatus =
  | "pending_payment"
  | "reserved"
  | "confirmed"
  | "collected"
  | "completed"
  | "expired"
  | "cancelled"
  | "refund_pending"
  | "refunded"
  | "no_show";

export type Order = {
  id: number;
  /** Null once the customer has deleted their account. */
  user_id: string | null;
  offer_id: number;
  created_at?: string | null;
  status: OrderStatus;
  payment_method: string | null;
  /** Only present on the customer's own active orders (from get_my_pickup_codes). */
  pickup_code?: string | null;
  /** True once the order was paid and given a pickup code. */
  has_pickup_code?: boolean | null;
  /** Wrong pickup codes entered; complete_pickup locks the order at 5. */
  pickup_code_failed_attempts?: number | null;
  amount?: number | string | null;
  platform_fee?: number | string | null;
  business_amount?: number | string | null;
  cancelled_at?: string | null;
  cancelled_reason?: string | null;
  completed_at?: string | null;
  no_show_at?: string | null;
  rated_at?: string | null;
  quantity_restored_at?: string | null;
  offers?: (Pick<
    Offer,
    | "id"
    | "title"
    | "pickup_start"
    | "pickup_date"
    | "pickup_end"
    | "price"
    | "quantity"
    | "active"
  > & {
    businesses?: Pick<Business, "name" | "address" | "business_type"> | null;
  }) | null;
  profiles?: Pick<
    Profile,
    "email" | "reliability_score" | "reliability_status"
  > | null;
};
