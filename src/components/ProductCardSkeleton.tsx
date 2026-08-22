export function ProductCardSkeleton({ index = 0 }: { index?: number; key?: number | string }) {
  // Varied widths for realistic staggered appearance across the grid
  const titleWidths = ["w-[82%]", "w-[92%]", "w-[74%]", "w-[88%]", "w-[78%]", "w-[85%]"];
  const subnameWidths = ["w-[55%]", "w-[65%]", "w-[48%]", "w-[58%]", "w-[62%]", "w-[50%]"];
  const hasBadge = index % 2 === 0;

  const titleWidth = titleWidths[index % titleWidths.length];
  const subnameWidth = subnameWidths[index % subnameWidths.length];

  return (
    <div
      aria-hidden="true"
      className="bg-white rounded-2xl border border-neutral-200/90 flex flex-col justify-between overflow-hidden shadow-xs animate-pulse"
    >
      {/* Product Image & Badge Area Placeholder */}
      <div className="relative aspect-square w-full bg-neutral-100/80 flex items-center justify-center p-2.5 overflow-hidden">
        {/* Shimmering Center Silhouette */}
        <div className="w-12 h-12 rounded-xl bg-neutral-200/60" />

        {/* Badge Placeholder */}
        {hasBadge && (
          <div className="absolute top-2 left-2 z-10">
            <div className="w-9 h-3.5 rounded-full bg-neutral-200/80" />
          </div>
        )}
      </div>

      {/* Product Info Placeholder */}
      <div className="p-1.5 flex flex-col flex-1 justify-between pt-1">
        <div>
          {/* Title skeleton */}
          <div className={`h-3.5 bg-neutral-200/80 rounded-sm ${titleWidth}`} />

          {/* Subtitle skeleton */}
          <div className={`h-2.5 bg-neutral-100 rounded-sm mt-1.5 ${subnameWidth}`} />

          {/* Pricing skeleton */}
          <div className="mt-2 flex items-baseline gap-1.5">
            <div className="h-4 w-12 bg-neutral-200/90 rounded-sm" />
            <div className="h-3 w-8 bg-neutral-100 rounded-sm" />
          </div>
        </div>

        {/* Action Button Placeholder */}
        <div className="mt-2 flex items-center justify-center">
          <div className="w-full h-7 rounded-full bg-neutral-200/80" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading products"
      className="grid grid-cols-3 gap-2 sm:gap-2.5"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} index={i} />
      ))}
      <span className="sr-only">Loading products...</span>
    </div>
  );
}
