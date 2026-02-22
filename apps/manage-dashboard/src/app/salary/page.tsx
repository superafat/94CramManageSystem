'use client'

import { useEffect, useState } from 'react'
import { BackButton } from '@/components/ui/BackButton'

interface TeacherSalary {
  teacher_id: string
  teacher_name: string
  title: string
  rate_per_class: string
  total_classes: number
  total_amount: string
}

interface SalaryData {
  period: { start: string; end: string }
  teachers: TeacherSalary[]
  grand_total_classes: number
  grand_total_amount: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3100'

// 取得本月起迄日
const getMonthRange = (offset: number = 0) => {
  const date = new Date()
  date.setMonth(date.getMonth() + offset)
  const year = date.getFullYear()
  const month = date.getMonth()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    label: `${year}年${month + 1}月`
  }
}

export default function SalaryPage() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [data, setData] = useState<SalaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)

  const monthRange = getMonthRange(monthOffset)

  useEffect(() => {
    fetchSalary()
  }, [monthOffset])

  const fetchSalary = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `${API_BASE}/api/w8/salary/calculate?start_date=${monthRange.start}&end_date=${monthRange.end}`
      )
      const result = await res.json()
      setData(result)
    } catch (err) {
      console.error('Failed to fetch salary:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <BackButton fallbackUrl="/dashboard" />
          <h1 className="text-lg font-semibold text-text">薪資管理</h1>
        </div>
        
        {/* Month Navigation */}
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => setMonthOffset(m => m - 1)}
            className="p-2 text-text-muted hover:text-text"
          >
            ← 上月
          </button>
          <div className="text-center">
            <p className="font-medium text-text">{monthRange.label}</p>
            <p className="text-xs text-text-muted">
              {monthRange.start} ~ {monthRange.end}
            </p>
          </div>
          <button
            onClick={() => setMonthOffset(m => m + 1)}
            className="p-2 text-text-muted hover:text-text"
          >
            下月 →
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Summary Card */}
            <div className="bg-gradient-to-r from-primary to-primary-hover rounded-2xl p-6 text-white">
              <p className="text-sm opacity-80">本月薪資總計</p>
              <p className="text-3xl font-bold mt-1">
                ${data.grand_total_amount.toLocaleString()}
              </p>
              <div className="flex gap-6 mt-4 text-sm">
                <div>
                  <p className="opacity-80">總堂數</p>
                  <p className="font-semibold">{data.grand_total_classes} 堂</p>
                </div>
                <div>
                  <p className="opacity-80">講師數</p>
                  <p className="font-semibold">{data.teachers.length} 位</p>
                </div>
              </div>
            </div>

            {/* Teacher Cards */}
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-text-muted px-1">各講師明細</h2>
              {data.teachers.map((teacher) => (
                <div
                  key={teacher.teacher_id}
                  className="bg-surface rounded-xl p-4 border border-border"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text">{teacher.teacher_name}</span>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                          {teacher.title}
                        </span>
                      </div>
                      <p className="text-sm text-text-muted mt-1">
                        堂薪 ${Number(teacher.rate_per_class).toLocaleString()} × {teacher.total_classes} 堂
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">
                        ${Number(teacher.total_amount).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (Number(teacher.total_amount) / data.grand_total_amount) * 100)}%`
                        }}
                      />
                    </div>
                    <p className="text-xs text-text-muted mt-1 text-right">
                      佔比 {((Number(teacher.total_amount) / data.grand_total_amount) * 100).toFixed(1)}%
                    </p>
                  </div>

                  {/* Confirm / Pay actions */}
                  {teacher.total_classes > 0 && (
                    <div className="mt-3 flex gap-2">
                      <button
                        disabled={confirming === teacher.teacher_id}
                        onClick={async () => {
                          setConfirming(teacher.teacher_id)
                          try {
                            const res = await fetch(`${API_BASE}/api/w8/salary/records`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                teacher_id: teacher.teacher_id,
                                period_start: monthRange.start,
                                period_end: monthRange.end,
                                total_classes: teacher.total_classes,
                                total_amount: teacher.total_amount,
                                tenant_id: '11111111-1111-1111-1111-111111111111',
                                branch_id: 'a1b2c3d4-e5f6-1a2b-8c3d-4e5f6a7b8c9d',
                              }),
                            })
                            if (res.ok) alert(`${teacher.teacher_name} 薪資已確認`)
                            else alert('確認失敗')
                          } catch { alert('確認失敗') }
                          finally { setConfirming(null) }
                        }}
                        className="flex-1 py-1.5 text-sm border border-primary text-primary rounded-lg disabled:opacity-50"
                      >
                        {confirming === teacher.teacher_id ? '處理中...' : '確認薪資'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Empty State */}
            {data.teachers.length === 0 && (
              <div className="text-center py-12 text-text-muted">
                本月無排課記錄
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-text-muted">
            無法載入資料
          </div>
        )}
      </div>
    </div>
  )
}
