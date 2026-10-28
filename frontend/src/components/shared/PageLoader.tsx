/**
 * PageLoader — skeleton placeholder that matches page layout height.
 * Prevents layout shift (shaking) while API data loads.
 * Usage: if (loading) return <PageLoader />
 */
export default function PageLoader({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse" style={{ minHeight: 'calc(100vh - 160px)' }}>
      {/* Page header skeleton */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="skeleton h-6 w-48 mb-1" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-9 w-24 rounded-lg" />
          <div className="skeleton h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Filter bar skeleton */}
      <div className="flex gap-2 mb-2">
        <div className="skeleton h-9 w-64 rounded-lg" />
        <div className="skeleton h-9 w-32 rounded-lg" />
        <div className="skeleton h-9 w-32 rounded-lg" />
      </div>

      {/* Table/card skeleton rows */}
      <div className="bg-white rounded-xl border border-[#dde3f0] overflow-hidden">
        {/* Table header */}
        <div className="flex gap-4 px-4 py-3 border-b border-[#eef1f8] bg-[#f0f3fb]">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton h-4 flex-1 max-w-[120px]" />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 px-4 py-3 border-b border-[#f0f3fb] last:border-0"
            style={{ opacity: 1 - i * 0.08 }}
          >
            <div className="skeleton h-4 w-6" />
            <div className="skeleton h-4 flex-1 max-w-[160px]" />
            <div className="skeleton h-4 flex-1 max-w-[100px]" />
            <div className="skeleton h-4 flex-1 max-w-[140px]" />
            <div className="skeleton h-4 flex-1 max-w-[80px]" />
            <div className="skeleton h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
