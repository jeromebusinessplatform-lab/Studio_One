export function CustomerTableSkeleton({ rowCount = 5 }: { rowCount?: number }) {
  return (
    <div className="bg-white rounded shadow overflow-hidden animate-pulse">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-3 text-left w-1/4"><div className="h-4 bg-neutral-200 rounded w-16" /></th>
            <th className="p-3 text-left w-1/4"><div className="h-4 bg-neutral-200 rounded w-20" /></th>
            <th className="p-3 text-left w-1/6"><div className="h-4 bg-neutral-200 rounded w-12" /></th>
            <th className="p-3 text-left w-1/6"><div className="h-4 bg-neutral-200 rounded w-12" /></th>
            <th className="p-3 text-left w-1/6"><div className="h-4 bg-neutral-200 rounded w-16" /></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }).map((_, i) => (
            <tr key={i} className="border-b">
              <td className="p-3"><div className="h-3 bg-neutral-100 rounded w-24" /></td>
              <td className="p-3"><div className="h-3 bg-neutral-100 rounded w-28" /></td>
              <td className="p-3"><div className="h-3 bg-neutral-100 rounded w-16" /></td>
              <td className="p-3"><div className="h-3 bg-neutral-100 rounded w-10" /></td>
              <td className="p-3"><div className="h-3 bg-neutral-100 rounded w-20" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
