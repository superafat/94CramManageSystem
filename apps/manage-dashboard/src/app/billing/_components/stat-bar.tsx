'use client'

export function StatBar({ paid, unpaid, overdue }: { paid: number; unpaid: number; overdue: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-white rounded-xl border border-border p-3 text-center">
        <div className="text-2xl font-bold text-green-600">
          {paid > 999 ? `${(paid / 1000).toFixed(1)}k` : paid}
        </div>
        <div className="text-xs text-text-muted">已收（元）</div>
      </div>
      <div className="bg-white rounded-xl border border-border p-3 text-center">
        <div className="text-2xl font-bold text-orange-500">
          {unpaid > 999 ? `${(unpaid / 1000).toFixed(1)}k` : unpaid}
        </div>
        <div className="text-xs text-text-muted">未收（元）</div>
      </div>
      <div className="bg-white rounded-xl border border-border p-3 text-center">
        <div className="text-2xl font-bold text-red-500">
          {overdue > 999 ? `${(overdue / 1000).toFixed(1)}k` : overdue}
        </div>
        <div className="text-xs text-text-muted">逾期（元）</div>
      </div>
    </div>
  )
}
