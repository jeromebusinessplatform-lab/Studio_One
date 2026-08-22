export interface ProductReview {
  id: string;
  productId: string;
  productName: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  userName: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string; // ISO date string
  tags?: string[];
  verifiedPurchase: boolean;
}

export interface ProductRatingSummary {
  averageRating: number;
  totalReviews: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}
