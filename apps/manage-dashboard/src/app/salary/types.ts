// ───────────── Types ─────────────

export interface SalaryAdjustment {
  type: string
  name: string
  amount: string
}

export interface TeacherSalary {
  teacher_id: string
  teacher_name: string
  title: string
  teacher_role?: string
  salary_type: string
  rate_per_class: string
  base_salary: string
  hourly_rate: string
  total_classes: number
  total_hours?: number
  base_amount: number
  bonus_total: number
  deduction_total: number
  total_amount: number
  adjustments: SalaryAdjustment[]
}

export interface SalaryData {
  period: { start: string; end: string }
  teachers: TeacherSalary[]
  grand_total_classes: number
  grand_total_amount: number
}

export interface ScheduleItem {
  id: string
  teacher_id: string
  teacher_name?: string
  course_name: string
  start_time: string
  end_time: string
  duration_hours?: number
  status: string
  // Individual tutoring fields
  is_individual?: boolean
  per_session_fee?: number
}

export interface AttendanceStats {
  teacher_id: string
  sick_leave_days: number
  personal_leave_days: number
  absent_days: number
  late_count: number
  total_leave_days: number
}

// ───────────── Auto-Deduction Types ─────────────

export type AutoDeductionKind = 'late' | 'absent' | 'personal_leave'

export interface AutoDeduction {
  id: string
  kind: AutoDeductionKind
  label: string
  count: number
  unitAmount: number
  totalAmount: number
  cancelled: boolean
  overrideAmount: number | null  // null = use computed totalAmount
}

export interface AutoDeductionOverride {
  cancelled: boolean
  overrideAmount: number | null
}

// ───────────── Insurance Tier Type ─────────────

export interface InsuranceTier {
  level: number
  wage: number       // 投保薪資（元）
  label: string
}
