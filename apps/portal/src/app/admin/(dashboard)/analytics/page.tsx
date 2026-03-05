'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { platformFetch } from '@/lib/api'

// ---------- 型別 ----------

interface DailyPoint {
  date: string
  pv: number
  uv: number
}

interface OverviewResponse {
  data: {
    today: { pv: number; uv: number }
    week: { pv: number; uv: number }
    month: { pv: number; uv: number }
    dailyTrend: DailyPoint[]
  }
}

interface PageStat {
  path: string
  pv: number
  uv: number
}

interface PagesResponse {
  data: PageStat[]
}

interface BotStat {
  botName: string
  botCategory: string
  totalVisits: number
}

interface BotsResponse {
  data: {
    bots: BotStat[]
    todayCount: number
    monthCount: number
    activeBots: number
  }
}

// ---------- 子元件 ----------

function Spinner() {
  return (
    <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-[#8FA895] rounded-full animate-spin" />
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-gray-700 mb-4">{children}</h2>
}

function StatCard({
  label,
  pv,
  uv,
  color,
}: {
  label: string
  pv: number
  uv: number
  color: string
}) {
  return (
    <div className="rounded-2xl bg-white shadow-sm p-5">
      <p className="text-sm text-gray-500 mb-3">{label}</p>
      <div className="flex gap-6">
        <div>
          <p className="text-xs text-gray-400">瀏覽次數</p>
          <p className="text-xl font-bold" style={{ color }}>
            {pv.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">獨立訪客</p>
          <p className="text-xl font-bold text-gray-600">{uv.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

function LoadingSection() {
  return (
    <div className="rounded-2xl bg-white shadow-sm p-8 flex items-center justify-center">
      <Spinner />
    </div>
  )
}

function ErrorSection({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm p-6 text-center">
      <p className="text-red-500 mb-3 text-sm">{message}</p>
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

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// ---------- 主頁面 ----------

export default function AnalyticsPage() {
  // 概覽
  const [overview, setOverview] = useState<OverviewResponse['data'] | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState<string | null>(null)

  // 頁面統計
  const [pages, setPages] = useState<PageStat[]>([])
  const [pagesLoading, setPagesLoading] = useState(true)
  const [pagesError, setPagesError] = useState<string | null>(null)

  // 爬蟲統計
  const [botsData, setBotsData] = useState<BotsResponse['data'] | null>(null)
  const [botsLoading, setBotsLoading] = useState(true)
  const [botsError, setBotsError] = useState<string | null>(null)

  // ---------- 載入 ----------

  const fetchOverview = useCallback(async () => {
    try {
      setOverviewLoading(true)
      setOverviewError(null)
      const res = await platformFetch<OverviewResponse>('/analytics/overview')
      setOverview(res.data)
    } catch (err) {
      setOverviewError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  const fetchPages = useCallback(async () => {
    try {
      setPagesLoading(true)
      setPagesError(null)
      const res = await platformFetch<PagesResponse>('/analytics/pages')
      setPages(res.data)
    } catch (err) {
      setPagesError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setPagesLoading(false)
    }
  }, [])

  const fetchBots = useCallback(async () => {
    try {
      setBotsLoading(true)
      setBotsError(null)
      const res = await platformFetch<BotsResponse>('/analytics/bots')
      setBotsData(res.data)
    } catch (err) {
      setBotsError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setBotsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOverview()
    fetchPages()
    fetchBots()
  }, [fetchOverview, fetchPages, fetchBots])

  // ---------- 渲染 ----------

  const trendData = overview?.dailyTrend.map((d) => ({
    ...d,
    date: formatShortDate(d.date),
  })) ?? []

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">數據分析</h1>

      {/* ===== 流量摘要 ===== */}
      <section>
        <SectionTitle>流量摘要</SectionTitle>
        {overviewLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl bg-white shadow-sm p-5 flex items-center justify-center h-[100px]">
                <Spinner />
              </div>
            ))}
          </div>
        ) : overviewError ? (
          <ErrorSection message={overviewError} onRetry={fetchOverview} />
        ) : overview ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="今日" pv={overview.today.pv} uv={overview.today.uv} color="#8FA895" />
            <StatCard label="本週" pv={overview.week.pv} uv={overview.week.uv} color="#C4956A" />
            <StatCard label="本月" pv={overview.month.pv} uv={overview.month.uv} color="#6B9BD2" />
          </div>
        ) : null}
      </section>

      {/* ===== 30 天趨勢 ===== */}
      <section>
        <SectionTitle>30 天趨勢</SectionTitle>
        {overviewLoading ? (
          <LoadingSection />
        ) : overviewError ? (
          <ErrorSection message={overviewError} onRetry={fetchOverview} />
        ) : (
          <div className="rounded-2xl bg-white shadow-sm p-5">
            {trendData.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-gray-400 text-sm">
                尚無趨勢資料
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8FA895" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8FA895" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B8A9C9" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#B8A9C9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }}
                    formatter={(value: number, name: string) => [
                      value.toLocaleString(),
                      name === 'pv' ? '瀏覽次數' : '獨立訪客',
                    ]}
                  />
                  <Legend
                    formatter={(value: string) => (value === 'pv' ? '瀏覽次數' : '獨立訪客')}
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="pv"
                    stroke="#8FA895"
                    strokeWidth={2}
                    fill="url(#colorPv)"
                  />
                  <Area
                    type="monotone"
                    dataKey="uv"
                    stroke="#B8A9C9"
                    strokeWidth={2}
                    fill="url(#colorUv)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </section>

      {/* ===== 熱門頁面 ===== */}
      <section>
        <SectionTitle>熱門頁面</SectionTitle>
        {pagesLoading ? (
          <LoadingSection />
        ) : pagesError ? (
          <ErrorSection message={pagesError} onRetry={fetchPages} />
        ) : (
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            {pages.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">尚無資料</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500">
                      <th className="px-4 py-3 font-medium w-12">排名</th>
                      <th className="px-4 py-3 font-medium">路徑</th>
                      <th className="px-4 py-3 font-medium text-right">瀏覽次數</th>
                      <th className="px-4 py-3 font-medium text-right">獨立訪客</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pages.map((page, index) => (
                      <tr key={page.path} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-gray-400 font-medium">{index + 1}</td>
                        <td className="px-4 py-3 text-gray-700 font-mono text-xs">{page.path}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{page.pv.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{page.uv.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ===== 爬蟲統計 ===== */}
      <section>
        <SectionTitle>爬蟲統計</SectionTitle>
        {botsLoading ? (
          <LoadingSection />
        ) : botsError ? (
          <ErrorSection message={botsError} onRetry={fetchBots} />
        ) : botsData ? (
          <div className="space-y-4">
            {/* 摘要卡片 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white shadow-sm p-5">
                <p className="text-sm text-gray-500 mb-1">今日爬蟲次數</p>
                <p className="text-2xl font-bold" style={{ color: '#B8A9C9' }}>
                  {botsData.todayCount.toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl bg-white shadow-sm p-5">
                <p className="text-sm text-gray-500 mb-1">本月爬蟲次數</p>
                <p className="text-2xl font-bold" style={{ color: '#C4956A' }}>
                  {botsData.monthCount.toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl bg-white shadow-sm p-5">
                <p className="text-sm text-gray-500 mb-1">活躍爬蟲種類</p>
                <p className="text-2xl font-bold" style={{ color: '#6B9BD2' }}>
                  {botsData.activeBots}
                </p>
              </div>
            </div>

            {/* 爬蟲列表 */}
            <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
              {botsData.bots.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">尚無爬蟲資料</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-gray-500">
                        <th className="px-4 py-3 font-medium">爬蟲名稱</th>
                        <th className="px-4 py-3 font-medium">類別</th>
                        <th className="px-4 py-3 font-medium text-right">訪問次數</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {botsData.bots.map((bot, i) => (
                        <tr key={`${bot.botName}-${i}`} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-gray-800 font-medium">{bot.botName}</td>
                          <td className="px-4 py-3 text-gray-600">{bot.botCategory}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{bot.totalVisits.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
