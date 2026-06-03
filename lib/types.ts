export type UserRole = "customer" | "business" | "admin";
export type OrderStatus =
  | "reserved"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "refunded"
  | "no_show";

export type Profile = {
  id: string;
  email: string | null;
  role: UserRole | null;
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
  title: string;
  category: string | null;
  price: number | string;
  old_price: number | string | null;
  quantity: number;
  pickup_start: string | null;
  pickup_end: string | null;
  active: boolean;
  status?: "active" | "inactive" | "sold_out" | null;
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
    | "pickup_end"
    | "price"
    | "quantity"
    | "active"
  > & {
    businesses?: Pick<Business, "name" | "address" | "business_type"> | null;
  }) | null;
  profiles?: Pick<Profile, "email"> | null;
};
