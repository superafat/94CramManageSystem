import type { TeacherSalary, AttendanceStats, AutoDeduction, AutoDeductionOverride, ScheduleItem } from './types'
import { LATE_DEDUCTION_PER_OCCURRENCE } from './constants'

// ───────────── Date Utilities ─────────────

export const getMonthRange = (offset: number = 0) => {
  const date = new Date()
  date.setMonth(date.getMonth() + offset)
  const year = date.getFullYear()
  const month = date.getMonth()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    label: `${year}年${month + 1}月`,
    year,
    month: month + 1,
  }
}

export const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export const formatTime = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toTimeString().slice(0, 5)
}

export const getWeekNumber = (dateStr: string): number => {
  const d = new Date(dateStr)
  const dayOfMonth = d.getDate()
  return Math.ceil(dayOfMonth / 7)
}

export const groupByWeek = (schedules: ScheduleItem[]) => {
  const weeks: Record<number, ScheduleItem[]> = {}
  for (const s of schedules) {
    const w = getWeekNumber(s.start_time)
    if (!weeks[w]) weeks[w] = []
    weeks[w].push(s)
  }
  return weeks
}

// ───────────── Auto-Deduction Logic ─────────────

export function computeAutoDeductions(
  teacher: TeacherSalary,
  attendance: AttendanceStats | null,
  overrides: Record<string, AutoDeductionOverride>
): AutoDeduction[] {
  if (!attendance) return []

  const baseSalary = Number(teacher.base_salary) || 0
  // Daily rate — used for absent and personal_leave; fallback for non-monthly types
  const dailyRate = teacher.salary_type === 'monthly' && baseSalary > 0
    ? Math.round(baseSalary / 30)
    : 0

  const results: AutoDeduction[] = []

  // 遲到
  const lateCount = attendance.late_count ?? 0
  if (lateCount > 0) {
    const unitAmt = teacher.salary_type === 'monthly' && baseSalary > 0
      ? Math.max(LATE_DEDUCTION_PER_OCCURRENCE, Math.round(dailyRate * 0.2))
      : LATE_DEDUCTION_PER_OCCURRENCE
    const id = 'auto_late'
    const ov = overrides[id]
    results.push({
      id,
      kind: 'late',
      label: `遲到 ×${lateCount}`,
      count: lateCount,
      unitAmount: unitAmt,
      totalAmount: unitAmt * lateCount,
      cancelled: ov?.cancelled ?? false,
      overrideAmount: ov?.overrideAmount ?? null,
    })
  }

  // 曠職 — 月薪才算日薪扣法；非月薪顯示但金額為 0
  const absentCount = attendance.absent_days ?? 0
  if (absentCount > 0) {
    const id = 'auto_absent'
    const ov = overrides[id]
    results.push({
      id,
      kind: 'absent',
      label: `曠職 ×${absentCount}`,
      count: absentCount,
      unitAmount: dailyRate,
      totalAmount: dailyRate * absentCount,
      cancelled: ov?.cancelled ?? false,
      overrideAmount: ov?.overrideAmount ?? null,
    })
  }

  // 事假 — 月薪才算日薪/2；非月薪顯示但金額為 0
  const personalCount = attendance.personal_leave_days ?? 0
  if (personalCount > 0) {
    const unitAmt = Math.round(dailyRate / 2)
    const id = 'auto_personal_leave'
    const ov = overrides[id]
    results.push({
      id,
      kind: 'personal_leave',
      label: `事假 ×${personalCount}`,
      count: personalCount,
      unitAmount: unitAmt,
      totalAmount: unitAmt * personalCount,
      cancelled: ov?.cancelled ?? false,
      overrideAmount: ov?.overrideAmount ?? null,
    })
  }

  return results
}

export function getEffectiveDeductionAmount(d: AutoDeduction): number {
  if (d.cancelled) return 0
  return d.overrideAmount !== null ? d.overrideAmount : d.totalAmount
}

export function autoDeductionSummaryLabel(d: AutoDeduction): string {
  const eff = getEffectiveDeductionAmount(d)
  return `${d.label} → -$${eff.toLocaleString()}`
}
