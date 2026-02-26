'use client'

import { useEffect, useState } from 'react'

const API_BASE = ''

interface BillingRecord {
  id: string
  student_name?: string
  course_name?: string
  amount: number
  status: string
  period_month?: string
  created_at?: string
}

export default function MyChildrenBillingPage() {
  const [records, setRecords] = useState<BillingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadBilling = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_BASE}/api/admin/billing/payment-records`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('載入失敗')
      const json = await res.json()
      const payload = json.data ?? json
      setRecords(payload.records || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入繳費資料失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBilling() }, [])

  const isPending = (status: string) => status === 'pending' || status === 'unpaid'
  const isPaid = (status: string) => status === 'paid'

  const pendingAmount = records
    .filter(r => isPending(r.status))
    .reduce((sum, r) => sum + Number(r.amount || 0), 0)

  const paidAmount = records
    .filter(r => isPaid(r.status))
    .reduce((sum, r) => sum + Number(r.amount || 0), 0)

  const formatAmount = (n: number) =>
    '$' + n.toLocaleString('zh-TW')

  const statusBadge = (status: string) => {
    if (isPaid(status)) {
      return (
        <span className="px-2 py-1 bg-morandi-sage/10 text-morandi-sage text-xs rounded-lg">
          已繳
        </span>
      )
    }
    if (isPending(status)) {
      return (
        <span className="px-2 py-1 bg-morandi-rose/10 text-morandi-rose text-xs rounded-lg">
          待繳
        </span>
      )
    }
    return (
      <span className="px-2 py-1 bg-surface-hover text-text-muted text-xs rounded-lg">
        {status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-8 w-32 bg-surface-hover animate-pulse rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-surface-hover animate-pulse rounded-2xl" />
          <div className="h-24 bg-surface-hover animate-pulse rounded-2xl" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-surface-hover animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="text-6xl">⚠️</div>
        <h2 className="text-xl font-semibold text-text">載入失敗</h2>
        <p className="text-text-muted">{error}</p>
        <button
          onClick={loadBilling}
          className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
        >
          重試
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">繳費查詢</h1>
        <p className="text-text-muted mt-1">查看孩子的繳費狀況</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface rounded-2xl border border-border p-6">
          <p className="text-sm text-text-muted">待繳金額</p>
          <p className="text-2xl font-bold text-morandi-rose mt-1">{formatAmount(pendingAmount)}</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-6">
          <p className="text-sm text-text-muted">已繳金額</p>
          <p className="text-2xl font-bold text-morandi-sage mt-1">{formatAmount(paidAmount)}</p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-background">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">學生</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">項目</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">期間</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-text-muted">金額</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-text-muted">狀態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {records.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-text-muted">
                  尚無繳費記錄
                </td>
              </tr>
            ) : (
              records.map(r => (
                <tr key={r.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3 text-sm text-text">{r.student_name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-text">{r.course_name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">{r.period_month || (r.created_at ? r.created_at.slice(0, 7) : '—')}</td>
                  <td className="px-4 py-3 text-right text-sm text-text">{formatAmount(Number(r.amount || 0))}</td>
                  <td className="px-4 py-3 text-right">{statusBadge(r.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
