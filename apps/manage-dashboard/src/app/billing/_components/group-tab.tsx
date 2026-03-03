'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CourseInfo, BillingData, PaymentType, OverdueStudent, StudentBilling } from '../_types'
import { getMonthOptions, getOverdueLevel, getOverdueDays, getLastPrice, savePriceMemoryBatch, DISCOUNT_LABELS } from '../_helpers'
import { OverdueBadge } from './overdue-badge'
import { ReminderButton } from './reminder-button'
import { OverdueBanner } from './overdue-banner'
import { StatBar } from './stat-bar'

export function GroupTab() {
  const [courses, setCourses] = useState<CourseInfo[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7))
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [amounts, setAmounts] = useState<Record<string, number>>({})
  const [paymentType, setPaymentType] = useState<PaymentType>('monthly')
  const [showFeeEditor, setShowFeeEditor] = useState(false)
  const [feeForm, setFeeForm] = useState({ feeMonthly: 0, feeQuarterly: 0, feeSemester: 0, feeYearly: 0 })

  const monthOptions = getMonthOptions()

  useEffect(() => { fetchCourses() }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (selectedCourseId) fetchBilling() }, [selectedCourseId, selectedMonth])

  const fetchCourses = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/w8/courses?limit=100', { credentials: 'include' })
      if (!res.ok) { showMsg('❌ 讀取課程失敗'); setLoading(false); return }
      const data = await res.json()
      const all: CourseInfo[] = data.data?.courses || []
      setCourses(all)
      if (all.length > 0) setSelectedCourseId(all[0].id)
    } catch (e) { console.error(e); showMsg('❌ 讀取課程失敗') }
    setLoading(false)
  }

  const fetchBilling = async () => {
    if (!selectedCourseId) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/billing/course/${selectedCourseId}?periodMonth=${selectedMonth}`,
        { credentials: 'include' }
      )
      const data = await res.json()
      if (data.success) {
        setBillingData(data.data)
        const newSel: Record<string, boolean> = {}
        const newAmt: Record<string, number> = {}
        const defaultFee = getDefaultFee(data.data.course)
        data.data.students.forEach((s: StudentBilling) => {
          newSel[s.id] = !s.payment_id
          const remembered = getLastPrice(selectedCourseId, s.id)
          newAmt[s.id] = s.paid_amount || (remembered?.amount ?? defaultFee)
        })
        setSelected(newSel)
        setAmounts(newAmt)
        setFeeForm({
          feeMonthly: data.data.course.fee_monthly || 0,
          feeQuarterly: data.data.course.fee_quarterly || 0,
          feeSemester: data.data.course.fee_semester || 0,
          feeYearly: data.data.course.fee_yearly || 0,
        })
      }
    } catch (e) { console.error(e); showMsg('❌ 讀取帳務失敗') }
    setLoading(false)
  }

  const getDefaultFee = useCallback((course: CourseInfo) => {
    switch (paymentType) {
      case 'monthly': return course.fee_monthly || 0
      case 'quarterly': return course.fee_quarterly || 0
      case 'semester': return course.fee_semester || 0
      case 'yearly': return course.fee_yearly || 0
    }
  }, [paymentType])

  const handleSelectAll = () => {
    const all = Object.values(selected).every(Boolean)
    const newSel: Record<string, boolean> = {}
    billingData?.students.forEach(s => { newSel[s.id] = !all && !s.payment_id })
    setSelected(newSel)
  }

  const handleSubmitBatch = async () => {
    if (!billingData) return
    const records = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([studentId]) => ({
        studentId,
        courseId: selectedCourseId,
        paymentType,
        amount: amounts[studentId] || getDefaultFee(billingData.course),
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
      const data = await res.json()
      if (data.success) {
        savePriceMemoryBatch(records)
        showMsg(`✅ 成功建立 ${data.data.created} 筆繳費記錄`)
        fetchBilling()
      }
      else showMsg('❌ 建立失敗：' + (data.error?.message || '未知錯誤'))
    } catch (e) { console.error(e); showMsg('❌ 建立失敗') }
    setSubmitting(false)
  }

  const handleUpdateFees = async () => {
    try {
      const res = await fetch(`/api/admin/courses/${selectedCourseId}/fees`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(feeForm),
      })
      const data = await res.json()
      if (data.success) { showMsg('✅ 學費設定已更新'); setShowFeeEditor(false); fetchBilling() }
      else showMsg('❌ 更新失敗')
    } catch (e) { console.error(e); showMsg('❌ 更新失敗') }
  }

  const showMsg = (m: string) => { setMessage(m); setTimeout(() => setMessage(''), 3000) }

  const disc = DISCOUNT_LABELS[paymentType]

  // 計算遲繳學生清單
  const overdueStudents: OverdueStudent[] = (billingData?.students || [])
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

  // Compute group stats as amounts
  const groupStats = billingData
    ? {
        paid: billingData.students.filter(s => s.payment_id).reduce((a, s) => a + (s.paid_amount || 0), 0),
        unpaid: billingData.students.filter(s => !s.payment_id).length * getDefaultFee(billingData.course),
        overdue: 0,
      }
    : null

  if (loading && !billingData) {
    return <div className="py-8 text-center text-text-muted text-sm">讀取中...</div>
  }

  return (
    <div className="space-y-4">
      {/* Fee Editor */}
      {showFeeEditor && billingData && (
        <div className="bg-white rounded-xl border border-border p-4 space-y-3">
          <h3 className="font-medium text-text text-sm">📝 學費設定 — {billingData.course.name}</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '月費', key: 'feeMonthly' as const },
              { label: '季費（95折）', key: 'feeQuarterly' as const },
              { label: '學期費（9折）', key: 'feeSemester' as const },
              { label: '學年費（85折）', key: 'feeYearly' as const },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="text-xs text-text-muted">{label}</label>
                <input
                  type="number"
                  value={feeForm[key]}
                  onChange={e => setFeeForm({ ...feeForm, [key]: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
              </div>
            ))}
          </div>
          <button onClick={handleUpdateFees} className="w-full py-2 bg-primary text-white rounded-lg font-medium text-sm">
            儲存學費設定
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 items-center">
        <select
          value={selectedCourseId}
          onChange={e => setSelectedCourseId(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg bg-white text-sm"
        >
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
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
        <select
          value={paymentType}
          onChange={e => setPaymentType(e.target.value as PaymentType)}
          className="px-3 py-2 border border-border rounded-lg bg-white text-sm"
        >
          {(Object.keys(DISCOUNT_LABELS) as PaymentType[]).map(k => (
            <option key={k} value={k}>{DISCOUNT_LABELS[k].label}</option>
          ))}
        </select>
        <button
          onClick={() => setShowFeeEditor(!showFeeEditor)}
          className="text-xs text-primary hover:underline whitespace-nowrap"
        >
          {showFeeEditor ? '關閉' : '設定學費'}
        </button>
      </div>

      {/* Discount badge */}
      {paymentType !== 'monthly' && (
        <div className="flex items-center gap-2 bg-white rounded-xl border border-border px-4 py-2 text-sm">
          <span className="text-text-muted">折扣方案</span>
          <span className={`font-bold ${disc.color}`}>{disc.discount}</span>
          {billingData && (
            <span className="text-text-muted ml-auto">
              每人 ${getDefaultFee(billingData.course).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* Overdue Banner */}
      {overdueStudents.length > 0 && <OverdueBanner students={overdueStudents} />}

      {/* Stats */}
      {groupStats && (
        <StatBar paid={groupStats.paid} unpaid={groupStats.unpaid} overdue={groupStats.overdue} />
      )}

      {/* Message */}
      {message && (
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm">{message}</div>
      )}

      {/* Student List */}
      {billingData && (
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-white rounded-xl border border-border p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Object.values(selected).every(Boolean)}
                onChange={handleSelectAll}
                className="w-4 h-4 text-primary"
              />
              <span className="font-medium text-sm">全選</span>
            </label>
            <span className="text-xs text-text-muted">
              已選 {Object.values(selected).filter(Boolean).length} 人
            </span>
          </div>

          {billingData.students.map(student => {
            const overdueLevel = getOverdueLevel(student.payment_id, student.status, student.period_month || selectedMonth)
            const overdueDays = overdueLevel && overdueLevel !== 'pending'
              ? getOverdueDays(student.period_month || selectedMonth)
              : undefined

            return (
              <div
                key={student.id}
                className={`bg-white rounded-xl border p-3 flex items-center gap-3 ${
                  student.payment_id
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
                  checked={selected[student.id] || false}
                  onChange={e => setSelected({ ...selected, [student.id]: e.target.checked })}
                  disabled={!!student.payment_id}
                  className="w-4 h-4 text-primary"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text text-sm">{student.full_name}</div>
                  <div className="text-xs text-text-muted">{student.grade_level}</div>
                  {overdueDays != null && overdueDays > 0 && (
                    <div className="text-xs text-red-400 mt-0.5">逾期 {overdueDays} 天</div>
                  )}
                </div>
                {student.payment_id ? (
                  <div className="text-right">
                    <div className="text-xs font-medium text-green-600">已繳 ${student.paid_amount?.toLocaleString()}</div>
                    <div className="text-xs text-text-muted">{student.payment_type}</div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {overdueLevel && <OverdueBadge level={overdueLevel} />}
                    {(overdueLevel === 'critical' || overdueLevel === 'overdue') && (
                      <ReminderButton studentId={student.id} studentName={student.full_name} />
                    )}
                    <div className="flex flex-col items-end gap-0.5">
                      <input
                        type="number"
                        value={amounts[student.id] || 0}
                        onChange={e => setAmounts({ ...amounts, [student.id]: Number(e.target.value) })}
                        className="w-24 px-2 py-1 border border-border rounded text-right text-sm"
                        placeholder="金額"
                      />
                      {!student.payment_id && (() => { const lp = getLastPrice(selectedCourseId, student.id); return lp ? <span className="text-xs text-text-muted">上次: NT${lp.amount.toLocaleString()}</span> : null })()}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Submit */}
      {billingData && Object.values(selected).some(Boolean) && (
        <button
          onClick={handleSubmitBatch}
          disabled={submitting}
          className="w-full py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50"
        >
          {submitting ? '處理中...' : `✅ 記錄已繳費（${Object.values(selected).filter(Boolean).length}人）`}
        </button>
      )}
    </div>
  )
}
