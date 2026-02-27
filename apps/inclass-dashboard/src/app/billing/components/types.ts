export interface ClassInfo {
  id: string
  name: string
  grade?: string
  feeMonthly?: number
  feeQuarterly?: number
  feeSemester?: number
  feeYearly?: number
}

export interface StudentBilling {
  id: string
  name: string
  grade?: string
  isPaid: boolean
  paymentRecord?: {
    id: string
    amount: number
    paymentType: string
    paymentDate: string
  }
}

export interface BillingData {
  class: ClassInfo
  periodMonth: string
  students: StudentBilling[]
  stats: {
    total: number
    paid: number
    unpaid: number
  }
}

export type PaymentType = 'monthly' | 'quarterly' | 'semester' | 'yearly'
