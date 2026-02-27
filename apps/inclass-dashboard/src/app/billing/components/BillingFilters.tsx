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
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '14px' }}>班級</label>
          <select
            value={selectedClassId}
            onChange={(e) => onClassChange(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '14px' }}
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '14px' }}>月份</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '14px' }}
          />
        </div>
      </div>

      {/* Payment type selector */}
      <div>
        <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '14px' }}>繳費類型</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['monthly', 'quarterly', 'semester', 'yearly'] as const).map(type => (
            <button
              key={type}
              onClick={() => onPaymentTypeChange(type)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                background: paymentType === type ? 'var(--primary)' : 'var(--background)',
                color: paymentType === type ? 'white' : 'var(--text-primary)',
                border: `2px solid ${paymentType === type ? 'var(--primary)' : 'var(--border)'}`,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {type === 'monthly' ? '月費' : type === 'quarterly' ? '季費' : type === 'semester' ? '學期費' : '學年費'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
