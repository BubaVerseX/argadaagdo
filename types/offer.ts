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
  businesses?: Pick<Business, "name" | "address" | "business_type"> | null;
};

export type Favorite = {
  id: number;
  user_id: string;
  offer_id: number;
  created_at: string | null;
  offers?: Offer | null;
};
