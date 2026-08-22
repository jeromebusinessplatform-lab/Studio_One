export function OrderSkeleton() {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-5 w-24 bg-neutral-200 rounded-md" />
          <div className="h-3 w-40 bg-neutral-100 rounded-md" />
        </div>
        <div className="text-right space-y-2">
          <div className="h-5 w-16 bg-neutral-200 rounded-md ml-auto" />
          <div className="h-3 w-12 bg-neutral-100 rounded-md ml-auto" />
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
        <div className="h-3 w-32 bg-neutral-100 rounded-md" />
        <div className="h-3 w-20 bg-neutral-100 rounded-md" />
      </div>
    </div>
  );
}

export function OrderListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <OrderSkeleton key={i} />
      ))}
    </div>
  );
}
