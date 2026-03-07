'use client'

interface BatchPaymentDialogProps {
  unpaidCount: number
  selectedCount: number
  hasInvalidAmount: boolean
  submitting: boolean
  onBatchPay: () => void
}

export default function BatchPaymentDialog({
  unpaidCount,
  selectedCount,
  hasInvalidAmount,
  submitting,
  onBatchPay,
}: BatchPaymentDialogProps) {
  if (unpaidCount === 0) return null

  const isDisabled = submitting || selectedCount === 0 || hasInvalidAmount
  const helperText = hasInvalidAmount
    ? '請先修正金額為大於 0 的數值'
    : selectedCount === 0
      ? '請先選取至少一位未繳學生'
      : `準備為 ${selectedCount} 位學生建立繳費紀錄`

  return (
    <div className="sticky bottom-4 z-20 rounded-2xl border border-border bg-surface p-4 shadow-md backdrop-blur">
      <div className="mb-2 text-sm text-text-muted">{helperText}</div>
      <button
        onClick={onBatchPay}
        disabled={isDisabled}
        className="w-full rounded-xl bg-accent px-4 py-4 text-lg font-bold text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-text-muted disabled:opacity-70"
      >
        {submitting ? '處理中...' : `💳 批次繳費 (${selectedCount} 人)`}
      </button>
    </div>
  )
}
