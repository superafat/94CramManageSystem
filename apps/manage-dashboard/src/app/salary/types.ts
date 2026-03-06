// ───────────── Types ─────────────

export interface SalaryAdjustment {
  id: string
  type: string
  name: string
  amount: string
  notes?: string
}

export type InsuranceCalculationMode = 'auto' | 'manual'
export type EmploymentType = 'full_time' | 'part_time'

export interface TeacherInsurancePlan {
  enabled: boolean
  tierLevel: number | null
  calculationMode: InsuranceCalculationMode
  manualPersonalAmount: number | null
  manualEmployerAmount: number | null
}

export interface TeacherSupplementalHealth {
  employmentType: EmploymentType
  insuredThroughUnit: boolean
  averageWeeklyHours: number | null
  notes: string | null
}

export interface TeacherInsuranceConfig {
  labor: TeacherInsurancePlan
  health: TeacherInsurancePlan
  supplementalHealth: TeacherSupplementalHealth
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
  net_amount: number
  insurance_config: TeacherInsuranceConfig
  labor_personal_amount: number
  labor_employer_amount: number
  health_personal_amount: number
  health_employer_amount: number
  personal_insurance_total: number
  employer_insurance_total: number
  supplemental_health_premium_amount: number
  should_withhold_supplemental_health: boolean
  supplemental_health_threshold: number
  supplemental_health_rate: number
  supplemental_health_reason: string
  adjustments: SalaryAdjustment[]
}

export interface SalaryData {
  period: { start: string; end: string }
  teachers: TeacherSalary[]
  grand_total_classes: number
  grand_total_amount: number
  grand_net_amount: number
  grand_personal_insurance_total: number
  grand_employer_insurance_total: number
  grand_supplemental_health_premium_amount: number
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
  attendance_days?: number
  sick_leave_days: number
  personal_leave_days: number
  annual_leave_days?: number
  family_leave_days?: number
  other_leave_days?: number
  absent_days: number
  late_count: number
  total_leave_days: number
  substitute_count?: number
  attendance_rate?: number
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
