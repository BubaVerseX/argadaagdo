export type UserRole = "customer" | "business" | "admin";

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
