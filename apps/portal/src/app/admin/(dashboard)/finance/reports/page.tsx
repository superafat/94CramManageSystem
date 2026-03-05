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
  AreaChart,
  Area,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts'
import { platformFetch } from '@/lib/api'

// ---------- 型別 ----------

type Tab = 'pnl' | 'mrr' | 'receivables'

interface PnLRow {
  period: string
  revenue: number
  cost: number
  profit: number
}

interface PnLResponse {
  success: boolean
  data: PnLRow[]
}

interface MrrRow {
  month: string
  tenantCount: number
  mrr: number
}

interface MrrResponse {
  success: boolean
  data: MrrRow[]
}

interface ReceivablesSummary {
  current: number
  overdue30: number
  overdue60: number
  overdue90: number
}

interface ReceivablesDetail {
  id: string
  name: string
  plan: string
  status: string
  overdueDays: number
}

interface ReceivablesResponse {
  success: boolean
  data: {
    summary: ReceivablesSummary
    details: ReceivablesDetail[]
  }
}

// ---------- 工具函式 ----------

function formatK(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return String(value)
}

// ---------- 子元件 ----------

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      style={
        active
          ? { backgroundColor: '#8FA895', color: '#fff' }
          : { backgroundColor: 'transparent', color: '#6B7280', border: '1px solid #D1D5DB' }
      }
    >
      {children}
    </button>
  )
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div className="rounded-2xl bg-white shadow-sm p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-[#8FA895] rounded-full animate-spin" />
      <p className="text-sm text-gray-400 ml-3">載入中...</p>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <p className="text-red-500 mb-3">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg text-sm font-medium text-white"
        style={{ backgroundColor: '#8FA895' }}
      >
        重新載入
      </button>
    </div>
  )
}

// ---------- 損益表頁籤 ----------

function PnLTab() {
  const [data, setData] = useState<PnLRow[]>([])
  const [period, setPeriod] = useState<'monthly' | 'quarterly'>('monthly')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await platformFetch<PnLResponse>(`/finance/reports/pnl?period=${period}`)
      setData(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorState message={error} onRetry={fetchData} />

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPeriod('monthly')}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={period === 'monthly'
            ? { backgroundColor: '#8FA895', color: '#fff' }
            : { backgroundColor: 'transparent', color: '#6B7280', border: '1px solid #D1D5DB' }}
        >
          月報
        </button>
        <button
          onClick={() => setPeriod('quarterly')}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={period === 'quarterly'
            ? { backgroundColor: '#8FA895', color: '#fff' }
            : { backgroundColor: 'transparent', color: '#6B7280', border: '1px solid #D1D5DB' }}
        >
          季報
        </button>
      </div>

      <div className="rounded-2xl bg-white shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">收入 / 支出 / 毛利</h3>
        {data.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">尚無資料</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={formatK} />
              <Tooltip formatter={(value: number, name: string) => {
                const labels: Record<string, string> = { revenue: '收入', cost: '支出', profit: '毛利' }
                return [formatNTD(value), labels[name] ?? name]
              }} />
              <Legend formatter={(v: string) => ({ revenue: '收入', cost: '支出', profit: '毛利' }[v] ?? v)} />
              <Bar dataKey="revenue" name="revenue" fill="#8FA895" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cost" name="cost" fill="#B5706E" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" name="profit" fill="#6B9BD2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 損益明細表 */}
      {data.length > 0 && (
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">期間</th>
                <th className="px-4 py-3 font-medium text-right">收入</th>
                <th className="px-4 py-3 font-medium text-right">支出</th>
                <th className="px-4 py-3 font-medium text-right">毛利</th>
                <th className="px-4 py-3 font-medium text-right">毛利率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row) => {
                const rate = row.revenue > 0 ? ((row.profit / row.revenue) * 100).toFixed(1) : '0.0'
                return (
                  <tr key={row.period} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-700 font-medium">{row.period}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatNTD(row.revenue)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatNTD(row.cost)}</td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: row.profit >= 0 ? '#8FA895' : '#B5706E' }}>
                      {formatNTD(row.profit)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{rate}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------- MRR 頁籤 ----------

function MrrTab() {
  const [data, setData] = useState<MrrRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await platformFetch<MrrResponse>('/finance/reports/mrr')
      setData(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorState message={error} onRetry={fetchData} />

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">每月經常性收入（MRR）趨勢</h3>
        {data.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">尚無資料</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <defs>
                <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8FA895" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8FA895" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis
                yAxisId="mrr"
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatK}
              />
              <YAxis
                yAxisId="count"
                orientation="right"
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'mrr') return [formatNTD(value), '每月經常性收入']
                  return [`${value} 家`, '付費租戶數']
                }}
              />
              <Legend formatter={(v) => (v === 'mrr' ? '每月經常性收入' : '付費租戶數')} />
              <Area
                yAxisId="mrr"
                type="monotone"
                dataKey="mrr"
                name="mrr"
                stroke="#8FA895"
                strokeWidth={2}
                fill="url(#mrrGradient)"
              />
              <Line
                yAxisId="count"
                type="monotone"
                dataKey="tenantCount"
                name="tenantCount"
                stroke="#C4956A"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {data.length > 0 && (
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">月份</th>
                <th className="px-4 py-3 font-medium text-right">付費租戶數</th>
                <th className="px-4 py-3 font-medium text-right">每月經常性收入</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row) => (
                <tr key={row.month} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-gray-700 font-medium">{row.month}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{row.tenantCount} 家</td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: '#8FA895' }}>
                    {formatNTD(row.mrr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------- 應收帳款頁籤 ----------

const PLAN_LABELS: Record<string, string> = {
  free: '免費版',
  basic: '基本版',
  pro: '專業版',
  enterprise: '企業版',
}

const STATUS_LABELS: Record<string, string> = {
  active: '使用中',
  suspended: '已停用',
  trial: '試用中',
}

function ReceivablesTab() {
  const [summary, setSummary] = useState<ReceivablesSummary | null>(null)
  const [details, setDetails] = useState<ReceivablesDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await platformFetch<ReceivablesResponse>('/finance/reports/receivables')
      setSummary(res.data.summary)
      setDetails(res.data.details)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorState message={error} onRetry={fetchData} />

  return (
    <div className="space-y-4">
      {/* 帳齡摘要 */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard label="正常（未逾期）" value={formatNTD(summary.current)} color="#8FA895" />
          <SummaryCard label="逾期 30 天內" value={formatNTD(summary.overdue30)} color="#C4956A" />
          <SummaryCard label="逾期 30-60 天" value={formatNTD(summary.overdue60)} color="#B8A9C9" />
          <SummaryCard label="逾期 60 天以上" value={formatNTD(summary.overdue90)} color="#B5706E" />
        </div>
      )}

      {/* 明細表格 */}
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">應收帳款明細</h3>
        </div>
        {details.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">尚無應收帳款</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">補習班</th>
                  <th className="px-4 py-3 font-medium">方案</th>
                  <th className="px-4 py-3 font-medium">狀態</th>
                  <th className="px-4 py-3 font-medium text-right">逾期天數</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {details.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{d.name}</td>
                    <td className="px-4 py-3 text-gray-600">{PLAN_LABELS[d.plan] ?? d.plan}</td>
                    <td className="px-4 py-3 text-gray-600">{STATUS_LABELS[d.status] ?? d.status}</td>
                    <td className="px-4 py-3 text-right">
                      {d.overdueDays === 0 ? (
                        <span className="text-xs text-gray-400">正常</span>
                      ) : (
                        <span
                          className="text-xs font-medium"
                          style={{ color: d.overdueDays > 60 ? '#B5706E' : d.overdueDays > 30 ? '#C4956A' : '#B8A9C9' }}
                        >
                          {d.overdueDays} 天
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- 主頁面 ----------

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('pnl')
  const [exporting, setExporting] = useState(false)

  async function handleExport(type: 'payments' | 'costs') {
    try {
      setExporting(true)
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('platform_token') ?? ''
        : ''
      const res = await fetch(
        `/api/platform/finance/reports/export?type=${type}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error('匯出失敗')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type === 'payments' ? '收款紀錄' : '支出紀錄'}_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : '匯出失敗')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">財務報表</h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('payments')}
            disabled={exporting}
            className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            {exporting ? '匯出中...' : '匯出收款 CSV'}
          </button>
          <button
            onClick={() => handleExport('costs')}
            disabled={exporting}
            className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            {exporting ? '匯出中...' : '匯出支出 CSV'}
          </button>
        </div>
      </div>

      {/* 頁籤 */}
      <div className="flex gap-2 flex-wrap">
        <TabButton active={activeTab === 'pnl'} onClick={() => setActiveTab('pnl')}>
          損益表
        </TabButton>
        <TabButton active={activeTab === 'mrr'} onClick={() => setActiveTab('mrr')}>
          收入趨勢
        </TabButton>
        <TabButton active={activeTab === 'receivables'} onClick={() => setActiveTab('receivables')}>
          應收帳款
        </TabButton>
      </div>

      {/* 頁籤內容 */}
      {activeTab === 'pnl' && <PnLTab />}
      {activeTab === 'mrr' && <MrrTab />}
      {activeTab === 'receivables' && <ReceivablesTab />}
    </div>
  )
}
