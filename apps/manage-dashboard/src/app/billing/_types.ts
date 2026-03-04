// ─── Types ────────────────────────────────────────────────────────────────────

export type BillingTab = 'daycare' | 'group' | 'individual'
export type PaymentType = 'monthly' | 'quarterly' | 'semester' | 'yearly'
export type OverdueLevel = 'critical' | 'overdue' | 'pending' | null

export interface CourseInfo {
  id: string
  name: string
  subject?: string
  grade_level?: string
  fee_monthly?: number
  fee_quarterly?: number
  fee_semester?: number
  fee_yearly?: number
  fee_per_session?: number
  course_type?: string
}

export interface StudentBilling {
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

export interface BillingData {
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
export interface DaycareClass {
  id: string
  name: string
  fee_monthly: number
}

export interface DaycareStudentRow {
  id: string
  full_name: string
  grade_level?: string
  payment_id?: string
  paid_amount?: number
  payment_date?: string
  status?: string
  period_month?: string
}

export interface DaycareData {
  daycareClass: DaycareClass
  students: DaycareStudentRow[]
  stats: { total: number; paid: number; unpaid: number; overdue: number }
}

// 個指相關
export interface IndividualStudent {
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

export interface IndividualStats {
  total_amount: number
  paid_amount: number
  unpaid_amount: number
  overdue_amount: number
}

// 安親班套餐
export interface DaycarePackage {
  id: string
  name: string
  services: string[]
  price: number
  description?: string
  is_active: boolean
  branch_id?: string
}

// 遲繳相關
export interface OverdueStudent {
  id: string
  full_name: string
  grade_level?: string
  level: 'critical' | 'overdue' | 'pending'
  periodMonth: string
  overdueDays?: number
}
