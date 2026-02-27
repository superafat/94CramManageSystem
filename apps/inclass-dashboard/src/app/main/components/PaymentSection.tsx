'use client'

type PaymentType = 'monthly' | 'quarterly' | 'semester' | 'yearly'

interface ClassInfo {
  id: string
  name: string
  feeMonthly?: number
  feeQuarterly?: number
  feeSemester?: number
  feeYearly?: number
}

interface Student {
  id: string
  name: string
  grade?: string
  nfcId?: string
  classId?: string
}

const isPaymentType = (value: string): value is PaymentType =>
  value === 'monthly' || value === 'quarterly' || value === 'semester' || value === 'yearly'

interface PaymentSectionProps {
  paymentStudent: Student
  classes: ClassInfo[]
  selectedClass: string
  paymentType: PaymentType
  paymentAmount: number
  paymentDate: string
  paymentNotes: string
  submittingPayment: boolean
  onClose: () => void
  onClassChange: (classId: string) => void
  onPaymentTypeChange: (type: PaymentType) => void
  onAmountChange: (amount: number) => void
  onDateChange: (date: string) => void
  onNotesChange: (notes: string) => void
  onSubmit: () => void
}

export default function PaymentSection({
  paymentStudent,
  classes,
  selectedClass,
  paymentType,
  paymentAmount,
  paymentDate,
  paymentNotes,
  submittingPayment,
  onClose,
  onClassChange,
  onPaymentTypeChange,
  onAmountChange,
  onDateChange,
  onNotesChange,
  onSubmit,
}: PaymentSectionProps) {
  return (
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(74, 74, 74, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '24px', maxWidth: '400px', width: '100%', boxShadow: 'var(--shadow-lg)', border: '2px solid var(--border)', position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--error)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', color: 'white', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ×
        </button>
        <h3 style={{ fontSize: '20px', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '16px' }}>💰 繳費記錄</h3>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>學生</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)' }}>{paymentStudent.name}</div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>班級</div>
          <select
            value={selectedClass}
            onChange={(e) => onClassChange(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '14px' }}
          >
            {classes.map((c: ClassInfo) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>費用類型</div>
          <select
            value={paymentType}
            onChange={(e) => {
              if (isPaymentType(e.target.value)) onPaymentTypeChange(e.target.value)
            }}
            style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '14px' }}
          >
            <option value="monthly">月費</option>
            <option value="quarterly">季費</option>
            <option value="semester">學期費</option>
            <option value="yearly">學年費</option>
          </select>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>實收金額</div>
          <input
            type="number"
            value={paymentAmount}
            onChange={(e) => onAmountChange(Number(e.target.value))}
            style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '16px', fontWeight: 'bold' }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>繳費日期</div>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => onDateChange(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '14px' }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>備註（選填）</div>
          <input
            type="text"
            value={paymentNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="例如：減免、優惠..."
            style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '14px' }}
          />
        </div>

        <button
          onClick={onSubmit}
          disabled={submittingPayment}
          style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--accent)', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', opacity: submittingPayment ? 0.6 : 1 }}
        >
          {submittingPayment ? '處理中...' : '✅ 確認繳費'}
        </button>
      </div>
    </div>
  )
}
