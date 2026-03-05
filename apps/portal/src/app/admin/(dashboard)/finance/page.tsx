'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatNTD } from '@/lib/format'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { platformFetch } from '@/lib/api'

// ---------- 型別 ----------

interface OverviewData {
  currentMonth: {
    revenue: number
    cost: number
    profit: number
  }
  revenueTrend: { month: string; revenue: number }[]
  costTrend: { month: string; cost: number }[]
}

interface OverviewResponse {
  success: boolean
  data: OverviewData
}

interface PricingPlan {
  id: string
  planKey: string
  name: string
  monthlyPrice: number
  features: string[]
  isActive: boolean
}

interface PricingResponse {
  success: boolean
  data: PricingPlan[]
}

// ---------- 工具函式 ----------

// 合併 revenueTrend + costTrend 成為同月份的資料
function mergeTrends(
  revenueTrend: { month: string; revenue: number }[],
  costTrend: { month: string; cost: number }[]
): { month: string; revenue: number; cost: number }[] {
  const map = new Map<string, { month: string; revenue: number; cost: number }>()
  for (const r of revenueTrend) {
    map.set(r.month, { month: r.month, revenue: r.revenue, cost: 0 })
  }
  for (const c of costTrend) {
    const existing = map.get(c.month)
    if (existing) {
      existing.cost = c.cost
    } else {
      map.set(c.month, { month: c.month, revenue: 0, cost: c.cost })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month))
}

// ---------- 統計卡片 ----------

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub?: string
  color: string
}) {
  return (
    <div className="rounded-2xl bg-white shadow-sm p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ---------- 主頁面 ----------

export default function FinancePage() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [pricing, setPricing] = useState<PricingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [ovRes, prRes] = await Promise.all([
        platformFetch<OverviewResponse>('/finance/overview'),
        platformFetch<PricingResponse>('/finance/pricing'),
      ])
      setOverview(ovRes.data)
      setPricing(prRes.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-[#8FA895] rounded-full animate-spin" />
        <p className="text-sm text-gray-400 ml-3">載入中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-red-500 mb-3">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: '#8FA895' }}
        >
          重新載入
        </button>
      </div>
    )
  }

  const trendData = overview
    ? mergeTrends(overview.revenueTrend, overview.costTrend)
    : []

  const profitRate =
    overview && overview.currentMonth.revenue > 0
      ? ((overview.currentMonth.profit / overview.currentMonth.revenue) * 100).toFixed(1)
      : '0.0'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">財務總覽</h1>

      {/* ===== 統計卡片 ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="本月收入"
          value={overview ? formatNTD(overview.currentMonth.revenue) : 'NT$ 0'}
          color="#8FA895"
        />
        <StatCard
          label="本月支出"
          value={overview ? formatNTD(overview.currentMonth.cost) : 'NT$ 0'}
          color="#B5706E"
        />
        <StatCard
          label="本月毛利"
          value={overview ? formatNTD(overview.currentMonth.profit) : 'NT$ 0'}
          sub={`毛利率 ${profitRate}%`}
          color="#6B9BD2"
        />
      </div>

      {/* ===== 近 12 月收支趨勢圖 ===== */}
      <div className="rounded-2xl bg-white shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-700 mb-4">近 12 個月收支趨勢</h2>
        {trendData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">尚無趨勢資料</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trendData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatNTD(value),
                  name === 'revenue' ? '收入' : '支出',
                ]}
              />
              <Legend
                formatter={(value) => (value === 'revenue' ? '收入' : '支出')}
              />
              <Bar dataKey="revenue" name="revenue" fill="#8FA895" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cost" name="cost" fill="#B5706E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ===== 方案定價 ===== */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">目前方案定價</h2>
        {pricing.length === 0 ? (
          <p className="text-sm text-gray-400">尚無方案資料</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pricing.map((plan) => (
              <div
                key={plan.id}
                className="rounded-2xl bg-white shadow-sm p-5 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-800">{plan.name}</span>
                  {plan.isActive ? (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#D1FAE5', color: '#059669' }}
                    >
                      啟用
                    </span>
                  ) : (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#E5E7EB', color: '#6B7280' }}
                    >
                      停用
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold" style={{ color: '#8FA895' }}>
                  {formatNTD(plan.monthlyPrice)}
                  <span className="text-sm font-normal text-gray-400"> / 月</span>
                </p>
                <ul className="mt-1 space-y-1">
                  {(Array.isArray(plan.features) ? plan.features : []).map((f, i) => (
                    <li key={i} className="text-xs text-gray-500 flex items-start gap-1">
                      <span style={{ color: '#8FA895' }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
