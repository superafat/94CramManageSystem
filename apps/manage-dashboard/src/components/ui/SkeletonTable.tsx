'use client'

interface SkeletonTableProps {
  rows?: number
  columns?: number
  showHeader?: boolean
  className?: string
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  showHeader = true,
  className = '',
}: SkeletonTableProps) {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded'

  return (
    <div className={`w-full ${className}`}>
      {/* Table Header */}
      {showHeader && (
        <div className="grid gap-4 p-4 border-b border-gray-200 dark:border-gray-700" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className={`${baseClasses} h-5 w-3/4`}></div>
          ))}
        </div>
      )}

      {/* Table Rows */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-4 p-4"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className={`${baseClasses} h-6`}></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// 帶卡片樣式的表格骨架屏
export function SkeletonTableCard({
  rows = 5,
  columns = 4,
  showHeader = true,
  className = '',
}: SkeletonTableProps) {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded'

  return (
    <div className={`w-full bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      {/* Card Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className={`${baseClasses} h-7 w-48 mb-2`}></div>
        <div className={`${baseClasses} h-4 w-64`}></div>
      </div>

      {/* Table */}
      <div className="p-6">
        <SkeletonTable rows={rows} columns={columns} showHeader={showHeader} className="" />
      </div>
    </div>
  )
}
