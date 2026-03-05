'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { platformFetch } from '@/lib/api'
import { formatNTD } from '@/lib/format'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// ---------- 型別 ----------

interface DashboardPayload {
  success: boolean
  data: {
    tenants: { active: number; trial: number; suspended: number }
    finance: { monthlyRevenue: number; monthlyCost: number; profit: number }
    pending: { accounts: number; trials: number; overdue: number }
    recentTrend: Array<{ date: string; newTenants: number; pageViews: number }>
  }
}

// ---------- 工具 ----------

function profitRate(revenue: number, cost: number): string {
  if (revenue === 0) return '0%'
  return `${(((revenue - cost) / revenue) * 100).toFixed(1)}%`
}

// ---------- 骨架屏 ----------

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm animate-pulse">
      <div className="h-4 w-24 rounded bg-gray-200 mb-3" />
      <div className="h-8 w-32 rounded bg-gray-200 mb-2" />
      <div className="h-3 w-40 rounded bg-gray-100" />
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm animate-pulse">
      <div className="h-5 w-28 rounded bg-gray-200 mb-4" />
      <div className="flex gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-20 rounded-xl bg-gray-100" />
        ))}
      </div>
    </div>
  )
}

// ---------- 主頁面 ----------

export default function AdminDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardPayload['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await platformFetch<DashboardPayload>('/dashboard')
      setData(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ---------- Loading ----------
  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">總覽</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonRow />
        <SkeletonRow />
      </div>
    )
  }

  // ---------- Error ----------
  if (error || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">總覽</h1>
        <div className="rounded-2xl bg-white p-8 shadow-sm text-center">
          <p className="text-red-500 mb-4">{error ?? '資料載入失敗'}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#8FA895' }}
          >
            重新載入
          </button>
        </div>
      </div>
    )
  }

  const { tenants, finance, pending, recentTrend } = data
  const totalTenants = tenants.active + tenants.trial + tenants.suspended

  // 月增減（簡易：若無上月資料就不顯示）
  const revenueChange: number | null = null // 後端目前未提供上月比較

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <h1 className="text-2xl font-bold text-gray-800">總覽</h1>

      {/* ===== 統計卡片 ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. 補習班總數 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">補習班總數</p>
          <p className="text-3xl font-bold text-gray-800">{totalTenants}</p>
          <p className="text-xs text-gray-400 mt-1">
            使用中 {tenants.active} / 試用中 {tenants.trial} / 已停用{' '}
            {tenants.suspended}
          </p>
        </div>

        {/* 2. 本月收入 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">本月收入</p>
          <p className="text-3xl font-bold text-gray-800">
            {formatNTD(finance.monthlyRevenue)}
          </p>
          {revenueChange !== null && (
            <p
              className={`text-xs mt-1 font-medium ${
                revenueChange >= 0 ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {revenueChange >= 0 ? '↑' : '↓'} 較上月{' '}
              {revenueChange >= 0 ? '+' : ''}
              {revenueChange}%
            </p>
          )}
        </div>

        {/* 3. 本月支出 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">本月支出</p>
          <p className="text-3xl font-bold text-gray-800">
            {formatNTD(finance.monthlyCost)}
          </p>
        </div>

        {/* 4. 本月毛利 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">本月毛利</p>
          <p className="text-3xl font-bold text-gray-800">
            {formatNTD(finance.profit)}
          </p>
          <p className="text-xs mt-1 font-medium" style={{ color: '#8FA895' }}>
            毛利率 {profitRate(finance.monthlyRevenue, finance.monthlyCost)}
          </p>
        </div>
      </div>

      {/* ===== 待處理事項 ===== */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-700 mb-4">
          待處理事項
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 待審核帳號 */}
          <button
            onClick={() => router.push('/admin/accounts')}
            className="rounded-xl border p-4 text-left transition-colors hover:border-[#8FA895]"
            style={{
              borderColor: pending.accounts > 0 ? '#F59E0B' : '#E5E7EB',
              backgroundColor: pending.accounts > 0 ? '#FFFBEB' : '#FAFAFA',
            }}
          >
            <p
              className="text-2xl font-bold"
              style={{
                color: pending.accounts > 0 ? '#D97706' : '#9CA3AF',
              }}
            >
              {pending.accounts}
            </p>
            <p className="text-sm text-gray-600 mt-1">待審核帳號</p>
          </button>

          {/* 試用申請 */}
          <button
            onClick={() => router.push('/admin/trials')}
            className="rounded-xl border p-4 text-left transition-colors hover:border-[#8FA895]"
            style={{
              borderColor: pending.trials > 0 ? '#F59E0B' : '#E5E7EB',
              backgroundColor: pending.trials > 0 ? '#FFFBEB' : '#FAFAFA',
            }}
          >
            <p
              className="text-2xl font-bold"
              style={{
                color: pending.trials > 0 ? '#D97706' : '#9CA3AF',
              }}
            >
              {pending.trials}
            </p>
            <p className="text-sm text-gray-600 mt-1">試用申請</p>
          </button>

          {/* 逾期未付 */}
          <button
            onClick={() => router.push('/admin/finance/subscriptions')}
            className="rounded-xl border p-4 text-left transition-colors hover:border-[#8FA895]"
            style={{
              borderColor: pending.overdue > 0 ? '#EF4444' : '#E5E7EB',
              backgroundColor: pending.overdue > 0 ? '#FEF2F2' : '#FAFAFA',
            }}
          >
            <p
              className="text-2xl font-bold"
              style={{
                color: pending.overdue > 0 ? '#DC2626' : '#9CA3AF',
              }}
            >
              {pending.overdue}
            </p>
            <p className="text-sm text-gray-600 mt-1">逾期未付</p>
          </button>
        </div>
      </div>

      {/* ===== 近 7 天趨勢圖 ===== */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-700 mb-4">
          近 7 天趨勢
        </h2>
        {recentTrend.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">
            尚無趨勢資料
          </p>
        ) : (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={recentTrend}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="gradTenants" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8FA895" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8FA895" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B8A9C9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#B8A9C9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D8" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v)
                    return `${d.getMonth() + 1}/${d.getDate()}`
                  }}
                />
                <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: 13,
                  }}
                  labelFormatter={(label: string) => {
                    const d = new Date(label)
                    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
                  }}
                  formatter={(value: number, name: string) => {
                    const labelMap: Record<string, string> = {
                      newTenants: '新增租戶',
                      pageViews: '全站瀏覽量',
                    }
                    return [value, labelMap[name] ?? name]
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="newTenants"
                  stroke="#8FA895"
                  strokeWidth={2}
                  fill="url(#gradTenants)"
                  name="newTenants"
                />
                <Area
                  type="monotone"
                  dataKey="pageViews"
                  stroke="#B8A9C9"
                  strokeWidth={2}
                  fill="url(#gradViews)"
                  name="pageViews"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
