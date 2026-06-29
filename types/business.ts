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
};
