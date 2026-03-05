'use client'

import { useEffect, useState } from 'react'

interface Plan {
  id: string
  name: string
  ai_reply_limit: number
  push_limit: number
  price_monthly: number
  price_yearly: number
}

interface Subscription {
  plan: string
  ai_reply_limit: number
  push_limit: number
  billing_cycle: string
  status: string
}

interface Usage {
  ai_calls: number
  push_calls: number
}

interface Bill {
  id: string
  plan: string
  amount: number
  status: string
  paid_at: string
  method: string
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [sub, setSub] = useState<Subscription | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [yearly, setYearly] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/plans', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/subscriptions', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/usage', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/billing', { credentials: 'include' }).then(r => r.json()),
    ]).then(([planData, subData, usageData, billData]) => {
      setPlans(planData.data || [])
      setSub(subData)
      setUsage(usageData)
      setBills(billData.data || [])
      setYearly(subData.billing_cycle === 'yearly')
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading || !sub || !usage) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const aiPercent = sub.ai_reply_limit > 0 ? Math.round((usage.ai_calls / sub.ai_reply_limit) * 100) : 0
  const pushPercent = sub.push_limit > 0 ? Math.round((usage.push_calls / sub.push_limit) * 100) : 0

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">方案加購</h1>

      <div className="bg-surface rounded-2xl border border-border p-6 mb-6">
        <h2 className="text-lg font-semibold text-text mb-4">用量總覽</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <UsageBar label="AI 回覆" used={usage.ai_calls} limit={sub.ai_reply_limit} percent={aiPercent} />
          <UsageBar label="LINE Push" used={usage.push_calls} limit={sub.push_limit} percent={pushPercent} />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text">選擇方案</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className={yearly ? 'text-text-muted' : 'text-text font-medium'}>月繳</span>
            <button
              onClick={() => setYearly(!yearly)}
              className={`relative w-10 h-5 rounded-full transition-colors ${yearly ? 'bg-primary' : 'bg-border'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${yearly ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <span className={yearly ? 'text-text font-medium' : 'text-text-muted'}>年繳</span>
            {yearly && <span className="text-xs text-success font-medium ml-1">省更多!</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.filter(p => p.price_monthly > 0).map((plan) => {
            const isCurrent = plan.id === sub.plan
            const price = yearly ? plan.price_yearly : plan.price_monthly

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border-2 p-5 transition-all ${
                  isCurrent ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:border-primary/50'
                }`}
              >
                {plan.id === 'standard' && (
                  <span className="inline-block px-2 py-0.5 text-xs bg-primary text-white rounded-full mb-2">推薦</span>
                )}
                <h3 className="font-semibold text-text mb-1">{plan.name}</h3>
                <p className="text-2xl font-bold text-text">
                  NT${price} <span className="text-sm font-normal text-text-muted">/ 月</span>
                </p>
                {yearly && (
                  <p className="text-xs text-success mt-1">
                    年繳省 NT${(plan.price_monthly - plan.price_yearly) * 12}/年
                  </p>
                )}
                <div className="mt-4 space-y-2 text-sm text-text-muted">
                  <p>AI 回覆：{plan.ai_reply_limit.toLocaleString()} 則/月</p>
                  <p>LINE Push：{plan.push_limit.toLocaleString()} 則/月</p>
                </div>
                <button
                  className={`w-full mt-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isCurrent
                      ? 'bg-primary/10 text-primary cursor-default'
                      : 'bg-primary text-white hover:bg-primary-hover'
                  }`}
                  disabled={isCurrent}
                >
                  {isCurrent ? '目前方案' : '升級方案'}
                </button>
              </div>
            )
          })}
        </div>

        <div className="mt-4 p-4 rounded-2xl border border-border bg-surface">
          <h3 className="font-semibold text-text">企業版</h3>
          <p className="text-sm text-text-muted mt-1">無限額度，專屬客服，客製化功能</p>
          <button className="mt-3 px-4 py-2 border border-primary text-primary rounded-xl text-sm hover:bg-primary/5 transition-colors">
            聯繫我們
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text mb-4">帳單紀錄</h2>
        {bills.length > 0 ? (
          <div className="space-y-3">
            {bills.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between p-3 rounded-xl border border-border">
                <div>
                  <p className="text-sm font-medium text-text">{bill.plan}</p>
                  <p className="text-xs text-text-muted">
                    {new Date(bill.paid_at).toLocaleDateString('zh-TW')} | {bill.method === 'credit_card' ? '信用卡' : bill.method === 'atm' ? 'ATM' : '超商'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-text">NT${bill.amount}</p>
                  <span className="text-xs text-success">已付款</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted text-center py-4">尚無帳單紀錄</p>
        )}
      </div>
    </div>
  )
}

function UsageBar({ label, used, limit, percent }: { label: string; used: number; limit: number; percent: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-text font-medium">{label}</span>
        <span className="text-text-muted">{used} / {limit}</span>
      </div>
      <div className="w-full bg-border rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all ${percent > 80 ? 'bg-danger' : 'bg-primary'}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <p className="text-xs text-text-muted mt-1">{percent}% 已使用</p>
    </div>
  )
}
