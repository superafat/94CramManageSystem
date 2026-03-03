'use client'

import type { OverdueLevel } from '../_types'

export function OverdueBadge({ level, days }: { level: OverdueLevel; days?: number }) {
  if (!level) return null

  if (level === 'critical') {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
          嚴重遲繳
        </span>
        {days != null && days > 0 && (
          <span className="text-xs text-red-400">逾期 {days} 天</span>
        )}
      </div>
    )
  }
  if (level === 'overdue') {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
          遲繳
        </span>
        {days != null && days > 0 && (
          <span className="text-xs text-orange-400">逾期 {days} 天</span>
        )}
      </div>
    )
  }
  if (level === 'pending') {
    return (
      <span className="text-xs font-bold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
        處理中
      </span>
    )
  }
  return null
}
