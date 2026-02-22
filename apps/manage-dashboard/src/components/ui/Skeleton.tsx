'use client'

interface SkeletonProps {
  variant?: 'text' | 'avatar' | 'card' | 'table-row'
  lines?: number
  className?: string
  width?: string
  height?: string
}

export function Skeleton({
  variant = 'text',
  lines = 1,
  className = '',
  width,
  height
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded'

  if (variant === 'avatar') {
    return (
      <div 
        className={`${baseClasses} rounded-full ${className}`}
        style={{ 
          width: width || '48px', 
          height: height || '48px' 
        }}
      />
    )
  }

  if (variant === 'card') {
    return (
      <div className={`${baseClasses} ${className}`} style={{ width, height: height || '200px' }}>
        <div className="p-6 space-y-4">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (variant === 'table-row') {
    return (
      <div className={`flex gap-4 p-4 ${className}`}>
        <div className={`${baseClasses} h-10 flex-1`}></div>
        <div className={`${baseClasses} h-10 flex-1`}></div>
        <div className={`${baseClasses} h-10 flex-1`}></div>
        <div className={`${baseClasses} h-10 w-20`}></div>
      </div>
    )
  }

  // Text variant (default) - supports multiple lines
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => {
        // Last line is usually shorter
        const isLast = i === lines - 1
        const lineWidth = isLast ? '66%' : width || '100%'
        
        return (
          <div
            key={i}
            className={baseClasses}
            style={{ 
              width: lineWidth, 
              height: height || '16px' 
            }}
          />
        )
      })}
    </div>
  )
}

// 預設的骨架屏組合
export function SkeletonPage() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton variant="text" height="32px" width="40%" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
      <Skeleton variant="text" lines={3} />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="table-row" />
      ))}
    </div>
  )
}
