'use client'

import { useState, useEffect } from 'react'
import type { IndividualStudent, IndividualStats, OverdueStudent, CourseInfo, StudentBilling } from '../_types'
import { getMonthOptions, getOverdueLevel, getOverdueDays } from '../_helpers'
import { OverdueBadge } from './overdue-badge'
import { ReminderButton } from './reminder-button'
import { OverdueBanner } from './overdue-banner'
import { StatBar } from './stat-bar'

export function IndividualTab() {
  const [students, setStudents] = useState<IndividualStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [sessions, setSessions] = useState<Record<string, number>>({})
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7))
  const [stats, setStats] = useState<IndividualStats>({ total_amount: 0, paid_amount: 0, unpaid_amount: 0, overdue_amount: 0 })

  const monthOptions = getMonthOptions()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchIndividual() }, [selectedMonth])

  const fetchIndividual = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/billing/individual?periodMonth=${selectedMonth}`,
        { credentials: 'include' }
      )
      if (!res.ok) {
        await fetchIndividualFallback()
        setLoading(false)
        return
      }
      const data = await res.json()
      if (data.success) {
        const list: IndividualStudent[] = data.data?.students || []
        setStudents(list)
        const newSel: Record<string, boolean> = {}
        const newSessions: Record<string, number> = {}
        list.forEach(s => {
          newSel[s.id] = !s.payment_id
          newSessions[s.id] = s.sessions_completed
        })
        setSelected(newSel)
        setSessions(newSessions)
        setStats(data.data?.stats || { total_amount: 0, paid_amount: 0, unpaid_amount: 0, overdue_amount: 0 })
      }
    } catch (e) {
      console.error(e)
      await fetchIndividualFallback()
    }
    setLoading(false)
  }

  const fetchIndividualFallback = async () => {
    try {
      const res = await fetch('/api/w8/courses?limit=100', { credentials: 'include' })
      const data = await res.json()
      const all: CourseInfo[] = data.data?.courses || []
      const indCourses = all.filter(c =>
        c.course_type === 'individual' || c.name.includes('個指') || c.name.includes('個別')
      )
      const studentMap: Record<string, IndividualStudent> = {}
      await Promise.all(
        indCourses.map(async course => {
          try {
            const r = await fetch(
              `/api/admin/billing/course/${course.id}?periodMonth=${selectedMonth}`,
              { credentials: 'include' }
            )
            const d = await r.json()
            if (d.success) {
              d.data.students.forEach((s: StudentBilling) => {
                if (!studentMap[s.id]) {
                  studentMap[s.id] = {
                    id: s.id,
                    full_name: s.full_name,
                    grade_level: s.grade_level,
                    fee_per_session: course.fee_monthly ? Math.round(course.fee_monthly / 4) : 500,
                    sessions_completed: 4,
                    payment_id: s.payment_id,
                    paid_amount: s.paid_amount,
                    status: s.status,
                    period_month: s.period_month,
                  }
                }
              })
            }
          } catch { /* skip */ }
        })
      )
      const list = Object.values(studentMap)
      setStudents(list)
      const newSel: Record<string, boolean> = {}
      const newSessions: Record<string, number> = {}
      list.forEach(s => {
        newSel[s.id] = !s.payment_id
        newSessions[s.id] = s.sessions_completed
      })
      setSelected(newSel)
      setSessions(newSessions)

      const paid = list.filter(s => s.payment_id).reduce((a, s) => a + (s.paid_amount || 0), 0)
      const unpaid = list.filter(s => !s.payment_id).reduce((a, s) => a + s.fee_per_session * (newSessions[s.id] || 0), 0)
      setStats({ total_amount: paid + unpaid, paid_amount: paid, unpaid_amount: unpaid, overdue_amount: 0 })
    } catch (e) { console.error(e) }
  }

  const handleSubmit = async () => {
    const records = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([studentId]) => {
        const s = students.find(x => x.id === studentId)
        return {
          studentId,
          paymentType: 'per_session',
          amount: (s?.fee_per_session || 0) * (sessions[studentId] || 0),
          periodMonth: selectedMonth,
          paymentDate: new Date().toISOString().split('T')[0],
          sessions: sessions[studentId] || 0,
        }
      })
    if (records.length === 0) { showMsg('請選擇至少一位學生'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/billing/payment-records/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ records }),
      })
      const data = await res.json()
      if (data.success) { showMsg(`✅ 成功建立 ${data.data.created} 筆繳費記錄`); fetchIndividual() }
      else showMsg('❌ 建立失敗：' + (data.error?.message || '未知錯誤'))
    } catch (e) { console.error(e); showMsg('❌ 建立失敗') }
    setSubmitting(false)
  }

  const showMsg = (m: string) => { setMessage(m); setTimeout(() => setMessage(''), 3000) }

  const totalSelected = Object.values(selected).filter(Boolean).length

  // 計算遲繳學生清單
  const overdueStudents: OverdueStudent[] = students
    .filter(s => {
      const level = getOverdueLevel(s.payment_id, s.status, s.period_month || selectedMonth)
      return level !== null
    })
    .map(s => {
      const level = getOverdueLevel(s.payment_id, s.status, s.period_month || selectedMonth)!
      const periodMonth = s.period_month || selectedMonth
      return {
        id: s.id,
        full_name: s.full_name,
        grade_level: s.grade_level,
        level,
        periodMonth,
        overdueDays: (level === 'critical' || level === 'overdue')
          ? getOverdueDays(periodMonth)
          : undefined,
      }
    })

  if (loading) {
    return <div className="py-8 text-center text-text-muted text-sm">讀取中...</div>
  }

  if (students.length === 0) {
    return (
      <div className="py-12 text-center text-text-muted">
        <div className="text-4xl mb-3">🎯</div>
        <div>本月尚無個指學生</div>
        <div className="text-xs mt-1">請先在課程管理新增個指課程並加入學生</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="flex gap-2">
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg bg-white text-sm"
        >
          {monthOptions.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Overdue Banner */}
      {overdueStudents.length > 0 && <OverdueBanner students={overdueStudents} />}

      {/* Stats */}
      <StatBar paid={stats.paid_amount} unpaid={stats.unpaid_amount} overdue={stats.overdue_amount} />

      {/* Message */}
      {message && (
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm">{message}</div>
      )}

      {/* Students */}
      <div className="space-y-2">
        <div className="flex items-center justify-between bg-white rounded-xl border border-border p-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Object.values(selected).every(Boolean)}
              onChange={() => {
                const all = Object.values(selected).every(Boolean)
                const newSel: Record<string, boolean> = {}
                students.forEach(s => { newSel[s.id] = !all && !s.payment_id })
                setSelected(newSel)
              }}
              className="w-4 h-4 text-primary"
            />
            <span className="font-medium text-sm">全選未繳</span>
          </label>
          <span className="text-xs text-text-muted">已選 {totalSelected} 人</span>
        </div>

        {students.map(s => {
          const sessionCount = sessions[s.id] ?? s.sessions_completed
          const total = s.fee_per_session * sessionCount
          const overdueLevel = getOverdueLevel(s.payment_id, s.status, s.period_month || selectedMonth)
          const overdueDays = overdueLevel && overdueLevel !== 'pending'
            ? getOverdueDays(s.period_month || selectedMonth)
            : undefined

          return (
            <div
              key={s.id}
              className={`bg-white rounded-xl border p-3 ${
                s.payment_id
                  ? 'border-green-200 bg-green-50'
                  : overdueLevel === 'critical'
                  ? 'border-l-4 border-l-red-500 border-red-200 bg-red-50/40'
                  : overdueLevel === 'overdue'
                  ? 'border-l-4 border-l-orange-400 border-orange-200'
                  : 'border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected[s.id] || false}
                  onChange={e => setSelected({ ...selected, [s.id]: e.target.checked })}
                  disabled={!!s.payment_id}
                  className="w-4 h-4 text-primary"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text text-sm">{s.full_name}</div>
                  <div className="text-xs text-text-muted">{s.grade_level}</div>
                  {overdueDays != null && overdueDays > 0 && (
                    <div className="text-xs text-red-400 mt-0.5">逾期 {overdueDays} 天</div>
                  )}
                </div>
                {s.payment_id ? (
                  <div className="text-right">
                    <div className="text-xs font-medium text-green-600">已繳 ${s.paid_amount?.toLocaleString()}</div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {overdueLevel && <OverdueBadge level={overdueLevel} />}
                    {(overdueLevel === 'critical' || overdueLevel === 'overdue') && (
                      <ReminderButton studentId={s.id} studentName={s.full_name} />
                    )}
                    <div className="text-right text-sm font-bold text-text">
                      ${total.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {/* Session counter row (only for unpaid) */}
              {!s.payment_id && (
                <div className="mt-2 flex items-center gap-2 pl-7">
                  <span className="text-xs text-text-muted">已上堂數</span>
                  <button
                    onClick={() => setSessions(prev => ({ ...prev, [s.id]: Math.max(0, (prev[s.id] ?? s.sessions_completed) - 1) }))}
                    className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-sm hover:bg-surface-hover"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={sessionCount}
                    onChange={e => setSessions(prev => ({ ...prev, [s.id]: Math.max(0, Number(e.target.value)) }))}
                    className="w-12 text-center border border-border rounded text-sm py-0.5"
                  />
                  <button
                    onClick={() => setSessions(prev => ({ ...prev, [s.id]: (prev[s.id] ?? s.sessions_completed) + 1 }))}
                    className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-sm hover:bg-surface-hover"
                  >
                    +
                  </button>
                  <span className="text-xs text-text-muted">
                    × ${s.fee_per_session.toLocaleString()}／堂 = <span className="font-medium text-text">${total.toLocaleString()}</span>
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Submit */}
      {Object.values(selected).some(Boolean) && (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50"
        >
          {submitting ? '處理中...' : `✅ 記錄已繳費（${totalSelected}人）`}
        </button>
      )}
    </div>
  )
}
