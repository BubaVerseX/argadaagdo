export type Business = {
  id: number;
  owner_id: string;
  name: string;
  business_type: string;
  address: string;
  phone: string | null;
  approved: boolean;
  created_at?: string | null;
  description?: string | null;
  /** Tbilisi date of a store-wide "Today: no bags"; paused while it equals today. */
  sales_paused_on?: string | null;
  /** Platform commission share (0.30 = 30%). Server-side; set by admins. */
  platform_fee_rate?: number | string | null;
};
