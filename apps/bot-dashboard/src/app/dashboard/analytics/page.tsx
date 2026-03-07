'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface OverviewData {
  today: { total: number; byBot: Record<string, number> }
  month: { total: number; byBot: Record<string, number>; byRole: Record<string, number> }
}

interface TopQuestion {
  question: string
  count: number
}

const BOT_COLORS: Record<string, string> = {
  clairvoyant: '#8B7E74',
  windear: '#A89F91',
  'ai-tutor': '#7C9082',
  wentaishi: '#9B8EA8',
}

const BOT_NAMES: Record<string, string> = {
  clairvoyant: '千里眼',
  windear: '順風耳',
  'ai-tutor': '神算子',
  wentaishi: '聞仲老師',
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [trends, setTrends] = useState<Record<string, Record<string, number>>>({})
  const [topQuestions, setTopQuestions] = useState<TopQuestion[]>([])
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics/overview', { credentials: 'include' }).then((r) => r.json()),
      fetch(`/api/analytics/trends?days=${days}`, { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/analytics/top-questions', { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([ov, tr, tq]) => {
        setOverview(ov)
        setTrends(tr)
        setTopQuestions(Array.isArray(tq) ? tq : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [days])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Transform trends for Recharts
  const chartData = Object.entries(trends)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bots]) => ({
      date: date.slice(5), // MM-DD
      ...bots,
    }))

  const allBotTypes = new Set<string>()
  Object.values(trends).forEach((bots) => Object.keys(bots).forEach((b) => allBotTypes.add(b)))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text">統計分析</h1>
        <div className="flex gap-2">
          {[7, 30].map((d) => (
            <button
              key={d}
              onClick={() => { setLoading(true); setDays(d) }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                days === d ? 'bg-primary text-white' : 'bg-surface-hover text-text-muted'
              }`}
            >
              {d} 天
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">今日對話</p>
          <p className="text-2xl font-bold text-text">{overview?.today?.total ?? 0}</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">本月對話</p>
          <p className="text-2xl font-bold text-text">{overview?.month?.total ?? 0}</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">角色分布</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {overview?.month?.byRole && Object.entries(overview.month.byRole).map(([role, count]) => (
              <span key={role} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                {role}: {count}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-surface rounded-2xl border border-border p-6 mb-6">
        <h2 className="text-lg font-semibold text-text mb-4">對話量趨勢</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {Array.from(allBotTypes).map((botType) => (
                <Line
                  key={botType}
                  type="monotone"
                  dataKey={botType}
                  name={BOT_NAMES[botType] || botType}
                  stroke={BOT_COLORS[botType] || '#888'}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-text-muted py-8">此期間無資料</p>
        )}
      </div>

      {/* Top Questions */}
      <div className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text mb-4">熱門問題 Top 10</h2>
        {topQuestions.length > 0 ? (
          <div className="space-y-2">
            {topQuestions.map((q, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-primary w-6">{i + 1}.</span>
                  <span className="text-sm text-text">{q.question}</span>
                </div>
                <span className="text-sm font-medium text-text-muted">{q.count} 次</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-text-muted py-4">尚無問題資料</p>
        )}
      </div>
    </div>
  )
}
