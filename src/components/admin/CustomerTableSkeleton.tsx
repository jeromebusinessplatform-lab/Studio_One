export function CustomerTableSkeleton({ rowCount = 5 }: { rowCount?: number }) {
  return (
    <div className="space-y-2 animate-pulse w-full max-w-full">
      {Array.from({ length: rowCount }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-neutral-200 p-2.5 space-y-2 shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-neutral-200 rounded" />
              <div className="space-y-1">
                <div className="h-3.5 bg-neutral-200 rounded w-28" />
                <div className="h-2.5 bg-neutral-100 rounded w-20" />
              </div>
            </div>
            <div className="h-5 bg-neutral-200 rounded w-16" />
          </div>
          <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-neutral-100">
            <div className="h-3 bg-neutral-100 rounded w-full" />
            <div className="h-3 bg-neutral-100 rounded w-full" />
            <div className="h-3 bg-neutral-100 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
