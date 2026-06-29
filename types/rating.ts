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
  comment?: string | null;
  review: string | null;
  created_at: string | null;
};

export type PublicBusinessReview = Pick<
  Rating,
  "id" | "business_id" | "rating" | "review" | "created_at"
>;
