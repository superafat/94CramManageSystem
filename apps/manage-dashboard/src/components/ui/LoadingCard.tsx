'use client'

import { Card } from './Card'
import { Skeleton } from './Skeleton'

interface LoadingCardProps {
  loading?: boolean
  children?: React.ReactNode
  title?: string
  variant?: 'default' | 'stats' | 'table'
}

export function LoadingCard({ 
  loading = false, 
  children,
  title,
  variant = 'default'
}: LoadingCardProps) {
  if (!loading) {
    return <>{children}</>
  }

  if (variant === 'stats') {
    return (
      <Card>
        <div className="space-y-2">
          <Skeleton variant="text" width="60%" height="14px" />
          <Skeleton variant="text" width="40%" height="32px" />
          <Skeleton variant="text" width="50%" height="12px" />
        </div>
      </Card>
    )
  }

  if (variant === 'table') {
    return (
      <Card>
        {title && <Skeleton variant="text" width="30%" height="24px" className="mb-4" />}
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="table-row" />
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="space-y-4">
        {title && <Skeleton variant="text" width="40%" height="24px" />}
        <Skeleton variant="text" lines={3} />
      </div>
    </Card>
  )
}
