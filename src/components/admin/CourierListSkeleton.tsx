export function CourierListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white p-4 rounded-xl shadow animate-pulse flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-neutral-200 rounded-lg"></div>
            <div className="space-y-2">
              <div className="h-4 w-24 bg-neutral-200 rounded"></div>
              <div className="h-3 w-16 bg-neutral-100 rounded"></div>
            </div>
          </div>
          <div className="h-8 w-16 bg-neutral-200 rounded"></div>
        </div>
      ))}
    </div>
  );
}
