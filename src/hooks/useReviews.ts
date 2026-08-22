import { useState, useEffect, useCallback } from "react";
import { INITIAL_REVIEWS } from "@/data/reviews.ts";
import type { ProductReview, ProductRatingSummary } from "@/types/reviews.ts";

const REVIEWS_STORAGE_KEY = "prime_product_reviews";

export function useReviews() {
  const [reviews, setReviews] = useState<ProductReview[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(REVIEWS_STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return INITIAL_REVIEWS;
        }
      }
    }
    return INITIAL_REVIEWS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
    } catch {
      // ignore
    }
  }, [reviews]);

  const addReview = useCallback((newReview: Omit<ProductReview, "id" | "createdAt">) => {
    const id = `rev-${Date.now()}`;
    const review: ProductReview = {
      ...newReview,
      id,
      createdAt: new Date().toISOString(),
    };

    setReviews((prev) => [review, ...prev]);
    return review;
  }, []);

  const getProductReviews = useCallback(
    (productId: string) => {
      return reviews.filter((r) => r.productId === productId);
    },
    [reviews]
  );

  const getProductRatingSummary = useCallback(
    (productId: string): ProductRatingSummary => {
      const prodReviews = reviews.filter((r) => r.productId === productId);
      if (prodReviews.length === 0) {
        // Fallback default rating for unreviewed catalog items
        return {
          averageRating: 4.8,
          totalReviews: 12,
          distribution: { 5: 10, 4: 2, 3: 0, 2: 0, 1: 0 },
        };
      }

      const total = prodReviews.length;
      const sum = prodReviews.reduce((acc, r) => acc + r.rating, 0);
      const avg = Math.round((sum / total) * 10) / 10;

      const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      prodReviews.forEach((r) => {
        const ratingKey = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
        distribution[ratingKey] = (distribution[ratingKey] || 0) + 1;
      });

      return {
        averageRating: avg,
        totalReviews: total,
        distribution,
      };
    },
    [reviews]
  );

  const getOrderReviews = useCallback(
    (orderId: string) => {
      return reviews.filter((r) => r.orderId === orderId);
    },
    [reviews]
  );

  const hasReviewedItem = useCallback(
    (orderId: string, productId: string) => {
      return reviews.some((r) => r.orderId === orderId && r.productId === productId);
    },
    [reviews]
  );

  const getReviewForOrderItem = useCallback(
    (orderId: string, productId: string) => {
      return reviews.find((r) => r.orderId === orderId && r.productId === productId);
    },
    [reviews]
  );

  return {
    reviews,
    addReview,
    getProductReviews,
    getProductRatingSummary,
    getOrderReviews,
    hasReviewedItem,
    getReviewForOrderItem,
  };
}
