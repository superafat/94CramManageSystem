'use client'

import { StudentBilling } from './types'

interface StudentBillingTableProps {
  students: StudentBilling[]
  selected: Record<string, boolean>
  amounts: Record<string, number>
  selectedCount: number
  unpaidCount: number
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
  selectedCount,
  unpaidCount,
  onToggleSelectAll,
  onToggleStudent,
  onAmountChange,
}: StudentBillingTableProps) {
  return (
    <div className="mb-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-primary">
          👥 學生繳費狀態
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            已選取 {selectedCount} / {unpaidCount} 位未繳學生
          </p>
        </div>
        <button
          onClick={onToggleSelectAll}
          disabled={unpaidCount === 0}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          全選/取消
        </button>
      </div>

      {students.length === 0 ? (
        <div className="py-10 text-center text-text-muted">
          此班級尚無學生
        </div>
      ) : (
        <div className="max-h-[400px] overflow-y-auto">
          {students.map(student => (
            <div
              key={student.id}
              className={`flex flex-col gap-3 border-b border-border px-1 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between ${student.isPaid ? 'bg-[rgba(168,197,175,0.12)]' : ''}`}
            >
              <div className="flex items-center gap-3">
                {!student.isPaid && (
                  <input
                    type="checkbox"
                    checked={selected[student.id] || false}
                    onChange={(e) => onToggleStudent(student.id, e.target.checked)}
                    aria-label={`選取 ${student.name} 進行批次繳費`}
                    className="h-5 w-5 cursor-pointer rounded border-border text-primary focus:ring-primary/30"
                  />
                )}
                <div>
                  <div className="font-bold text-text">{student.name}</div>
                  <div className="text-xs text-text-muted">{student.grade || '-'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {student.isPaid ? (
                  <div className="text-right">
                    <span className="inline-flex rounded-md bg-success px-3 py-1.5 text-sm font-bold text-white">
                      ✅ 已繳 {formatCurrency(student.paymentRecord?.amount)}
                    </span>
                    {student.paymentRecord?.paymentDate && (
                      <div className="mt-1 text-xs text-text-muted">{student.paymentRecord.paymentDate}</div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <input
                      type="number"
                      value={amounts[student.id] || 0}
                      onChange={(e) => onAmountChange(student.id, Number(e.target.value))}
                      aria-label={`${student.name} 的繳費金額`}
                      className={`w-28 rounded-md border-2 bg-white px-3 py-2 text-right text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                        (amounts[student.id] || 0) <= 0 ? 'border-error' : 'border-border'
                      }`}
                      min="0"
                    />
                    {(amounts[student.id] || 0) <= 0 && (
                      <span className="text-xs text-error">請輸入有效金額</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
