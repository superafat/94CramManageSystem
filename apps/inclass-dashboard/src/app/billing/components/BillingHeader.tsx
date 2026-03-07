'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { BillingData } from './types'

interface BillingHeaderProps {
  billingData: BillingData | null
}

const formatCurrency = (num?: number) => {
  if (num === undefined || num === null) return '-'
  return `$${num.toLocaleString()}`
}

export default function BillingHeader({ billingData }: BillingHeaderProps) {
  const router = useRouter()
  const { school } = useAuth()

  const feeCards = [
    { label: '月費', value: billingData?.class.feeMonthly },
    { label: '季費', value: billingData?.class.feeQuarterly },
    { label: '學期費', value: billingData?.class.feeSemester },
    { label: '學年費', value: billingData?.class.feeYearly },
  ]

  return (
    <>
      {/* Page title row */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">
            💰 學費繳費管理
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {school?.name}
          </p>
        </div>
        <button
          onClick={() => router.push('/main')}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          ← 返回首頁
        </button>
      </div>

      {/* Summary stats card — only shown when billing data is available */}
      {billingData && (
        <div className="mb-4 rounded-2xl bg-primary p-4 text-white shadow-sm">
          <div className="mb-3 text-base font-bold">
            📊 {billingData.class.name} - 學費設定
          </div>
          <div className="grid gap-2 text-sm md:grid-cols-4">
            {feeCards.map((card) => (
              <div key={card.label} className="rounded-xl bg-[rgba(255,255,255,0.2)] p-3 text-center">
                <div className="opacity-80">{card.label}</div>
                <div className="text-base font-bold">{formatCurrency(card.value)}</div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-[rgba(255,255,255,0.3)] pt-3">
            <div className="text-center">
              <div className="text-2xl font-bold">{billingData.stats.total}</div>
              <div className="text-xs opacity-80">總人數</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#D6F5D6]">{billingData.stats.paid}</div>
              <div className="text-xs opacity-80">已繳費</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#FFE1E6]">{billingData.stats.unpaid}</div>
              <div className="text-xs opacity-80">未繳費</div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
