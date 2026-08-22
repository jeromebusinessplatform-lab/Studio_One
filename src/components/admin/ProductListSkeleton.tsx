import { ProductCardSkeleton } from "../ProductCardSkeleton.tsx";

export function ProductListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading products"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} index={i} />
      ))}
      <span className="sr-only">Loading products...</span>
    </div>
  );
}
