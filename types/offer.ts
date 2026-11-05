import type { Business } from "@/types/business";

export type Offer = {
  id: number;
  business_id: number;
  created_at?: string | null;
  title: string;
  category: string | null;
  price: number | string;
  old_price: number | string | null;
  quantity: number;
  pickup_date?: string | null;
  pickup_start: string | null;
  pickup_end: string | null;
  active: boolean;
  status?: "active" | "inactive" | "sold_out" | "expired" | null;
  description?: string | null;
  allergens?: string | null;
  image_url: string | null;
  /** Lunch Box size; null on offers created before sizes existed. */
  size?: "S" | "M" | "L" | null;
  /** Department that sells this box (null = the business's default). */
  department_id?: number | null;
  /** Set when the daily job created this offer from a box template. */
  template_id?: number | null;
  /** "Until stopped" bags: the remaining count is not shown to customers. */
  unlimited_quantity?: boolean | null;
  /** Set while the department/store has pressed "Today: no boxes". */
  paused_at?: string | null;
  businesses?: Pick<Business, "name" | "address" | "business_type"> | null;
  departments?: { id: number; name: string } | null;
};

export type Favorite = {
  id: number;
  user_id: string;
  offer_id: number;
  created_at: string | null;
  offers?: Offer | null;
};
