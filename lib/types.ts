export type UserRole = "customer" | "business" | "admin";
export type OrderStatus =
  | "reserved"
  | "confirmed"
  | "collected"
  | "completed"
  | "cancelled"
  | "refunded"
  | "no_show";

export type Profile = {
  id: string;
  email: string | null;
  role: UserRole | null;
  reliability_score?: number | null;
  reliability_status?: "excellent" | "good" | "warning" | "restricted" | null;
  no_show_count?: number | null;
  completed_pickup_count?: number | null;
  cancelled_order_count?: number | null;
};

export type Business = {
  id: number;
  owner_id: string;
  name: string;
  business_type: string;
  address: string;
  phone: string | null;
  approved: boolean;
};

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

export type Order = {
  id: number;
  user_id: string;
  offer_id: number;
  created_at?: string | null;
  status: OrderStatus;
  payment_method: string | null;
  pickup_code: string | null;
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
  profiles?: Pick<Profile, "email" | "reliability_score" | "reliability_status"> | null;
};

export type BusinessRating = {
  id: number;
  order_id: number;
  business_id: number;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string | null;
};

export type Rating = {
  id: number;
  user_id: string;
  business_id: number;
  order_id: number;
  rating: number;
  review: string | null;
  created_at: string | null;
};

export type PublicBusinessReview = Pick<
  Rating,
  "id" | "business_id" | "rating" | "review" | "created_at"
>;
