'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { ClassInfo, BillingData, PaymentType } from './components/types'
import BillingHeader from './components/BillingHeader'
import BillingFilters from './components/BillingFilters'
import StudentBillingTable from './components/StudentBillingTable'
import BatchPaymentDialog from './components/BatchPaymentDialog'

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null ? value as UnknownRecord : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

function unwrapPayload<T extends UnknownRecord>(value: unknown): T {
  const record = asRecord(value)
  return ('data' in record ? asRecord(record.data) : record) as T
}

function normalizeClasses(value: unknown): ClassInfo[] {
  const payload = unwrapPayload<{ classes?: unknown }>(value)
  return asArray(payload.classes).map((entry) => {
    const classInfo = asRecord(entry)
    return {
      id: asString(classInfo.id),
      name: asString(classInfo.name, '未命名班級'),
      grade: asString(classInfo.grade) || undefined,
      feeMonthly: asNumber(classInfo.feeMonthly, 0),
      feeQuarterly: asNumber(classInfo.feeQuarterly, 0),
      feeSemester: asNumber(classInfo.feeSemester, 0),
      feeYearly: asNumber(classInfo.feeYearly, 0),
    }
  })
}

function normalizeBillingData(value: unknown): BillingData {
  const record = asRecord(value)
  const billing = asRecord(record.billing)
  const course = asRecord(record.class ?? billing.course)
  const students = asArray(record.students).map((entry) => {
    const student = asRecord(entry)
    const paymentRecord = asRecord(student.paymentRecord)
    const hasPaymentRecord = Object.keys(paymentRecord).length > 0

    return {
      id: asString(student.id),
      name: asString(student.name, '未命名學生'),
      grade: asString(student.grade) || undefined,
      isPaid: Boolean(student.isPaid),
      paymentRecord: hasPaymentRecord
        ? {
            id: asString(paymentRecord.id),
            amount: asNumber(paymentRecord.amount, 0),
            paymentType: asString(paymentRecord.paymentType),
            paymentDate: asString(paymentRecord.paymentDate),
          }
        : undefined,
    }
  })

  return {
    class: {
      id: asString(course.id),
      name: asString(course.name, '未命名班級'),
      grade: asString(course.grade) || undefined,
      feeMonthly: asNumber(course.feeMonthly, 0),
      feeQuarterly: asNumber(course.feeQuarterly, 0),
      feeSemester: asNumber(course.feeSemester, 0),
      feeYearly: asNumber(course.feeYearly, 0),
    },
    periodMonth: asString(record.periodMonth, ''),
    students,
    stats: {
      total: asNumber(record.stats && asRecord(record.stats).total, asNumber(billing.totalEnrolled, students.length)),
      paid: asNumber(record.stats && asRecord(record.stats).paid, asNumber(billing.totalPaid, students.filter((student) => student.isPaid).length)),
      unpaid: asNumber(record.stats && asRecord(record.stats).unpaid, asNumber(billing.totalUnpaid, students.filter((student) => !student.isPaid).length)),
    },
  }
}

function getPaymentTypeLabel(type: PaymentType): string {
  switch (type) {
    case 'monthly':
      return '月費'
    case 'quarterly':
      return '季費'
    case 'semester':
      return '學期費'
    case 'yearly':
      return '學年費'
    default:
      return '月費'
  }
}

export default function BillingPage() {
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7))
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Selection state and per-student amounts
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [amounts, setAmounts] = useState<Record<string, number>>({})
  const [paymentType, setPaymentType] = useState<PaymentType>('monthly')

  const unpaidStudents = billingData?.students.filter((student) => !student.isPaid) ?? []
  const selectedUnpaidStudents = unpaidStudents.filter((student) => selected[student.id])
  const invalidAmountStudents = selectedUnpaidStudents.filter((student) => (amounts[student.id] || 0) <= 0)
  const selectedUnpaidCount = selectedUnpaidStudents.length

  useEffect(() => {
    fetchClasses()
  }, [])

  useEffect(() => {
    if (selectedClassId) {
      fetchBilling()
    }
  }, [selectedClassId, selectedMonth])

  const fetchClasses = async () => {
    setError('')
    setLoading(true)
    try {
      const data = await api.getClasses()
      const normalizedClasses = normalizeClasses(data)
      setClasses(normalizedClasses)
      if (normalizedClasses.length > 0) {
        setSelectedClassId(normalizedClasses[0].id)
      } else {
        setSelectedClassId('')
        setBillingData(null)
      }
    } catch (e) {
      console.error(e)
      setError('讀取班級失敗，請稍後再試')
      showMessage('❌ 讀取班級失敗')
    }
    setLoading(false)
  }

  const fetchBilling = async () => {
    if (!selectedClassId) return
    setError('')
    setLoading(true)
    try {
      const data = await api.getClassBilling(selectedClassId, selectedMonth)
      const normalizedBillingData = normalizeBillingData(data)
      setBillingData(normalizedBillingData)

      // Initialise selection (unpaid pre-selected) and amounts
      const newSelected: Record<string, boolean> = {}
      const newAmounts: Record<string, number> = {}
      const defaultFee = getDefaultFeeForType(normalizedBillingData.class, paymentType)

      normalizedBillingData.students.forEach((s: { id: string; isPaid: boolean; paymentRecord?: { amount: number } }) => {
        newSelected[s.id] = !s.isPaid
        newAmounts[s.id] = s.paymentRecord?.amount || defaultFee
      })

      setSelected(newSelected)
      setAmounts(newAmounts)
    } catch (e) {
      console.error(e)
      setBillingData(null)
      setError('讀取繳費資料失敗，請稍後再試')
      showMessage('❌ 讀取繳費資料失敗')
    }
    setLoading(false)
  }

  const getDefaultFeeForType = (classInfo: ClassInfo, type: PaymentType): number => {
    switch (type) {
      case 'monthly': return classInfo.feeMonthly || 0
      case 'quarterly': return classInfo.feeQuarterly || 0
      case 'semester': return classInfo.feeSemester || 0
      case 'yearly': return classInfo.feeYearly || 0
      default: return classInfo.feeMonthly || 0
    }
  }

  const handlePaymentTypeChange = (type: PaymentType) => {
    setPaymentType(type)
    if (billingData) {
      const defaultFee = getDefaultFeeForType(billingData.class, type)
      const newAmounts = { ...amounts }
      billingData.students.forEach(s => {
        if (!s.isPaid) {
          newAmounts[s.id] = defaultFee
        }
      })
      setAmounts(newAmounts)
    }
  }

  const handleBatchPay = async () => {
    if (!billingData) return

    const selectedStudents = billingData.students.filter(s => selected[s.id] && !s.isPaid)
    if (selectedStudents.length === 0) {
      return showMessage('❌ 請先勾選要繳費的學生')
    }

    if (selectedStudents.some((student) => (amounts[student.id] || 0) <= 0)) {
      return showMessage(`❌ 請先填寫有效的${getPaymentTypeLabel(paymentType)}金額`)
    }

    const today = new Date().toISOString().split('T')[0]
    const records = selectedStudents.map(s => ({
      studentId: s.id,
      classId: selectedClassId,
      paymentType,
      amount: amounts[s.id] || 0,
      periodMonth: selectedMonth,
      paymentDate: today,
    }))

    setSubmitting(true)
    try {
      await api.createPaymentRecordsBatch(records)
      showMessage(`✅ 成功為 ${records.length} 位學生繳費！`)
      fetchBilling()
    } catch (e) {
      showMessage(`❌ ${e instanceof Error ? e.message : '繳費失敗'}`)
    }
    setSubmitting(false)
  }

  const toggleSelectAll = () => {
    if (!billingData) return
    const unpaidStudents = billingData.students.filter(s => !s.isPaid)
    const allSelected = unpaidStudents.every(s => selected[s.id])
    const newSelected = { ...selected }
    unpaidStudents.forEach(s => {
      newSelected[s.id] = !allSelected
    })
    setSelected(newSelected)
  }

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  if (loading && classes.length === 0) {
    return <div className="px-5 py-10 text-center text-text-muted">載入中...</div>
  }

  if (!loading && classes.length === 0) {
    return (
      <main className="px-5 py-10 text-center text-text">
        <h1 className="mb-2 text-2xl font-bold text-primary">💰 學費繳費管理</h1>
        <div className="mb-3 text-text-muted">目前沒有可用班級，請先建立班級資料</div>
        <button
          onClick={fetchClasses}
          className="rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          重新載入
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-20">
      <BillingHeader billingData={billingData} />

      <BillingFilters
        classes={classes}
        selectedClassId={selectedClassId}
        selectedMonth={selectedMonth}
        paymentType={paymentType}
        onClassChange={setSelectedClassId}
        onMonthChange={setSelectedMonth}
        onPaymentTypeChange={handlePaymentTypeChange}
      />

      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[rgba(220,53,69,0.35)] bg-[rgba(220,53,69,0.08)] p-3 text-error">
          <span>{error}</span>
          <button
            onClick={() => (selectedClassId ? fetchBilling() : fetchClasses())}
            className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
          >
            重試
          </button>
        </div>
      )}

      {loading && classes.length > 0 && (
        <div className="mb-4 rounded-xl border border-border bg-surface p-3 text-center text-text-muted shadow-sm">
          載入繳費資料中...
        </div>
      )}

      {!loading && !error && !billingData && (
        <div className="mb-4 rounded-xl border border-border bg-surface p-4 text-center text-text-muted shadow-sm">
          目前沒有可顯示的繳費資料，請確認月份或稍後重試。
        </div>
      )}

      {billingData && !loading && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-text">本次批次設定</div>
            <div className="mt-1 text-sm text-text-muted">
              {billingData.class.name} ・ {selectedMonth} ・ {getPaymentTypeLabel(paymentType)}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm md:min-w-[320px]">
            <div className="rounded-xl bg-background px-3 py-2">
              <div className="text-xs text-text-muted">未繳學生</div>
              <div className="mt-1 text-lg font-semibold text-text">{unpaidStudents.length}</div>
            </div>
            <div className="rounded-xl bg-background px-3 py-2">
              <div className="text-xs text-text-muted">已選取</div>
              <div className="mt-1 text-lg font-semibold text-primary">{selectedUnpaidCount}</div>
            </div>
            <div className="rounded-xl bg-background px-3 py-2">
              <div className="text-xs text-text-muted">待修正金額</div>
              <div className="mt-1 text-lg font-semibold text-error">{invalidAmountStudents.length}</div>
            </div>
          </div>
        </div>
      )}

      {billingData && (
        <StudentBillingTable
          students={billingData.students}
          selected={selected}
          amounts={amounts}
          selectedCount={selectedUnpaidCount}
          unpaidCount={unpaidStudents.length}
          onToggleSelectAll={toggleSelectAll}
          onToggleStudent={(studentId, checked) => setSelected({ ...selected, [studentId]: checked })}
          onAmountChange={(studentId, amount) => setAmounts({ ...amounts, [studentId]: amount })}
        />
      )}

      {billingData && (
        <BatchPaymentDialog
          unpaidCount={billingData.stats.unpaid}
          selectedCount={selectedUnpaidCount}
          hasInvalidAmount={invalidAmountStudents.length > 0}
          submitting={submitting}
          onBatchPay={handleBatchPay}
        />
      )}

      {/* Toast Message */}
      {message && (
        <div className="fixed left-1/2 top-1/2 z-[200] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[rgba(74,74,74,0.9)] px-8 py-4 text-base font-bold text-white shadow-lg">
          {message}
        </div>
      )}
    </main>
  )
}
