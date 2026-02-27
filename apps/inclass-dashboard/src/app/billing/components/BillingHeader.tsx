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

  return (
    <>
      {/* Page title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: 'var(--primary)', margin: 0 }}>
            💰 學費繳費管理
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {school?.name}
          </p>
        </div>
        <button
          onClick={() => router.push('/main')}
          style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'white', border: 'none', fontSize: '14px', cursor: 'pointer' }}
        >
          ← 返回首頁
        </button>
      </div>

      {/* Summary stats card — only shown when billing data is available */}
      {billingData && (
        <div style={{ background: 'var(--primary)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '16px', color: 'white' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>
            📊 {billingData.class.name} - 學費設定
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '13px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-sm)', padding: '8px', textAlign: 'center' }}>
              <div style={{ opacity: 0.8 }}>月費</div>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{formatCurrency(billingData.class.feeMonthly)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-sm)', padding: '8px', textAlign: 'center' }}>
              <div style={{ opacity: 0.8 }}>季費</div>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{formatCurrency(billingData.class.feeQuarterly)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-sm)', padding: '8px', textAlign: 'center' }}>
              <div style={{ opacity: 0.8 }}>學期費</div>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{formatCurrency(billingData.class.feeSemester)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-sm)', padding: '8px', textAlign: 'center' }}>
              <div style={{ opacity: 0.8 }}>學年費</div>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{formatCurrency(billingData.class.feeYearly)}</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.3)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{billingData.stats.total}</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>總人數</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#90EE90' }}>{billingData.stats.paid}</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>已繳費</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFB6C1' }}>{billingData.stats.unpaid}</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>未繳費</div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
