'use client'

import { StudentBilling } from './types'

interface StudentBillingTableProps {
  students: StudentBilling[]
  selected: Record<string, boolean>
  amounts: Record<string, number>
  onToggleSelectAll: () => void
  onToggleStudent: (studentId: string, checked: boolean) => void
  onAmountChange: (studentId: string, amount: number) => void
}

const formatCurrency = (num?: number) => {
  if (num === undefined || num === null) return '-'
  return `$${num.toLocaleString()}`
}

export default function StudentBillingTable({
  students,
  selected,
  amounts,
  onToggleSelectAll,
  onToggleStudent,
  onAmountChange,
}: StudentBillingTableProps) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '18px', color: 'var(--primary)', fontWeight: 'bold', margin: 0 }}>
          👥 學生繳費狀態
        </h2>
        <button
          onClick={onToggleSelectAll}
          style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: 'white', border: 'none', fontSize: '12px', cursor: 'pointer' }}
        >
          全選/取消
        </button>
      </div>

      {students.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          此班級尚無學生
        </div>
      ) : (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {students.map(student => (
            <div
              key={student.id}
              style={{
                padding: '12px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: student.isPaid ? 'rgba(144, 238, 144, 0.1)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {!student.isPaid && (
                  <input
                    type="checkbox"
                    checked={selected[student.id] || false}
                    onChange={(e) => onToggleStudent(student.id, e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                )}
                <div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{student.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{student.grade || '-'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {student.isPaid ? (
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--success)',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}>
                    ✅ 已繳 {formatCurrency(student.paymentRecord?.amount)}
                  </span>
                ) : (
                  <input
                    type="number"
                    value={amounts[student.id] || 0}
                    onChange={(e) => onAmountChange(student.id, Number(e.target.value))}
                    style={{
                      width: '100px',
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      border: '2px solid var(--border)',
                      fontSize: '14px',
                      textAlign: 'right'
                    }}
                    min="0"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
