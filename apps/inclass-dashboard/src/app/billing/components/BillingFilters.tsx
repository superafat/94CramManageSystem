'use client'

import { ClassInfo, PaymentType } from './types'

interface BillingFiltersProps {
  classes: ClassInfo[]
  selectedClassId: string
  selectedMonth: string
  paymentType: PaymentType
  onClassChange: (classId: string) => void
  onMonthChange: (month: string) => void
  onPaymentTypeChange: (type: PaymentType) => void
}

export default function BillingFilters({
  classes,
  selectedClassId,
  selectedMonth,
  paymentType,
  onClassChange,
  onMonthChange,
  onPaymentTypeChange,
}: BillingFiltersProps) {
  const [selectedYear = '', selectedMonthValue = ''] = selectedMonth.split('-')
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 5 }, (_, index) => String(currentYear - 2 + index))
  const monthOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'))

  const handleYearChange = (year: string) => {
    onMonthChange(`${year}-${selectedMonthValue || '01'}`)
  }

  const handleMonthValueChange = (month: string) => {
    onMonthChange(`${selectedYear || String(currentYear)}-${month}`)
  }

  return (
    <div className="mb-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-bold text-text">班級</label>
          <select
            value={selectedClassId}
            onChange={(e) => onClassChange(e.target.value)}
            aria-label="選擇班級"
            className="w-full rounded-md border-2 border-border bg-white px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-bold text-text">月份</label>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(e.target.value)}
              aria-label="選擇繳費年份"
              className="w-full rounded-md border-2 border-border bg-white px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year} 年</option>
              ))}
            </select>
            <select
              value={selectedMonthValue}
              onChange={(e) => handleMonthValueChange(e.target.value)}
              aria-label="選擇繳費月份"
              className="w-full rounded-md border-2 border-border bg-white px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>{Number(month)} 月</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Payment type selector */}
      <div>
        <label className="mb-1.5 block text-sm font-bold text-text">繳費類型</label>
        <div className="flex flex-wrap gap-2">
          {(['monthly', 'quarterly', 'semester', 'yearly'] as const).map(type => (
            <button
              key={type}
              onClick={() => onPaymentTypeChange(type)}
              type="button"
              className={`rounded-md border-2 px-4 py-2 text-sm font-medium transition ${
                paymentType === type
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-background text-text hover:bg-surface-hover'
              }`}
            >
              {type === 'monthly' ? '月費' : type === 'quarterly' ? '季費' : type === 'semester' ? '學期費' : '學年費'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
