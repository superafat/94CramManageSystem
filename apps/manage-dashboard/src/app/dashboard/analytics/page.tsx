'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface OverviewData {
  today: { pv: number; uv: number }
  thisWeek: { pv: number; uv: number }
  thisMonth: { pv: number; uv: number }
  daily: { date: string; pv: number; uv: number }[]
}

interface PageData {
  path: string
  pv: number
  uv: number
}

interface ReferrerData {
  referrer: string
  count: number
}

interface BotOverview {
  today: number
  thisMonth: number
  activeBots: number
  bots: { botName: string; category: string; today: number; thisMonth: number; lastSeen: string }[]
  distribution: { botName: string; count: number; percentage: number }[]
}

interface BotLog {
  id: string
  botName: string
  category: string
  path: string
  ipAddress: string
  statusCode: number
  responseTimeMs: number
  createdAt: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <p className="text-sm text-text-muted">{label}</p>
      <p className="text-2xl font-bold text-text mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
    </div>
  )
}

function MiniBarChart({ data, maxVal }: { data: { date: string; pv: number; uv: number }[]; maxVal: number }) {
  if (!data.length) return null
  const max = maxVal || 1
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-text mb-4">過去 30 天趨勢</h3>
      <div className="flex items-end gap-[2px] h-32">
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-[1px] group relative">
            <div
              className="w-full bg-primary/70 rounded-t-sm transition-all"
              style={{ height: `${(d.pv / max) * 100}%`, minHeight: d.pv > 0 ? '2px' : '0' }}
            />
            <div
              className="w-full bg-accent/70 rounded-t-sm transition-all"
              style={{ height: `${(d.uv / max) * 100}%`, minHeight: d.uv > 0 ? '2px' : '0' }}
            />
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-text text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
              {d.date}: PV {d.pv} / UV {d.uv}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-text-muted mt-2">
        <span>{data[0]?.date}</span>
        <div className="flex gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-primary/70 rounded-sm inline-block" /> PV</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-accent/70 rounded-sm inline-block" /> UV</span>
        </div>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  )
}

function DistributionChart({ data }: { data: { botName: string; count: number; percentage: number }[] }) {
  const colors = ['bg-primary', 'bg-accent', 'bg-warning', 'bg-success', 'bg-error', 'bg-primary/50', 'bg-accent/50']
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-text mb-4">爬蟲分佈</h3>
      {/* Horizontal bar chart */}
      <div className="space-y-3">
        {data.map((d, i) => (
          <div key={d.botName}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text">{d.botName}</span>
              <span className="text-text-muted">{d.percentage}% ({d.count})</span>
            </div>
            <div className="h-3 bg-border rounded-full overflow-hidden">
              <div className={`h-full ${colors[i % colors.length]} rounded-full transition-all`} style={{ width: `${d.percentage}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [tab, setTab] = useState<'traffic' | 'bots'>('traffic')
  const [loading, setLoading] = useState(true)

  // Traffic state
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [pages, setPages] = useState<PageData[]>([])
  const [referrers, setReferrers] = useState<ReferrerData[]>([])

  // Bot state
  const [botOverview, setBotOverview] = useState<BotOverview | null>(null)
  const [botLogs, setBotLogs] = useState<BotLog[]>([])
  const [botFilter, setBotFilter] = useState('')
  const [botLogsPage, setBotLogsPage] = useState(1)
  const [botLogsTotal, setBotLogsTotal] = useState(0)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  const fetchTraffic = useCallback(async () => {
    setLoading(true)
    try {
      const [ovRes, pgRes, refRes] = await Promise.all([
        fetch('/api/admin/analytics/overview', { credentials: 'include' }),
        fetch('/api/admin/analytics/pages', { credentials: 'include' }),
        fetch('/api/admin/analytics/referrers', { credentials: 'include' }),
      ])
      const [ovData, pgData, refData] = await Promise.all([ovRes.json(), pgRes.json(), refRes.json()])
      if (ovData.success) setOverview(ovData.data)
      if (pgData.success) setPages(pgData.data ?? [])
      if (refData.success) setReferrers(refData.data ?? [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  const fetchBots = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(botLogsPage), limit: '20' })
      if (botFilter) params.set('botName', botFilter)
      const [botRes, logRes] = await Promise.all([
        fetch('/api/admin/analytics/bots', { credentials: 'include' }),
        fetch(`/api/admin/analytics/bots/logs?${params}`, { credentials: 'include' }),
      ])
      const [botData, logData] = await Promise.all([botRes.json(), logRes.json()])
      if (botData.success) setBotOverview(botData.data)
      if (logData.success) {
        setBotLogs(logData.data?.logs ?? [])
        setBotLogsTotal(logData.data?.total ?? 0)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [botFilter, botLogsPage])

  useEffect(() => {
    if (tab === 'traffic') fetchTraffic()
    else fetchBots()
  }, [tab, fetchTraffic, fetchBots])

  const maxPv = overview?.daily ? Math.max(...overview.daily.map(d => d.pv)) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">網站監控</h1>
          <p className="text-sm text-text-muted mt-1">瀏覽人次統計與 AI 爬蟲追蹤</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setTab('traffic')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'traffic' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          瀏覽人次
        </button>
        <button
          onClick={() => setTab('bots')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'bots' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          AI 爬蟲監控
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {/* ─── Tab 1: Traffic ──────────────────────────────────────────── */}
      {!loading && tab === 'traffic' && overview && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="今日 PV" value={overview.today.pv} />
            <StatCard label="今日 UV" value={overview.today.uv} />
            <StatCard label="本月 PV" value={overview.thisMonth.pv} />
            <StatCard label="本月 UV" value={overview.thisMonth.uv} />
          </div>

          {/* Daily trend chart */}
          <MiniBarChart data={overview.daily} maxVal={maxPv} />

          {/* Top pages */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-sm font-medium text-text mb-4">熱門頁面 Top 20</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-muted">
                    <th className="pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium">路徑</th>
                    <th className="pb-2 font-medium text-right">PV</th>
                    <th className="pb-2 font-medium text-right">UV</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.slice(0, 20).map((p, i) => (
                    <tr key={p.path} className="border-b border-border/50">
                      <td className="py-2 text-text-muted">{i + 1}</td>
                      <td className="py-2 text-text font-mono text-xs">{p.path}</td>
                      <td className="py-2 text-right text-text">{p.pv.toLocaleString()}</td>
                      <td className="py-2 text-right text-text-muted">{p.uv.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Referrers */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-sm font-medium text-text mb-4">流量來源 Top 10</h3>
            <div className="space-y-2">
              {referrers.slice(0, 10).map((r) => (
                <div key={r.referrer} className="flex justify-between items-center py-1">
                  <span className="text-sm text-text truncate flex-1">{r.referrer || '(直接訪問)'}</span>
                  <span className="text-sm text-text-muted ml-4">{r.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab 2: Bot Monitoring ───────────────────────────────────── */}
      {!loading && tab === 'bots' && botOverview && (
        <div className="space-y-6">
          {/* Bot stat cards */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="今日爬取次數" value={botOverview.today} />
            <StatCard label="本月爬取次數" value={botOverview.thisMonth} />
            <StatCard label="活躍爬蟲數" value={botOverview.activeBots} />
          </div>

          {/* Distribution chart */}
          {botOverview.distribution.length > 0 && (
            <DistributionChart data={botOverview.distribution} />
          )}

          {/* Bot detail table */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-sm font-medium text-text mb-4">爬蟲詳情</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-muted">
                    <th className="pb-2 font-medium">名稱</th>
                    <th className="pb-2 font-medium">分類</th>
                    <th className="pb-2 font-medium text-right">今日</th>
                    <th className="pb-2 font-medium text-right">本月</th>
                    <th className="pb-2 font-medium text-right">最後爬取</th>
                  </tr>
                </thead>
                <tbody>
                  {botOverview.bots.map((b) => (
                    <tr key={b.botName} className="border-b border-border/50">
                      <td className="py-2 text-text font-medium">{b.botName}</td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          b.category === 'ai_crawler' ? 'bg-primary/10 text-primary' :
                          b.category === 'search_engine' ? 'bg-accent/10 text-accent' :
                          'bg-border text-text-muted'
                        }`}>
                          {b.category === 'ai_crawler' ? 'AI 爬蟲' :
                           b.category === 'search_engine' ? '搜尋引擎' :
                           b.category === 'social' ? '社群' : '其他'}
                        </span>
                      </td>
                      <td className="py-2 text-right text-text">{b.today}</td>
                      <td className="py-2 text-right text-text">{b.thisMonth}</td>
                      <td className="py-2 text-right text-text-muted text-xs">
                        {new Date(b.lastSeen).toLocaleString('zh-TW')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bot logs */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-text">爬蟲日誌</h3>
              <div className="flex gap-2">
                <select
                  value={botFilter}
                  onChange={(e) => { setBotFilter(e.target.value); setBotLogsPage(1) }}
                  className="text-xs border border-border rounded-lg px-2 py-1 bg-surface text-text"
                >
                  <option value="">全部爬蟲</option>
                  {botOverview.bots.map(b => (
                    <option key={b.botName} value={b.botName}>{b.botName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              {botLogs.map((log) => (
                <div key={log.id} className="border border-border/50 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-surface-hover transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-text-muted">{new Date(log.createdAt).toLocaleString('zh-TW')}</span>
                      <span className="font-medium text-text">{log.botName}</span>
                      <span className="text-text-muted font-mono">{log.path}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-1.5 py-0.5 rounded ${
                        log.statusCode < 400 ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                      }`}>
                        {log.statusCode}
                      </span>
                      <span className="text-text-muted">{log.responseTimeMs}ms</span>
                      <span className="text-text-muted">{expandedLog === log.id ? '▲' : '▼'}</span>
                    </div>
                  </button>
                  {expandedLog === log.id && (
                    <div className="px-3 py-2 bg-surface-hover border-t border-border/50 text-xs space-y-1">
                      <p><span className="text-text-muted">IP:</span> <span className="text-text">{log.ipAddress}</span></p>
                      <p><span className="text-text-muted">分類:</span> <span className="text-text">{log.category}</span></p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {botLogsTotal > 20 && (
              <div className="flex justify-between items-center mt-4 text-xs text-text-muted">
                <span>共 {botLogsTotal} 筆</span>
                <div className="flex gap-2">
                  <button
                    disabled={botLogsPage <= 1}
                    onClick={() => setBotLogsPage(p => p - 1)}
                    className="px-3 py-1 border border-border rounded-lg disabled:opacity-50 hover:bg-surface-hover"
                  >
                    上一頁
                  </button>
                  <span className="px-3 py-1">{botLogsPage} / {Math.ceil(botLogsTotal / 20)}</span>
                  <button
                    disabled={botLogsPage >= Math.ceil(botLogsTotal / 20)}
                    onClick={() => setBotLogsPage(p => p + 1)}
                    className="px-3 py-1 border border-border rounded-lg disabled:opacity-50 hover:bg-surface-hover"
                  >
                    下一頁
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
