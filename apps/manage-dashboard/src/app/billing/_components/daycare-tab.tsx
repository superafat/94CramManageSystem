'use client'

import { useState, useEffect } from 'react'
import type { CourseInfo, DaycareClass, DaycareData, DaycareStudentRow, OverdueStudent } from '../_types'
import { getMonthOptions, twDate, getOverdueLevel, getOverdueDays, getLastPrice, savePriceMemoryBatch } from '../_helpers'
import { OverdueBadge } from './overdue-badge'
import { ReminderButton } from './reminder-button'
import { OverdueBanner } from './overdue-banner'
import { StatBar } from './stat-bar'

export function DaycareTab() {
  const [daycareClasses, setDaycareClasses] = useState<DaycareClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7))
  const [data, setData] = useState<DaycareData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [amounts, setAmounts] = useState<Record<string, number>>({})

  const monthOptions = getMonthOptions()

  useEffect(() => {
    fetchClasses()
  }, [])

  useEffect(() => {
    if (selectedClassId) fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId, selectedMonth])

  const fetchClasses = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/w8/courses?limit=100&type=daycare', { credentials: 'include' })
      if (!res.ok) {
        const res2 = await fetch('/api/w8/courses?limit=100', { credentials: 'include' })
        const d2 = await res2.json()
        const all: CourseInfo[] = d2.data?.courses || []
        const filtered = all.filter(c => c.course_type === 'daycare' || c.name.includes('安親'))
        const classes: DaycareClass[] = filtered.map(c => ({
          id: c.id,
          name: c.name,
          fee_monthly: c.fee_monthly || 0,
        }))
        setDaycareClasses(classes)
        if (classes.length > 0) setSelectedClassId(classes[0].id)
        setLoading(false)
        return
      }
      const d = await res.json()
      const classes: DaycareClass[] = (d.data?.courses || []).map((c: CourseInfo) => ({
        id: c.id,
        name: c.name,
        fee_monthly: c.fee_monthly || 0,
      }))
      setDaycareClasses(classes)
      if (classes.length > 0) setSelectedClassId(classes[0].id)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const fetchData = async () => {
    if (!selectedClassId) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/billing/course/${selectedClassId}?periodMonth=${selectedMonth}`,
        { credentials: 'include' }
      )
      const json = await res.json()
      if (json.success) {
        const cls = daycareClasses.find(c => c.id === selectedClassId)
        const fee = cls?.fee_monthly || json.data?.course?.fee_monthly || 0
        const students: DaycareStudentRow[] = json.data.students
        const paid = students.filter(s => s.payment_id).reduce((a, s) => a + (s.paid_amount || 0), 0)
        const unpaid = students.filter(s => !s.payment_id).length * fee
        setData({
          daycareClass: { id: selectedClassId, name: json.data.course.name, fee_monthly: fee },
          students,
          stats: { total: students.length, paid, unpaid, overdue: 0 },
        })
        const newSel: Record<string, boolean> = {}
        const newAmt: Record<string, number> = {}
        students.forEach(s => {
          newSel[s.id] = !s.payment_id
          const remembered = getLastPrice(selectedClassId, s.id)
          newAmt[s.id] = s.paid_amount || (remembered?.amount ?? fee)
        })
        setSelected(newSel)
        setAmounts(newAmt)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!data) return
    const records = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([studentId]) => ({
        studentId,
        courseId: selectedClassId,
        paymentType: 'monthly',
        amount: amounts[studentId] || data.daycareClass.fee_monthly,
        periodMonth: selectedMonth,
        paymentDate: new Date().toISOString().split('T')[0],
      }))
    if (records.length === 0) { showMsg('請選擇至少一位學生'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/billing/payment-records/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ records }),
      })
      const json = await res.json()
      if (json.success) {
        savePriceMemoryBatch(records)
        showMsg(`✅ 成功建立 ${json.data.created} 筆繳費記錄`)
        fetchData()
      }
      else showMsg('❌ 建立失敗：' + (json.error?.message || '未知錯誤'))
    } catch (e) { console.error(e); showMsg('❌ 建立失敗') }
    setSubmitting(false)
  }

  const showMsg = (m: string) => { setMessage(m); setTimeout(() => setMessage(''), 3000) }

  const allSelected = Object.values(selected).every(Boolean)
  const handleSelectAll = () => {
    const newSel: Record<string, boolean> = {}
    data?.students.forEach(s => { newSel[s.id] = !allSelected && !s.payment_id })
    setSelected(newSel)
  }

  // 計算遲繳學生清單
  const overdueStudents: OverdueStudent[] = (data?.students || [])
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

  if (loading && !data) {
    return <div className="py-8 text-center text-text-muted text-sm">讀取中...</div>
  }

  if (daycareClasses.length === 0) {
    return (
      <div className="py-12 text-center text-text-muted">
        <div className="text-4xl mb-3">🏫</div>
        <div>尚無安親班課程</div>
        <div className="text-xs mt-1">請先在課程管理新增安親班課程</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Selectors */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <select
          value={selectedClassId}
          onChange={e => setSelectedClassId(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg bg-white text-sm"
        >
          {daycareClasses.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}（月費 ${c.fee_monthly.toLocaleString()}）
            </option>
          ))}
        </select>
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
      {data && (
        <StatBar paid={data.stats.paid} unpaid={data.stats.unpaid} overdue={data.stats.overdue} />
      )}

      {/* Message */}
      {message && (
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm">{message}</div>
      )}

      {/* Student list */}
      {data && (
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-white rounded-xl border border-border p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={allSelected} onChange={handleSelectAll} className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">全選未繳</span>
            </label>
            <span className="text-xs text-text-muted">已選 {Object.values(selected).filter(Boolean).length} 人</span>
          </div>

          {data.students.map(s => {
            const overdueLevel = getOverdueLevel(s.payment_id, s.status, s.period_month || selectedMonth)
            const overdueDays = overdueLevel && overdueLevel !== 'pending'
              ? getOverdueDays(s.period_month || selectedMonth)
              : undefined

            return (
              <div
                key={s.id}
                className={`bg-white rounded-xl border p-3 flex items-center gap-3 ${
                  s.payment_id
                    ? 'border-green-200 bg-green-50'
                    : overdueLevel === 'critical'
                    ? 'border-l-4 border-l-red-500 border-red-200 bg-red-50/40'
                    : overdueLevel === 'overdue'
                    ? 'border-l-4 border-l-orange-400 border-orange-200'
                    : 'border-border'
                }`}
              >
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
                    {s.payment_date && (
                      <div className="text-xs text-text-muted">{twDate(s.payment_date)}</div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {overdueLevel && (
                      <OverdueBadge level={overdueLevel} />
                    )}
                    {(overdueLevel === 'critical' || overdueLevel === 'overdue') && (
                      <ReminderButton studentId={s.id} studentName={s.full_name} />
                    )}
                    <div className="flex flex-col items-end gap-0.5">
                      <input
                        type="number"
                        value={amounts[s.id] || 0}
                        onChange={e => setAmounts({ ...amounts, [s.id]: Number(e.target.value) })}
                        className="w-24 px-2 py-1 border border-border rounded text-right text-sm"
                        placeholder="金額"
                      />
                      {!s.payment_id && (() => { const lp = getLastPrice(selectedClassId, s.id); return lp ? <span className="text-xs text-text-muted">上次: NT${lp.amount.toLocaleString()}</span> : null })()}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Submit */}
      {data && Object.values(selected).some(Boolean) && (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50"
        >
          {submitting ? '處理中...' : `✅ 記錄已繳費（${Object.values(selected).filter(Boolean).length}人）`}
        </button>
      )}
    </div>
  )
}
