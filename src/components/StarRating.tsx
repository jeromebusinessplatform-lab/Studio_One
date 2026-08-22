import React, { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number; // 0 - 5
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  showCount?: boolean;
  count?: number;
  showScore?: boolean;
  className?: string;
}

export function StarRating({
  rating,
  maxStars = 5,
  size = 14,
  interactive = false,
  onChange,
  showCount = false,
  count,
  showScore = false,
  className = "",
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const displayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxStars }).map((_, index) => {
          const starValue = index + 1;
          const isFilled = displayRating >= starValue;
          const isHalf = !isFilled && displayRating >= starValue - 0.5;

          return (
            <button
              key={index}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onChange?.(starValue)}
              onMouseEnter={() => interactive && setHoverRating(starValue)}
              onMouseLeave={() => interactive && setHoverRating(null)}
              className={`p-0 bg-transparent border-0 leading-none transition-transform ${
                interactive ? "cursor-pointer hover:scale-115 active:scale-95" : "cursor-default"
              }`}
              title={interactive ? `${starValue} Stars` : undefined}
            >
              <Star
                size={size}
                className={`${
                  isFilled
                    ? "fill-amber-400 text-amber-400"
                    : isHalf
                    ? "fill-amber-400/50 text-amber-400"
                    : "fill-neutral-200 text-neutral-300"
                } transition-colors`}
              />
            </button>
          );
        })}
      </div>

      {showScore && (
        <span
          className="text-xs font-bold text-neutral-900 ml-0.5 font-mono"
          style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "12px" }}
        >
          {rating.toFixed(1)}
        </span>
      )}

      {showCount && typeof count === "number" && (
        <span
          className="text-[11px] text-neutral-500 font-normal ml-0.5"
          style={{ fontFamily: "'Ubuntu', sans-serif" }}
        >
          ({count})
        </span>
      )}
    </div>
  );
}
