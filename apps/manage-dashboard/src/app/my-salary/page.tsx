'use client'

import { useEffect, useState } from 'react'
import { BackButton } from '@/components/ui/BackButton'

interface SalaryRecord {
  id: string
  period_start: string
  period_end: string
  base_amount: number
  bonus_total: number
  deduction_total: number
  total_amount: number
  status: string
  created_at: string
  adjustments: { type: string; name: string; amount: number }[]
}

const API_BASE = ''

const getMonthRange = (offset: number) => {
  const date = new Date()
  date.setMonth(date.getMonth() + offset)
  const year = date.getFullYear()
  const month = date.getMonth()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0], label: `${year}年${month + 1}月` }
}

export default function MySalaryPage() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [records, setRecords] = useState<SalaryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const monthRange = getMonthRange(monthOffset)

  useEffect(() => { fetchRecords() }, [monthOffset])

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `${API_BASE}/api/w8/salary/records?startDate=${monthRange.start}&endDate=${monthRange.end}`,
        { credentials: 'include' }
      )
      if (res.ok) {
        const result = await res.json()
        const data = result.data ?? result
        setRecords(Array.isArray(data.records) ? data.records : Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch salary records:', err)
    } finally {
      setLoading(false)
    }
  }

  const statusLabel = (s: string) => {
    if (s === 'paid') return { text: '已發放', cls: 'bg-[#7B9E89]/10 text-[#7B9E89]' }
    if (s === 'confirmed') return { text: '已確認', cls: 'bg-[#C4956A]/10 text-[#C4956A]' }
    return { text: '待確認', cls: 'bg-gray-100 text-gray-600' }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton fallbackUrl="/dashboard" />
        <h1 className="text-xl sm:text-2xl font-bold text-text">我的薪資條</h1>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => setMonthOffset(m => m - 1)} className="p-2 text-text-muted hover:text-text rounded-lg hover:bg-surface">&larr; 上月</button>
        <span className="font-medium text-text">{monthRange.label}</span>
        <button onClick={() => setMonthOffset(m => m + 1)} className="p-2 text-text-muted hover:text-text rounded-lg hover:bg-surface">下月 &rarr;</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-text-muted bg-surface rounded-2xl border border-border">
          本月尚無薪資記錄
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(record => {
            const st = statusLabel(record.status)
            const isExpanded = expandedId === record.id
            return (
              <div key={record.id} className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : record.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text">
                          {record.period_start} ~ {record.period_end}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                          {st.text}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">${record.total_amount.toLocaleString()}</p>
                      <p className="text-xs text-text-muted">{isExpanded ? '▲ 收起' : '▼ 明細'}</p>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-4 pb-4 pt-3 bg-surface/50 space-y-3">
                    {/* Breakdown */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-white rounded-lg p-3 border border-border">
                        <p className="text-xs text-text-muted">基本薪資</p>
                        <p className="text-sm font-bold text-text">${record.base_amount.toLocaleString()}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-border">
                        <p className="text-xs text-text-muted">獎金</p>
                        <p className="text-sm font-bold text-[#7B9E89]">+${record.bonus_total.toLocaleString()}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-border">
                        <p className="text-xs text-text-muted">扣薪</p>
                        <p className="text-sm font-bold text-[#B5706E]">-${record.deduction_total.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Adjustment Details */}
                    {record.adjustments?.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-text-muted font-medium">調整明細</p>
                        {record.adjustments.map((adj, i) => (
                          <div key={i} className={`flex justify-between text-xs px-2 py-1.5 rounded ${adj.type === 'bonus' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            <span>{adj.type === 'bonus' ? '+' : '-'} {adj.name}</span>
                            <span>${Number(adj.amount).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <span className="text-sm font-medium text-text">實發金額</span>
                      <span className="text-lg font-bold text-primary">${record.total_amount.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
