export type Department = {
  id: number;
  business_id: number;
  name: string;
  is_default: boolean;
  has_staff_pin: boolean;
  /** Tbilisi date on which "Today: no boxes" was pressed; paused while it equals today. */
  sales_paused_on: string | null;
  created_at?: string | null;
};

export type BagTemplate = {
  id: number;
  business_id: number;
  department_id: number | null;
  title: string;
  description: string | null;
  category: string;
  size: "S" | "M" | "L";
  price: number | string;
  old_price: number | string | null;
  /** Boxes per day; null = sold until the department stops sales for the day. */
  daily_quantity: number | null;
  pickup_start: string;
  pickup_end: string;
  /** ISO weekdays, 1 = Monday ... 7 = Sunday. */
  days_of_week: number[];
  image_url: string | null;
  active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};
