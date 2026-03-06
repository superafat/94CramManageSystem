import type {
  TeacherSalary,
  AttendanceStats,
  AutoDeduction,
  AutoDeductionOverride,
  ScheduleItem,
  SalaryData,
  TeacherInsuranceConfig,
  TeacherInsurancePlan,
  TeacherSupplementalHealth,
} from './types'
import {
  HEALTH_TIERS,
  INSURANCE_TIER_LABEL_FALLBACK,
  LABOR_TIERS,
  LATE_DEDUCTION_PER_OCCURRENCE,
  SECOND_GEN_HEALTH_PREMIUM_THRESHOLD,
} from './constants'

export const emptyAttendanceStats = (teacherId: string): AttendanceStats => ({
  teacher_id: teacherId,
  attendance_days: 0,
  sick_leave_days: 0,
  personal_leave_days: 0,
  annual_leave_days: 0,
  family_leave_days: 0,
  other_leave_days: 0,
  absent_days: 0,
  late_count: 0,
  total_leave_days: 0,
  substitute_count: 0,
  attendance_rate: 0,
})

export const normalizeAttendanceStats = (teacherId: string, payload: unknown): AttendanceStats => {
  const source = isRecord(payload) && isRecord(payload.data)
    ? payload.data
    : isRecord(payload)
      ? payload
      : null

  const statsList = source && Array.isArray(source.stats)
    ? source.stats.filter(isRecord)
    : []

  const matched = statsList.find((item) => String(item.teacher_id ?? '') === teacherId)
  if (!matched) return emptyAttendanceStats(teacherId)

  return {
    teacher_id: teacherId,
    attendance_days: toNumber(matched.attendance_days, 0),
    sick_leave_days: toNumber(matched.sick_leave_days, 0),
    personal_leave_days: toNumber(matched.personal_leave_days, 0),
    annual_leave_days: toNumber(matched.annual_leave_days, 0),
    family_leave_days: toNumber(matched.family_leave_days, 0),
    other_leave_days: toNumber(matched.other_leave_days, 0),
    absent_days: toNumber(matched.absent_days, 0),
    late_count: toNumber(matched.late_count, 0),
    total_leave_days: toNumber(matched.total_leave_days, 0),
    substitute_count: toNumber(matched.substitute_count, 0),
    attendance_rate: toNumber(matched.attendance_rate, 0),
  }
}

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

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const toNumber = (value: unknown, fallback: number = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return toNumber(value, 0)
}

const normalizeInsurancePlan = (value: unknown): TeacherInsurancePlan => {
  if (!isRecord(value)) {
    return {
      enabled: false,
      tierLevel: 1,
      calculationMode: 'auto',
      manualPersonalAmount: null,
      manualEmployerAmount: null,
    }
  }

  return {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : false,
    tierLevel: value.tierLevel === null ? null : toNumber(value.tierLevel, 1),
    calculationMode: value.calculationMode === 'manual' ? 'manual' : 'auto',
    manualPersonalAmount: toNullableNumber(value.manualPersonalAmount),
    manualEmployerAmount: toNullableNumber(value.manualEmployerAmount),
  }
}

const normalizeSupplementalHealth = (value: unknown): TeacherSupplementalHealth => {
  if (!isRecord(value)) {
    return {
      employmentType: 'part_time',
      insuredThroughUnit: false,
      averageWeeklyHours: null,
      notes: null,
    }
  }

  return {
    employmentType: value.employmentType === 'full_time' ? 'full_time' : 'part_time',
    insuredThroughUnit: typeof value.insuredThroughUnit === 'boolean' ? value.insuredThroughUnit : false,
    averageWeeklyHours: toNullableNumber(value.averageWeeklyHours),
    notes: typeof value.notes === 'string' && value.notes.trim() !== '' ? value.notes.trim() : null,
  }
}

export const normalizeInsuranceConfig = (value: unknown): TeacherInsuranceConfig => {
  if (!isRecord(value)) {
    return {
      labor: normalizeInsurancePlan(null),
      health: normalizeInsurancePlan(null),
      supplementalHealth: normalizeSupplementalHealth(null),
    }
  }

  return {
    labor: normalizeInsurancePlan(value.labor),
    health: normalizeInsurancePlan(value.health),
    supplementalHealth: normalizeSupplementalHealth(value.supplementalHealth),
  }
}

const normalizeTeacherSalary = (teacher: unknown): TeacherSalary => {
  const source = isRecord(teacher) ? teacher : {}

  return {
    teacher_id: String(source.teacher_id ?? source.teacherId ?? ''),
    teacher_name: String(source.teacher_name ?? source.teacherName ?? ''),
    title: String(source.title ?? ''),
    teacher_role: typeof source.teacher_role === 'string' ? source.teacher_role : typeof source.teacherRole === 'string' ? source.teacherRole : undefined,
    salary_type: String(source.salary_type ?? source.salaryType ?? 'per_class'),
    rate_per_class: String(source.rate_per_class ?? source.ratePerClass ?? '0'),
    base_salary: String(source.base_salary ?? source.baseSalary ?? '0'),
    hourly_rate: String(source.hourly_rate ?? source.hourlyRate ?? '0'),
    total_classes: toNumber(source.total_classes ?? source.totalClasses, 0),
    total_hours: toNumber(source.total_hours ?? source.totalHours, 0),
    base_amount: toNumber(source.base_amount ?? source.baseAmount, 0),
    bonus_total: toNumber(source.bonus_total ?? source.bonusTotal, 0),
    deduction_total: toNumber(source.deduction_total ?? source.deductionTotal, 0),
    total_amount: toNumber(source.total_amount ?? source.totalAmount, 0),
    net_amount: toNumber(source.net_amount ?? source.netAmount ?? source.total_amount ?? source.totalAmount, 0),
    insurance_config: normalizeInsuranceConfig(source.insurance_config ?? source.insuranceConfig),
    labor_personal_amount: toNumber(source.labor_personal_amount ?? source.laborPersonalAmount, 0),
    labor_employer_amount: toNumber(source.labor_employer_amount ?? source.laborEmployerAmount, 0),
    health_personal_amount: toNumber(source.health_personal_amount ?? source.healthPersonalAmount, 0),
    health_employer_amount: toNumber(source.health_employer_amount ?? source.healthEmployerAmount, 0),
    personal_insurance_total: toNumber(source.personal_insurance_total ?? source.personalInsuranceTotal, 0),
    employer_insurance_total: toNumber(source.employer_insurance_total ?? source.employerInsuranceTotal, 0),
    supplemental_health_premium_amount: toNumber(
      source.supplemental_health_premium_amount ?? source.supplementalHealthPremiumAmount,
      0
    ),
    should_withhold_supplemental_health: Boolean(
      source.should_withhold_supplemental_health ?? source.shouldWithholdSupplementalHealth
    ),
    supplemental_health_threshold: toNumber(
      source.supplemental_health_threshold ?? source.supplementalHealthThreshold,
      SECOND_GEN_HEALTH_PREMIUM_THRESHOLD
    ),
    supplemental_health_rate: toNumber(source.supplemental_health_rate ?? source.supplementalHealthRate, 0),
    supplemental_health_reason: String(
      source.supplemental_health_reason ?? source.supplementalHealthReason ?? ''
    ),
    adjustments: Array.isArray(source.adjustments) ? source.adjustments.map((adjustment) => {
      const item = isRecord(adjustment) ? adjustment : {}
      return {
        id: String(item.id ?? `${item.type ?? 'adj'}-${item.name ?? 'item'}`),
        type: String(item.type ?? ''),
        name: String(item.name ?? ''),
        amount: String(item.amount ?? '0'),
        notes: typeof item.notes === 'string' ? item.notes : undefined,
      }
    }) : [],
  }
}

export const normalizeSalaryData = (value: unknown): SalaryData => {
  const source = isRecord(value) ? value : {}
  const teachersRaw = Array.isArray(source.teachers) ? source.teachers : []

  return {
    period: isRecord(source.period)
      ? {
          start: String(source.period.start ?? ''),
          end: String(source.period.end ?? ''),
        }
      : { start: '', end: '' },
    teachers: teachersRaw.map(normalizeTeacherSalary),
    grand_total_classes: toNumber(source.grand_total_classes ?? source.grandTotalClasses, 0),
    grand_total_amount: toNumber(source.grand_total_amount ?? source.grandTotalAmount, 0),
    grand_net_amount: toNumber(source.grand_net_amount ?? source.grandNetAmount ?? source.grand_total_amount ?? source.grandTotalAmount, 0),
    grand_personal_insurance_total: toNumber(source.grand_personal_insurance_total ?? source.grandPersonalInsuranceTotal, 0),
    grand_employer_insurance_total: toNumber(source.grand_employer_insurance_total ?? source.grandEmployerInsuranceTotal, 0),
    grand_supplemental_health_premium_amount: toNumber(
      source.grand_supplemental_health_premium_amount ?? source.grandSupplementalHealthPremiumAmount,
      0
    ),
  }
}

export const getTierLabel = (kind: 'labor' | 'health', tierLevel: number | null, enabled: boolean): string => {
  if (!enabled) return '未啟用'
  const tiers = kind === 'labor' ? LABOR_TIERS : HEALTH_TIERS
  const tier = tiers.find((item) => item.level === tierLevel)
  return tier?.label ?? INSURANCE_TIER_LABEL_FALLBACK
}
