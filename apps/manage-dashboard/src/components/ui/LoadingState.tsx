'use client'

interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton' | 'dots'
  size?: 'sm' | 'md' | 'lg'
  message?: string
  fullPage?: boolean
}

export function LoadingState({
  variant = 'spinner',
  size = 'md',
  message,
  fullPage = false,
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
  }

  const containerClasses = fullPage
    ? 'flex flex-col items-center justify-center min-h-screen'
    : 'flex flex-col items-center justify-center min-h-[200px]'

  if (variant === 'spinner') {
    return (
      <div className={containerClasses}>
        <div className={`animate-spin ${sizeClasses[size]} mb-4`}>⏳</div>
        {message && <p className="text-text-muted text-sm">{message}</p>}
      </div>
    )
  }

  if (variant === 'dots') {
    return (
      <div className={containerClasses}>
        <div className="flex gap-2 mb-4">
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        {message && <p className="text-text-muted text-sm">{message}</p>}
      </div>
    )
  }

  // Skeleton variant
  return (
    <div className="space-y-4 p-4">
      <div className="h-8 bg-border rounded-xl animate-pulse w-1/3"></div>
      <div className="h-4 bg-border rounded-xl animate-pulse w-2/3"></div>
      <div className="h-4 bg-border rounded-xl animate-pulse w-1/2"></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-border rounded-2xl animate-pulse"></div>
        ))}
      </div>
    </div>
  )
}

interface SkeletonCardProps {
  count?: number
}

export function SkeletonCard({ count = 1 }: SkeletonCardProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-surface border border-border rounded-2xl p-6 animate-pulse">
          <div className="h-6 bg-border rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-border rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-border rounded w-1/2"></div>
        </div>
      ))}
    </>
  )
}
