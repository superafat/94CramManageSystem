'use client'

import { useState, useEffect } from 'react'

interface CourseInfo {
  id: string
  name: string
  subject?: string
  grade_level?: string
  fee_monthly?: number
  fee_quarterly?: number
  fee_semester?: number
  fee_yearly?: number
}

interface StudentBilling {
  id: string
  full_name: string
  grade_level?: string
  payment_id?: string
  paid_amount?: number
  payment_type?: string
  payment_date?: string
}

interface BillingData {
  course: CourseInfo
  periodMonth: string
  students: StudentBilling[]
  stats: {
    total: number
    paid: number
    unpaid: number
  }
}

export default function BillingPage() {
  const [courses, setCourses] = useState<CourseInfo[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7))
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  
  // 勾選狀態與實際金額
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [amounts, setAmounts] = useState<Record<string, number>>({})
  const [paymentType, setPaymentType] = useState<'monthly' | 'quarterly' | 'semester' | 'yearly'>('monthly')
  const [showFeeEditor, setShowFeeEditor] = useState(false)
  const [feeForm, setFeeForm] = useState({ feeMonthly: 0, feeQuarterly: 0, feeSemester: 0, feeYearly: 0 })

  const API_BASE = ''

  const getAuthHeaders = () => {
    return { 'Content-Type': 'application/json' }
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    if (selectedCourseId) {
      fetchBilling()
    }
  }, [selectedCourseId, selectedMonth])

  const fetchCourses = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/w8/courses?limit=100`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      if (!res.ok) {
        showMessage('❌ 讀取課程失敗')
        setLoading(false)
        return
      }
      const data = await res.json()
      setCourses(data.data?.courses || [])
      if (data.data?.courses?.length > 0) {
        setSelectedCourseId(data.data.courses[0].id)
      }
    } catch (e) {
      console.error(e)
      showMessage('❌ 讀取課程失敗')
    }
    setLoading(false)
  }

  const fetchBilling = async () => {
    if (!selectedCourseId) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/billing/course/${selectedCourseId}?periodMonth=${selectedMonth}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      const data = await res.json()
      if (data.success) {
        setBillingData(data.data)
        
        // 初始化勾選狀態（未繳費的預設勾選）與金額
        const newSelected: Record<string, boolean> = {}
        const newAmounts: Record<string, number> = {}
        const defaultFee = getDefaultFee(data.data.course)
        
        data.data.students.forEach((s: StudentBilling) => {
          newSelected[s.id] = !s.payment_id
          newAmounts[s.id] = s.paid_amount || defaultFee
        })
        
        setSelected(newSelected)
        setAmounts(newAmounts)
        
        // 初始化學費表單
        setFeeForm({
          feeMonthly: data.data.course.fee_monthly || 0,
          feeQuarterly: data.data.course.fee_quarterly || 0,
          feeSemester: data.data.course.fee_semester || 0,
          feeYearly: data.data.course.fee_yearly || 0
        })
      }
    } catch (e) {
      console.error(e)
      showMessage('❌ 讀取帳務失敗')
    }
    setLoading(false)
  }

  const getDefaultFee = (course: CourseInfo) => {
    switch (paymentType) {
      case 'monthly': return course.fee_monthly || 0
      case 'quarterly': return course.fee_quarterly || 0
      case 'semester': return course.fee_semester || 0
      case 'yearly': return course.fee_yearly || 0
    }
  }

  const handleSelectAll = () => {
    const allSelected = Object.values(selected).every(Boolean)
    const newSelected: Record<string, boolean> = {}
    billingData?.students.forEach((s: StudentBilling) => {
      newSelected[s.id] = !allSelected && !s.payment_id
    })
    setSelected(newSelected)
  }

  const handleSubmitBatch = async () => {
    if (!billingData) return
    
    const records = Object.entries(selected)
      .filter(([_, isSelected]) => isSelected)
      .map(([studentId]) => ({
        studentId,
        courseId: selectedCourseId,
        paymentType,
        amount: amounts[studentId] || getDefaultFee(billingData.course),
        periodMonth: selectedMonth,
        paymentDate: new Date().toISOString().split('T')[0]
      }))
    
    if (records.length === 0) {
      showMessage('請選擇至少一位學生')
      return
    }
    
    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/billing/payment-records/batch`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ records })
      })
      const data = await res.json()
      if (data.success) {
        showMessage(`✅ 成功建立 ${data.data.created} 筆繳費記錄`)
        fetchBilling()
      } else {
        showMessage('❌ 建立失敗：' + (data.error?.message || '未知錯誤'))
      }
    } catch (e) {
      console.error(e)
      showMessage('❌ 建立失敗')
    }
    setSubmitting(false)
  }

  const handleUpdateFees = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/courses/${selectedCourseId}/fees`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(feeForm)
      })
      const data = await res.json()
      if (data.success) {
        showMessage('✅ 學費設定已更新')
        setShowFeeEditor(false)
        fetchBilling()
      } else {
        showMessage('❌ 更新失敗')
      }
    } catch (e) {
      console.error(e)
      showMessage('❌ 更新失敗')
    }
  }

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  // Generate month options
  const monthOptions = []
  for (let i = -1; i < 12; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() + i)
    const value = d.toISOString().substring(0, 7)
    const label = `${d.getFullYear() - 1911}年${d.getMonth() + 1}月`
    monthOptions.push({ value, label })
  }

  if (loading && !billingData) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 w-32 bg-surface-hover animate-pulse rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-surface-hover animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">💰 繳費管理</h1>
        <button
          onClick={() => setShowFeeEditor(!showFeeEditor)}
          className="text-sm text-primary hover:underline"
        >
          {showFeeEditor ? '關閉學費設定' : '設定學費'}
        </button>
      </div>

      {/* Fee Editor */}
      {showFeeEditor && billingData && (
        <div className="bg-white rounded-xl border border-border p-4 space-y-3">
          <h3 className="font-medium text-text">📝 學費設定 - {billingData.course.name}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted">月費</label>
              <input
                type="number"
                value={feeForm.feeMonthly}
                onChange={e => setFeeForm({ ...feeForm, feeMonthly: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted">季費</label>
              <input
                type="number"
                value={feeForm.feeQuarterly}
                onChange={e => setFeeForm({ ...feeForm, feeQuarterly: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted">學期費</label>
              <input
                type="number"
                value={feeForm.feeSemester}
                onChange={e => setFeeForm({ ...feeForm, feeSemester: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted">學年費</label>
              <input
                type="number"
                value={feeForm.feeYearly}
                onChange={e => setFeeForm({ ...feeForm, feeYearly: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg"
              />
            </div>
          </div>
          <button
            onClick={handleUpdateFees}
            className="w-full py-2 bg-primary text-white rounded-lg font-medium"
          >
            儲存學費設定
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <select
          value={selectedCourseId}
          onChange={e => setSelectedCourseId(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg bg-white text-sm whitespace-nowrap"
        >
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg bg-white text-sm whitespace-nowrap"
        >
          {monthOptions.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        
        <select
          value={paymentType}
          onChange={e => setPaymentType(e.target.value as 'monthly' | 'quarterly' | 'semester' | 'yearly')}
          className="px-3 py-2 border border-border rounded-lg bg-white text-sm whitespace-nowrap"
        >
          <option value="monthly">月費</option>
          <option value="quarterly">季費</option>
          <option value="semester">學期費</option>
          <option value="yearly">學年費</option>
        </select>
      </div>

      {/* Stats */}
      {billingData && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-border p-3 text-center">
            <div className="text-2xl font-bold text-text">{billingData.stats.total}</div>
            <div className="text-xs text-text-muted">總人數</div>
          </div>
          <div className="bg-white rounded-xl border border-border p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{billingData.stats.paid}</div>
            <div className="text-xs text-text-muted">已繳費</div>
          </div>
          <div className="bg-white rounded-xl border border-border p-3 text-center">
            <div className="text-2xl font-bold text-orange-500">{billingData.stats.unpaid}</div>
            <div className="text-xs text-text-muted">待繳費</div>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm">
          {message}
        </div>
      )}

      {/* Student List */}
      {billingData && (
        <div className="space-y-2">
          {/* Select All */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-border p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Object.values(selected).every(Boolean)}
                onChange={handleSelectAll}
                className="w-4 h-4 text-primary"
              />
              <span className="font-medium">全選</span>
            </label>
            <span className="text-sm text-text-muted">
              已選 {Object.values(selected).filter(Boolean).length} 人
            </span>
          </div>

          {/* Students */}
          {billingData.students.map((student: StudentBilling) => (
            <div
              key={student.id}
              className={`bg-white rounded-xl border p-3 flex items-center gap-3 ${
                student.payment_id ? 'border-green-200 bg-green-50' : 'border-border'
              }`}
            >
              <input
                type="checkbox"
                checked={selected[student.id] || false}
                onChange={e => setSelected({ ...selected, [student.id]: e.target.checked })}
                disabled={!!student.payment_id}
                className="w-4 h-4 text-primary"
              />
              <div className="flex-1">
                <div className="font-medium text-text">{student.full_name}</div>
                <div className="text-xs text-text-muted">{student.grade_level}</div>
              </div>
              {student.payment_id ? (
                <div className="text-right">
                  <div className="text-sm font-medium text-green-600">已繳</div>
                  <div className="text-xs text-text-muted">${student.paid_amount}</div>
                </div>
              ) : (
                <input
                  type="number"
                  value={amounts[student.id] || 0}
                  onChange={e => setAmounts({ ...amounts, [student.id]: Number(e.target.value) })}
                  className="w-24 px-2 py-1 border border-border rounded text-right text-sm"
                  placeholder="金額"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Submit Button */}
      {billingData && Object.values(selected).some(Boolean) && (
        <button
          onClick={handleSubmitBatch}
          disabled={submitting}
          className="w-full py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50"
        >
          {submitting ? '處理中...' : `✅ 記錄已繳費 (${Object.values(selected).filter(Boolean).length}人)`}
        </button>
      )}
    </div>
  )
}
