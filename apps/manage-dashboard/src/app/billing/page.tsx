'use client'

import { useState, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type BillingTab = 'daycare' | 'group' | 'individual'
type PaymentType = 'monthly' | 'quarterly' | 'semester' | 'yearly'

interface CourseInfo {
  id: string
  name: string
  subject?: string
  grade_level?: string
  fee_monthly?: number
  fee_quarterly?: number
  fee_semester?: number
  fee_yearly?: number
  course_type?: string
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

// 安親班相關
interface DaycareClass {
  id: string
  name: string
  fee_monthly: number
}

interface DaycareStudentRow {
  id: string
  full_name: string
  grade_level?: string
  payment_id?: string
  paid_amount?: number
  payment_date?: string
}

interface DaycareData {
  daycareClass: DaycareClass
  students: DaycareStudentRow[]
  stats: { total: number; paid: number; unpaid: number; overdue: number }
}

// 個指相關
interface IndividualStudent {
  id: string
  full_name: string
  grade_level?: string
  fee_per_session: number
  sessions_completed: number
  payment_id?: string
  paid_amount?: number
}

interface IndividualStats {
  total_amount: number
  paid_amount: number
  unpaid_amount: number
  overdue_amount: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DISCOUNT_LABELS: Record<PaymentType, { label: string; discount: string; color: string }> = {
  monthly: { label: '月費', discount: '原價', color: 'text-text-muted' },
  quarterly: { label: '季費', discount: '95折', color: 'text-blue-500' },
  semester: { label: '學期費', discount: '9折', color: 'text-green-500' },
  yearly: { label: '學年費', discount: '85折', color: 'text-purple-500' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonthOptions() {
  const opts = []
  for (let i = -1; i < 12; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() + i)
    opts.push({
      value: d.toISOString().substring(0, 7),
      label: `${d.getFullYear() - 1911}年${d.getMonth() + 1}月`,
    })
  }
  return opts
}

function twDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear() - 1911}/${d.getMonth() + 1}/${d.getDate()}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBar({ paid, unpaid, overdue }: { paid: number; unpaid: number; overdue: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-white rounded-xl border border-border p-3 text-center">
        <div className="text-2xl font-bold text-green-600">
          {paid > 999 ? `${(paid / 1000).toFixed(1)}k` : paid}
        </div>
        <div className="text-xs text-text-muted">已收（元）</div>
      </div>
      <div className="bg-white rounded-xl border border-border p-3 text-center">
        <div className="text-2xl font-bold text-orange-500">
          {unpaid > 999 ? `${(unpaid / 1000).toFixed(1)}k` : unpaid}
        </div>
        <div className="text-xs text-text-muted">未收（元）</div>
      </div>
      <div className="bg-white rounded-xl border border-border p-3 text-center">
        <div className="text-2xl font-bold text-red-500">
          {overdue > 999 ? `${(overdue / 1000).toFixed(1)}k` : overdue}
        </div>
        <div className="text-xs text-text-muted">逾期（元）</div>
      </div>
    </div>
  )
}

// ─── Daycare Tab ──────────────────────────────────────────────────────────────

function DaycareTab() {
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
  }, [selectedClassId, selectedMonth])

  const fetchClasses = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/w8/courses?limit=100&type=daycare', { credentials: 'include' })
      if (!res.ok) {
        // Fallback: get all courses and filter locally
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
          newAmt[s.id] = s.paid_amount || fee
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
      if (json.success) { showMsg(`✅ 成功建立 ${json.data.created} 筆繳費記錄`); fetchData() }
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

          {data.students.map(s => (
            <div
              key={s.id}
              className={`bg-white rounded-xl border p-3 flex items-center gap-3 ${
                s.payment_id ? 'border-green-200 bg-green-50' : 'border-border'
              }`}
            >
              <input
                type="checkbox"
                checked={selected[s.id] || false}
                onChange={e => setSelected({ ...selected, [s.id]: e.target.checked })}
                disabled={!!s.payment_id}
                className="w-4 h-4 text-primary"
              />
              <div className="flex-1">
                <div className="font-medium text-text text-sm">{s.full_name}</div>
                <div className="text-xs text-text-muted">{s.grade_level}</div>
              </div>
              {s.payment_id ? (
                <div className="text-right">
                  <div className="text-xs font-medium text-green-600">已繳 ${s.paid_amount?.toLocaleString()}</div>
                  {s.payment_date && (
                    <div className="text-xs text-text-muted">{twDate(s.payment_date)}</div>
                  )}
                </div>
              ) : (
                <input
                  type="number"
                  value={amounts[s.id] || 0}
                  onChange={e => setAmounts({ ...amounts, [s.id]: Number(e.target.value) })}
                  className="w-24 px-2 py-1 border border-border rounded text-right text-sm"
                  placeholder="金額"
                />
              )}
            </div>
          ))}
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

// ─── Group Tab ────────────────────────────────────────────────────────────────

function GroupTab() {
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
          newAmt[s.id] = s.paid_amount || defaultFee
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

  const getDefaultFee = (course: CourseInfo) => {
    switch (paymentType) {
      case 'monthly': return course.fee_monthly || 0
      case 'quarterly': return course.fee_quarterly || 0
      case 'semester': return course.fee_semester || 0
      case 'yearly': return course.fee_yearly || 0
    }
  }

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
      if (data.success) { showMsg(`✅ 成功建立 ${data.data.created} 筆繳費記錄`); fetchBilling() }
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
        <div className={`flex items-center gap-2 bg-white rounded-xl border border-border px-4 py-2 text-sm`}>
          <span className="text-text-muted">折扣方案</span>
          <span className={`font-bold ${disc.color}`}>{disc.discount}</span>
          {billingData && (
            <span className="text-text-muted ml-auto">
              每人 ${getDefaultFee(billingData.course).toLocaleString()}
            </span>
          )}
        </div>
      )}

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

          {billingData.students.map(student => (
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
                <div className="font-medium text-text text-sm">{student.full_name}</div>
                <div className="text-xs text-text-muted">{student.grade_level}</div>
              </div>
              {student.payment_id ? (
                <div className="text-right">
                  <div className="text-xs font-medium text-green-600">已繳 ${student.paid_amount?.toLocaleString()}</div>
                  <div className="text-xs text-text-muted">{student.payment_type}</div>
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

// ─── Individual Tab ───────────────────────────────────────────────────────────

function IndividualTab() {
  const [students, setStudents] = useState<IndividualStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [sessions, setSessions] = useState<Record<string, number>>({})
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7))
  const [stats, setStats] = useState<IndividualStats>({ total_amount: 0, paid_amount: 0, unpaid_amount: 0, overdue_amount: 0 })

  const monthOptions = getMonthOptions()

  useEffect(() => { fetchIndividual() }, [selectedMonth])

  const fetchIndividual = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/billing/individual?periodMonth=${selectedMonth}`,
        { credentials: 'include' }
      )
      if (!res.ok) {
        // Fallback: derive from courses API
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

  // Fallback: use courses API and mock session data
  const fetchIndividualFallback = async () => {
    try {
      const res = await fetch('/api/w8/courses?limit=100', { credentials: 'include' })
      const data = await res.json()
      const all: CourseInfo[] = data.data?.courses || []
      const indCourses = all.filter(c =>
        c.course_type === 'individual' || c.name.includes('個指') || c.name.includes('個別')
      )
      // For each individual course, fetch billing to get students
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
          return (
            <div
              key={s.id}
              className={`bg-white rounded-xl border p-3 ${
                s.payment_id ? 'border-green-200 bg-green-50' : 'border-border'
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
                <div className="flex-1">
                  <div className="font-medium text-text text-sm">{s.full_name}</div>
                  <div className="text-xs text-text-muted">{s.grade_level}</div>
                </div>
                {s.payment_id ? (
                  <div className="text-right">
                    <div className="text-xs font-medium text-green-600">已繳 ${s.paid_amount?.toLocaleString()}</div>
                  </div>
                ) : (
                  <div className="text-right text-sm font-bold text-text">
                    ${total.toLocaleString()}
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

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { key: BillingTab; label: string; icon: string }[] = [
  { key: 'daycare', label: '安親班', icon: '🏫' },
  { key: 'group', label: '團班', icon: '👥' },
  { key: 'individual', label: '個指', icon: '🎯' },
]

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<BillingTab>('group')

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <h1 className="text-xl font-bold text-text">💰 帳務管理</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface-hover rounded-xl p-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-primary shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'daycare' && <DaycareTab />}
      {activeTab === 'group' && <GroupTab />}
      {activeTab === 'individual' && <IndividualTab />}
    </div>
  )
}
