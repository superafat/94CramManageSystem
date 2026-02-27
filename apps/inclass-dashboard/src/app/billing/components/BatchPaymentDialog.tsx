'use client'

interface BatchPaymentDialogProps {
  unpaidCount: number
  selectedCount: number
  submitting: boolean
  onBatchPay: () => void
}

export default function BatchPaymentDialog({
  unpaidCount,
  selectedCount,
  submitting,
  onBatchPay,
}: BatchPaymentDialogProps) {
  if (unpaidCount === 0) return null

  return (
    <button
      onClick={onBatchPay}
      disabled={submitting}
      style={{
        width: '100%',
        padding: '16px',
        borderRadius: 'var(--radius-md)',
        background: submitting ? 'var(--text-secondary)' : 'var(--accent)',
        color: 'white',
        border: 'none',
        fontSize: '18px',
        fontWeight: 'bold',
        cursor: submitting ? 'not-allowed' : 'pointer',
        boxShadow: 'var(--shadow-md)'
      }}
    >
      {submitting ? '處理中...' : `💳 批次繳費 (${selectedCount} 人)`}
    </button>
  )
}
