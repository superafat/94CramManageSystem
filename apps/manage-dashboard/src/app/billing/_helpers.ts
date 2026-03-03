import type { OverdueLevel, PaymentType } from './_types'

// ─── Constants ────────────────────────────────────────────────────────────────

export const DISCOUNT_LABELS: Record<PaymentType, { label: string; discount: string; color: string }> = {
  monthly: { label: '月費', discount: '原價', color: 'text-text-muted' },
  quarterly: { label: '季費', discount: '95折', color: 'text-blue-500' },
  semester: { label: '學期費', discount: '9折', color: 'text-green-500' },
  yearly: { label: '學年費', discount: '85折', color: 'text-purple-500' },
}

// ─── Overdue Helpers ──────────────────────────────────────────────────────────

export function getCurrentMonth(): string {
  return new Date().toISOString().substring(0, 7)
}

export function getCurrentDay(): number {
  return new Date().getDate()
}

/**
 * 判斷遲繳等級
 * - status='unpaid' 且 period_month < 當前月 → 「嚴重遲繳」critical
 * - status='unpaid' 且 period_month = 當前月 且 今日 > 15 → 「遲繳」overdue
 * - status='pending' → 「處理中」pending
 * - 否則 null（不需標記）
 */
export function getOverdueLevel(
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
export function getOverdueDays(periodMonth: string | undefined): number {
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

export const PRICE_MEMORY_KEY = '94cram_billing_price_memory'

export interface PriceMemory {
  [courseId: string]: {
    [studentId: string]: {
      amount: number
      paymentType: string
      updatedAt: string
    }
  }
}

export function loadPriceMemory(): PriceMemory {
  try {
    const raw = localStorage.getItem(PRICE_MEMORY_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export function savePriceMemoryBatch(records: Array<{ courseId: string; studentId: string; amount: number; paymentType: string }>) {
  const mem = loadPriceMemory()
  for (const r of records) {
    if (!mem[r.courseId]) mem[r.courseId] = {}
    mem[r.courseId][r.studentId] = { amount: r.amount, paymentType: r.paymentType, updatedAt: new Date().toISOString() }
  }
  localStorage.setItem(PRICE_MEMORY_KEY, JSON.stringify(mem))
}

export function getLastPrice(courseId: string, studentId: string): { amount: number; paymentType: string } | null {
  const mem = loadPriceMemory()
  return mem[courseId]?.[studentId] || null
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

export function getMonthOptions() {
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

export function twDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear() - 1911}/${d.getMonth() + 1}/${d.getDate()}`
}
