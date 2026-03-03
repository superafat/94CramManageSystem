'use client'

import { useEffect, useState } from 'react'
import { BackButton } from '@/components/ui/BackButton'

interface SalaryAdjustment {
  type: string
  name: string
  amount: string
}

interface TeacherSalary {
  teacher_id: string
  teacher_name: string
  title: string
  teacher_role?: string
  salary_type: string
  rate_per_class: string
  base_salary: string
  hourly_rate: string
  total_classes: number
  base_amount: number
  bonus_total: number
  deduction_total: number
  total_amount: number
  adjustments: SalaryAdjustment[]
}

interface SalaryData {
  period: { start: string; end: string }
  teachers: TeacherSalary[]
  grand_total_classes: number
  grand_total_amount: number
}

const API_BASE = ''

const SALARY_TYPE_LABELS: Record<string, string> = {
  monthly: '月薪制',
  hourly: '時薪制',
  per_class: '堂薪制',
}

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
  const [showAdjModal, setShowAdjModal] = useState(false)
  const [adjForm, setAdjForm] = useState({ teacherId: '', type: 'bonus' as 'bonus' | 'deduction', name: '', amount: '', notes: '' })
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([])

  const monthRange = getMonthRange(monthOffset)

  useEffect(() => {
    fetchSalary()
  }, [monthOffset])

  const fetchSalary = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `${API_BASE}/api/w8/salary/calculate?startDate=${monthRange.start}&endDate=${monthRange.end}`,
        { headers: { 'Content-Type': 'application/json' }, credentials: 'include' }
      )
      if (!res.ok) return
      const result = await res.json()
      const d = result.data ?? result
      setData(d)
      if (d?.teachers) {
        setTeachers(d.teachers.map((t: TeacherSalary) => ({ id: t.teacher_id, name: t.teacher_name })))
      }
    } catch (err) {
      console.error('Failed to fetch salary:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAdjustment = async () => {
    if (!adjForm.teacherId || !adjForm.name || !adjForm.amount) return
    try {
      const res = await fetch(`${API_BASE}/api/w8/salary/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          teacherId: adjForm.teacherId,
          periodStart: monthRange.start,
          periodEnd: monthRange.end,
          type: adjForm.type,
          name: adjForm.name,
          amount: adjForm.amount,
          notes: adjForm.notes || undefined,
        }),
      })
      if (res.ok) {
        setShowAdjModal(false)
        setAdjForm({ teacherId: '', type: 'bonus', name: '', amount: '', notes: '' })
        fetchSalary()
      }
    } catch (err) {
      console.error('Failed to add adjustment:', err)
    }
  }

  const getSalaryBreakdown = (t: TeacherSalary) => {
    const st = t.salary_type || 'per_class'
    if (st === 'monthly') return `月薪 $${Number(t.base_salary || 0).toLocaleString()}`
    if (st === 'hourly') return `時薪 $${Number(t.hourly_rate || 0).toLocaleString()} × ${t.total_classes} 堂`
    return `堂薪 $${Number(t.rate_per_class || 0).toLocaleString()} × ${t.total_classes} 堂`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton fallbackUrl="/dashboard" />
            <h1 className="text-lg font-semibold text-text">薪資管理</h1>
          </div>
          <button
            onClick={() => setShowAdjModal(true)}
            className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium"
          >
            + 獎金/扣薪
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mt-3">
          <button onClick={() => setMonthOffset(m => m - 1)} className="p-2 text-text-muted hover:text-text">
            ← 上月
          </button>
          <div className="text-center">
            <p className="font-medium text-text">{monthRange.label}</p>
            <p className="text-xs text-text-muted">{monthRange.start} ~ {monthRange.end}</p>
          </div>
          <button onClick={() => setMonthOffset(m => m + 1)} className="p-2 text-text-muted hover:text-text">
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
                <div key={teacher.teacher_id} className="bg-surface rounded-xl p-4 border border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-text">{teacher.teacher_name}</span>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                          {teacher.title}
                        </span>
                        {teacher.teacher_role && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                            {teacher.teacher_role}
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {SALARY_TYPE_LABELS[teacher.salary_type] || '堂薪制'}
                        </span>
                      </div>
                      <p className="text-sm text-text-muted mt-1">{getSalaryBreakdown(teacher)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">
                        ${Number(teacher.total_amount).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Adjustments */}
                  {(teacher.bonus_total > 0 || teacher.deduction_total > 0) && (
                    <div className="mt-2 space-y-1">
                      {teacher.adjustments?.map((adj, i) => (
                        <div key={i} className={`flex justify-between text-xs px-2 py-1 rounded ${adj.type === 'bonus' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          <span>{adj.type === 'bonus' ? '+' : '-'} {adj.name}</span>
                          <span>${Number(adj.amount).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${data.grand_total_amount > 0 ? Math.min(100, (Number(teacher.total_amount) / data.grand_total_amount) * 100) : 0}%`
                        }}
                      />
                    </div>
                    <p className="text-xs text-text-muted mt-1 text-right">
                      佔比 {data.grand_total_amount > 0 ? ((Number(teacher.total_amount) / data.grand_total_amount) * 100).toFixed(1) : '0.0'}%
                    </p>
                  </div>

                  {/* Confirm */}
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
                              credentials: 'include',
                              body: JSON.stringify({
                                teacherId: teacher.teacher_id,
                                periodStart: monthRange.start,
                                periodEnd: monthRange.end,
                              }),
                            })
                            if (res.ok) alert(`${teacher.teacher_name} 薪資已確認`)
                            else alert('確認失敗')
                          } catch (err) {
                            console.error('[Salary] Confirm failed:', err)
                            alert('確認失敗')
                          } finally { setConfirming(null) }
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

            {data.teachers.length === 0 && (
              <div className="text-center py-12 text-text-muted">本月無排課記錄</div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-text-muted">無法載入資料</div>
        )}
      </div>

      {/* Add Adjustment Modal */}
      {showAdjModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-text mb-4">新增獎金/扣薪</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-text-muted mb-1">講師</label>
                <select
                  value={adjForm.teacherId}
                  onChange={(e) => setAdjForm({ ...adjForm, teacherId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                >
                  <option value="">選擇講師</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-text-muted mb-1">類型</label>
                  <select
                    value={adjForm.type}
                    onChange={(e) => setAdjForm({ ...adjForm, type: e.target.value as 'bonus' | 'deduction' })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                  >
                    <option value="bonus">獎金</option>
                    <option value="deduction">扣薪</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">金額</label>
                  <input
                    type="number"
                    value={adjForm.amount}
                    onChange={(e) => setAdjForm({ ...adjForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    placeholder="金額"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">名目</label>
                <input
                  type="text"
                  value={adjForm.name}
                  onChange={(e) => setAdjForm({ ...adjForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                  placeholder="如：全勤獎金、遲到扣薪"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">備註</label>
                <input
                  type="text"
                  value={adjForm.notes}
                  onChange={(e) => setAdjForm({ ...adjForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                  placeholder="選填"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdjModal(false)} className="flex-1 py-2 border border-border rounded-lg text-text">取消</button>
                <button onClick={handleAddAdjustment} className="flex-1 py-2 bg-primary text-white rounded-lg font-medium">新增</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
