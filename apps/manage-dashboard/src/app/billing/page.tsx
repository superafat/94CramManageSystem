'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type BillingTab = 'daycare' | 'group' | 'individual'
type PaymentType = 'monthly' | 'quarterly' | 'semester' | 'yearly'
type OverdueLevel = 'critical' | 'overdue' | 'pending' | null

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
  status?: string
  period_month?: string
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
  status?: string
  period_month?: string
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
  status?: string
  period_month?: string
}

interface IndividualStats {
  total_amount: number
  paid_amount: number
  unpaid_amount: number
  overdue_amount: number
}

// 遲繳相關
interface OverdueStudent {
  id: string
  full_name: string
  grade_level?: string
  level: 'critical' | 'overdue' | 'pending'
  periodMonth: string
  overdueDays?: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DISCOUNT_LABELS: Record<PaymentType, { label: string; discount: string; color: string }> = {
  monthly: { label: '月費', discount: '原價', color: 'text-text-muted' },
  quarterly: { label: '季費', discount: '95折', color: 'text-blue-500' },
  semester: { label: '學期費', discount: '9折', color: 'text-green-500' },
  yearly: { label: '學年費', discount: '85折', color: 'text-purple-500' },
}

// ─── Overdue Helpers ──────────────────────────────────────────────────────────

function getCurrentMonth(): string {
  return new Date().toISOString().substring(0, 7)
}

function getCurrentDay(): number {
  return new Date().getDate()
}

/**
 * 判斷遲繳等級
 * - status='unpaid' 且 period_month < 當前月 → 「嚴重遲繳」critical
 * - status='unpaid' 且 period_month = 當前月 且 今日 > 15 → 「遲繳」overdue
 * - status='pending' → 「處理中」pending
 * - 否則 null（不需標記）
 */
function getOverdueLevel(
  paymentId: string | undefined,
  status: string | undefined,
  periodMonth: string | undefined
): OverdueLevel {
  if (paymentId) return null

  const currentMonth = getCurrentMonth()
  const effectiveStatus = status || (paymentId ? 'paid' : 'unpaid')

  if (effectiveStatus === 'pending') return 'pending'

  if (effectiveStatus === 'unpaid' || !paymentId) {
    if (!periodMonth) return null
    if (periodMonth < currentMonth) return 'critical'
    if (periodMonth === currentMonth && getCurrentDay() > 15) return 'overdue'
  }

  return null
}

/**
 * 計算逾期天數
 */
function getOverdueDays(periodMonth: string | undefined): number {
  if (!periodMonth) return 0
  const currentMonth = getCurrentMonth()
  if (periodMonth >= currentMonth) return getCurrentDay() - 15 > 0 ? getCurrentDay() - 15 : 0

  // 計算從上月15日到今天的天數
  const [year, month] = periodMonth.split('-').map(Number)
  const dueDate = new Date(year, month - 1, 15)
  const today = new Date()
  const diff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

// ─── 價格記憶 ─────────────────────────────────────────────────────────────────

const PRICE_MEMORY_KEY = '94cram_billing_price_memory'

interface PriceMemory {
  [courseId: string]: {
    [studentId: string]: {
      amount: number
      paymentType: string
      updatedAt: string
    }
  }
}

function loadPriceMemory(): PriceMemory {
  try {
    const raw = localStorage.getItem(PRICE_MEMORY_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function savePriceMemoryBatch(records: Array<{ courseId: string; studentId: string; amount: number; paymentType: string }>) {
  const mem = loadPriceMemory()
  for (const r of records) {
    if (!mem[r.courseId]) mem[r.courseId] = {}
    mem[r.courseId][r.studentId] = { amount: r.amount, paymentType: r.paymentType, updatedAt: new Date().toISOString() }
  }
  localStorage.setItem(PRICE_MEMORY_KEY, JSON.stringify(mem))
}

function getLastPrice(courseId: string, studentId: string): { amount: number; paymentType: string } | null {
  const mem = loadPriceMemory()
  return mem[courseId]?.[studentId] || null
}

// ─── Overdue Badge ────────────────────────────────────────────────────────────

function OverdueBadge({ level, days }: { level: OverdueLevel; days?: number }) {
  if (!level) return null

  if (level === 'critical') {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
          嚴重遲繳
        </span>
        {days != null && days > 0 && (
          <span className="text-xs text-red-400">逾期 {days} 天</span>
        )}
      </div>
    )
  }
  if (level === 'overdue') {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
          遲繳
        </span>
        {days != null && days > 0 && (
          <span className="text-xs text-orange-400">逾期 {days} 天</span>
        )}
      </div>
    )
  }
  if (level === 'pending') {
    return (
      <span className="text-xs font-bold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
        處理中
      </span>
    )
  }
  return null
}

// ─── Reminder Button ──────────────────────────────────────────────────────────

function ReminderButton({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    setSending(true)
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ studentId, type: 'payment_reminder' }),
      })
      // Demo 模式：API 失敗時仍標記為已發送（local state）
      if (!res.ok) {
        console.warn(`催繳通知 API 失敗（demo 模式）：${studentName}`)
      }
      setSent(true)
      setTimeout(() => setSent(false), 3000)
    } catch {
      // Demo 模式相容：API 不存在時仍顯示已催繳
      setSent(true)
      setTimeout(() => setSent(false), 3000)
    }
    setSending(false)
  }

  if (sent) {
    return (
      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg border border-gray-200">
        ✅ 已催繳
      </span>
    )
  }

  return (
    <button
      onClick={handleSend}
      disabled={sending}
      className="text-xs text-orange-600 bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded-lg border border-orange-200 transition-colors disabled:opacity-50 whitespace-nowrap"
    >
      {sending ? '發送中...' : '📩 催繳'}
    </button>
  )
}

// ─── Overdue Banner ───────────────────────────────────────────────────────────

function OverdueBanner({ students }: { students: OverdueStudent[] }) {
  const [expanded, setExpanded] = useState(false)
  const [batchSending, setBatchSending] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{ sent: number; total: number } | null>(null)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  const criticalCount = students.filter(s => s.level === 'critical').length
  const overdueCount = students.filter(s => s.level === 'overdue').length
  const pendingCount = students.filter(s => s.level === 'pending').length

  const totalActionable = criticalCount + overdueCount

  if (students.length === 0) return null

  const handleBatchSend = async () => {
    if (!confirm(`確定要對 ${totalActionable} 位遲繳學生發送催繳通知嗎？`)) return

    const targets = students.filter(s => s.level === 'critical' || s.level === 'overdue')
    setBatchSending(true)
    setBatchProgress({ sent: 0, total: targets.length })

    const newSentIds = new Set(sentIds)
    for (let i = 0; i < targets.length; i++) {
      const s = targets[i]
      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ studentId: s.id, type: 'payment_reminder' }),
        })
      } catch {
        // Demo 模式相容
      }
      newSentIds.add(s.id)
      setSentIds(new Set(newSentIds))
      setBatchProgress({ sent: i + 1, total: targets.length })
    }

    setBatchSending(false)
    setTimeout(() => setBatchProgress(null), 3000)
  }

  return (
    <div className="rounded-xl border border-red-300 bg-red-50 overflow-hidden">
      {/* Banner Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-base">⚠️</span>
        <div className="flex-1 text-sm font-medium text-red-800">
          目前有{' '}
          {criticalCount > 0 && (
            <span className="font-bold text-red-700">{criticalCount} 筆嚴重遲繳</span>
          )}
          {criticalCount > 0 && overdueCount > 0 && <span>、</span>}
          {overdueCount > 0 && (
            <span className="font-bold text-orange-600">{overdueCount} 筆遲繳</span>
          )}
          {pendingCount > 0 && (criticalCount > 0 || overdueCount > 0) && <span>、</span>}
          {pendingCount > 0 && (
            <span className="font-bold text-yellow-700">{pendingCount} 筆處理中</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {totalActionable > 0 && (
            <button
              onClick={e => {
                e.stopPropagation()
                handleBatchSend()
              }}
              disabled={batchSending}
              className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
            >
              {batchSending
                ? batchProgress
                  ? `已發送 ${batchProgress.sent}/${batchProgress.total}`
                  : '發送中...'
                : '📩 一鍵催繳全部'}
            </button>
          )}
          <span className="text-red-600 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* 完成進度 */}
      {batchProgress && !batchSending && (
        <div className="px-4 pb-2 text-xs text-green-700 font-medium">
          ✅ 已發送 {batchProgress.sent} 筆催繳通知
        </div>
      )}

      {/* Expanded Student List */}
      {expanded && (
        <div className="border-t border-red-200 divide-y divide-red-100">
          {students.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 bg-white/50">
              <div className="flex-1">
                <div className="text-sm font-medium text-text">{s.full_name}</div>
                <div className="text-xs text-text-muted">
                  {s.grade_level && <span>{s.grade_level} · </span>}
                  <span>{s.periodMonth}</span>
                  {s.overdueDays != null && s.overdueDays > 0 && (
                    <span className="text-red-400"> · 逾期 {s.overdueDays} 天</span>
                  )}
                </div>
              </div>
              <OverdueBadge level={s.level} />
              {(s.level === 'critical' || s.level === 'overdue') && (
                sentIds.has(s.id) ? (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg border border-gray-200">
                    ✅ 已催繳
                  </span>
                ) : (
                  <ReminderButton studentId={s.id} studentName={s.full_name} />
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
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
