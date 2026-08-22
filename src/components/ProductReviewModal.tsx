import React, { useState } from "react";
import { Star, X, CheckCircle2, MessageSquare, ShieldCheck, Tag } from "lucide-react";
import { StarRating } from "@/components/StarRating.tsx";
import { useReviews } from "@/hooks/useReviews.ts";
import { toast } from "sonner";

interface ProductReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  userName: string;
  productImage?: string;
  existingReview?: {
    rating: number;
    comment: string;
    tags?: string[];
  } | null;
  onReviewSubmitted?: () => void;
}

const PRESET_TAGS = [
  "High Quality",
  "Fast Delivery",
  "True to Description",
  "Value for Money",
  "Premium Finish",
  "Easy Setup",
];

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: "Poor - Needs Major Improvement",
  2: "Fair - Below Expectations",
  3: "Average - Satisfactory",
  4: "Good - Exceeded Expectations",
  5: "Exceptional - Highly Recommended!",
};

export function ProductReviewModal({
  isOpen,
  onClose,
  productId,
  productName,
  orderId,
  orderNumber,
  userId,
  userName,
  productImage,
  existingReview,
  onReviewSubmitted,
}: ProductReviewModalProps) {
  const { addReview } = useReviews();
  const [rating, setRating] = useState<number>(existingReview?.rating || 5);
  const [comment, setComment] = useState<string>(existingReview?.comment || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(existingReview?.tags || ["High Quality"]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      toast.error("Please choose a star rating");
      return;
    }
    if (!comment.trim()) {
      toast.error("Please enter a short comment about the product");
      return;
    }

    setIsSubmitting(true);
    try {
      addReview({
        productId,
        productName,
        orderId,
        orderNumber,
        userId: userId || "1085949511",
        userName: userName || "Customer",
        rating,
        comment: comment.trim(),
        tags: selectedTags,
        verifiedPurchase: true,
      });

      toast.success(`Review for ${productName} submitted successfully!`);
      onReviewSubmitted?.();
      onClose();
    } catch {
      toast.error("Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-md rounded-2xl border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-black" />
            <div>
              <h3
                className="text-base font-normal uppercase text-black leading-tight"
                style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
              >
                Rate & Review Product
              </h3>
              <div
                className="text-[11px] text-neutral-500 flex items-center gap-1 font-normal"
                style={{ fontFamily: "'Ubuntu', sans-serif" }}
              >
                <ShieldCheck size={12} className="text-emerald-600" />
                <span>Verified Purchase • Order #{orderNumber}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-black p-1.5 rounded-full hover:bg-neutral-100 cursor-pointer transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 flex-1 text-neutral-800">
          {/* Product Banner */}
          <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200/80">
            {productImage ? (
              <img
                src={productImage}
                alt={productName}
                className="w-12 h-12 rounded-lg object-contain bg-white border border-neutral-200 p-1 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-neutral-200 flex items-center justify-center shrink-0 font-bold text-neutral-500">
                ★
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4
                className="font-semibold text-black text-sm truncate"
                style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
              >
                {productName}
              </h4>
              <p
                className="text-xs text-neutral-500 mt-0.5"
                style={{ fontFamily: "'Ubuntu', sans-serif" }}
              >
                Share your feedback to help other shoppers
              </p>
            </div>
          </div>

          {/* Star Rating Selector */}
          <div className="space-y-1.5 text-center py-2 bg-neutral-50/50 rounded-xl border border-neutral-100">
            <label
              className="text-xs font-medium text-neutral-600 uppercase tracking-wider block"
              style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
            >
              Overall Star Rating
            </label>
            <div className="flex justify-center py-1">
              <StarRating
                rating={rating}
                interactive={true}
                size={28}
                onChange={(r) => setRating(r)}
              />
            </div>
            <p
              className="text-xs font-semibold text-amber-800 font-mono tracking-tight"
              style={{ fontFamily: "'Ubuntu', sans-serif" }}
            >
              {RATING_DESCRIPTIONS[rating] || `${rating} Stars`}
            </p>
          </div>

          {/* Quick Highlight Tags */}
          <div className="space-y-1.5">
            <label
              className="text-xs font-medium text-neutral-600 uppercase tracking-wider block flex items-center gap-1"
              style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
            >
              <Tag size={12} /> What stood out the most?
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-full text-xs font-normal transition cursor-pointer border ${
                      isSelected
                        ? "bg-black text-white border-black"
                        : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
                    }`}
                    style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "12px" }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment Field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label
                className="text-xs font-medium text-neutral-600 uppercase tracking-wider block"
                style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
              >
                Your Product Review
              </label>
              <span className="text-[11px] text-neutral-400 font-mono">{comment.length}/400</span>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 400))}
              rows={3}
              placeholder="How was the build quality, performance, and packaging? Would you recommend it?"
              required
              className="w-full bg-white border border-neutral-200 rounded-xl p-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black transition resize-none"
              style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "13px" }}
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-neutral-200 text-neutral-700 text-xs font-medium hover:bg-neutral-100 transition cursor-pointer"
              style={{ fontFamily: "'Ubuntu', sans-serif" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !comment.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-medium transition cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              style={{ fontFamily: "'Ubuntu', sans-serif" }}
            >
              <CheckCircle2 size={14} />
              <span>Submit Review</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
