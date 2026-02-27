'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { ClassInfo, BillingData, PaymentType } from './components/types'
import BillingHeader from './components/BillingHeader'
import BillingFilters from './components/BillingFilters'
import StudentBillingTable from './components/StudentBillingTable'
import BatchPaymentDialog from './components/BatchPaymentDialog'

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
      setClasses(data.classes || [])
      if (data.classes?.length > 0) {
        setSelectedClassId(data.classes[0].id)
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
      setBillingData(data)

      // Initialise selection (unpaid pre-selected) and amounts
      const newSelected: Record<string, boolean> = {}
      const newAmounts: Record<string, number> = {}
      const defaultFee = getDefaultFeeForType(data.class, paymentType)

      data.students.forEach((s: { id: string; isPaid: boolean; paymentRecord?: { amount: number } }) => {
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
    return <div style={{ padding: '20px', textAlign: 'center' }}>載入中...</div>
  }

  if (!loading && classes.length === 0) {
    return (
      <main style={{ padding: '20px', textAlign: 'center', color: 'var(--text-primary)' }}>
        <h1 style={{ fontSize: '22px', color: 'var(--primary)', marginBottom: '8px' }}>💰 學費繳費管理</h1>
        <div style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>目前沒有可用班級，請先建立班級資料</div>
        <button
          onClick={fetchClasses}
          style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'white', border: 'none', fontSize: '13px', cursor: 'pointer' }}
        >
          重新載入
        </button>
      </main>
    )
  }

  return (
    <main style={{ padding: '16px', background: 'var(--background)', minHeight: '100vh', paddingBottom: '80px' }}>
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
        <div style={{ background: 'rgba(220,53,69,0.08)', border: '1px solid rgba(220,53,69,0.35)', color: 'var(--error)', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button
            onClick={() => (selectedClassId ? fetchBilling() : fetchClasses())}
            style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'white', border: 'none', fontSize: '12px', cursor: 'pointer' }}
          >
            重試
          </button>
        </div>
      )}

      {loading && classes.length > 0 && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '16px', border: '1px solid var(--border)', color: 'var(--text-secondary)', textAlign: 'center' }}>
          載入繳費資料中...
        </div>
      )}

      {!loading && !error && !billingData && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '16px', border: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-secondary)' }}>
          目前沒有可顯示的繳費資料，請確認月份或稍後重試。
        </div>
      )}

      {billingData && (
        <StudentBillingTable
          students={billingData.students}
          selected={selected}
          amounts={amounts}
          onToggleSelectAll={toggleSelectAll}
          onToggleStudent={(studentId, checked) => setSelected({ ...selected, [studentId]: checked })}
          onAmountChange={(studentId, amount) => setAmounts({ ...amounts, [studentId]: amount })}
        />
      )}

      {billingData && (
        <BatchPaymentDialog
          unpaidCount={billingData.stats.unpaid}
          selectedCount={Object.values(selected).filter(Boolean).length}
          submitting={submitting}
          onBatchPay={handleBatchPay}
        />
      )}

      {/* Toast Message */}
      {message && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(74, 74, 74, 0.9)',
          color: 'white',
          padding: '16px 32px',
          borderRadius: 'var(--radius-md)',
          fontSize: '16px',
          fontWeight: 'bold',
          zIndex: 200,
          boxShadow: 'var(--shadow-lg)'
        }}>
          {message}
        </div>
      )}
    </main>
  )
}
