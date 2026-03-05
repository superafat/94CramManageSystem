'use client'

import { useEffect, useState, useCallback } from 'react'

type ViewMode = 'month' | 'quarter' | 'year'

interface SummaryData {
  revenue: number
  expenses: number
  courseCount: number
  teacherCount: number
  breakdown: { month: string; revenue: number; expenses: number }[]
  period: { mode: string; startDate: string; endDate: string; year: number }
}

const API_BASE = ''

export function OverviewTab() {
  const now = new Date()
  const [mode, setMode] = useState<ViewMode>('month')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [quarter, setQuarter] = useState(Math.ceil((now.getMonth() + 1) / 3))
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiReport, setAiReport] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  // History lookup
  const [showHistory, setShowHistory] = useState(false)
  const [histYear, setHistYear] = useState(year)
  const [histMonth, setHistMonth] = useState(month)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ mode, year: String(year) })
      if (mode === 'month') params.set('month', String(month))
      if (mode === 'quarter') params.set('quarter', String(quarter))
      const res = await fetch(`${API_BASE}/api/admin/finance/summary?${params}`, { credentials: 'include' })
      if (res.ok) {
        const result = await res.json()
        setData(result.data ?? result)
      }
    } catch (err) {
      console.error('Failed to fetch finance summary:', err)
    } finally {
      setLoading(false)
    }
  }, [mode, year, month, quarter])

  useEffect(() => { fetchSummary() }, [fetchSummary])

  const handleAiAnalysis = async () => {
    setAiLoading(true)
    setAiReport(null)
    try {
      const res = await fetch(`${API_BASE}/api/admin/finance/ai-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mode: mode === 'quarter' ? 'year' : mode,
          year,
          month: mode === 'month' ? month : undefined,
        }),
      })
      if (res.ok) {
        const result = await res.json()
        const d = result.data ?? result
        setAiReport(d.analysis)
      }
    } catch (err) {
      console.error('AI analysis failed:', err)
      setAiReport('分析失敗，請稍後再試。')
    } finally {
      setAiLoading(false)
    }
  }

  const handleHistoryLookup = () => {
    setYear(histYear)
    setMonth(histMonth)
    setMode('month')
    setShowHistory(false)
  }

  const netProfit = (data?.revenue ?? 0) - (data?.expenses ?? 0)
  const profitRate = data?.revenue ? ((netProfit / data.revenue) * 100).toFixed(1) : '0'

  const periodLabel = mode === 'year'
    ? `${year}年`
    : mode === 'quarter'
    ? `${year}年 Q${quarter}`
    : `${year}年${month}月`

  return (
    <div className="space-y-4">
      {/* Time Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Mode Toggle */}
        <div className="flex gap-1 bg-surface-hover rounded-lg p-1">
          {(['month', 'quarter', 'year'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === m ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text'
              }`}
            >
              {m === 'month' ? '月' : m === 'quarter' ? '季' : '年'}
            </button>
          ))}
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (mode === 'month') {
                if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1)
              } else if (mode === 'quarter') {
                if (quarter === 1) { setYear(y => y - 1); setQuarter(4) } else setQuarter(q => q - 1)
              } else {
                setYear(y => y - 1)
              }
            }}
            className="p-2 text-text-muted hover:text-text rounded-lg hover:bg-surface"
          >
            &larr;
          </button>
          <span className="text-sm font-medium text-text min-w-[100px] text-center">{periodLabel}</span>
          <button
            onClick={() => {
              if (mode === 'month') {
                if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1)
              } else if (mode === 'quarter') {
                if (quarter === 4) { setYear(y => y + 1); setQuarter(1) } else setQuarter(q => q + 1)
              } else {
                setYear(y => y + 1)
              }
            }}
            className="p-2 text-text-muted hover:text-text rounded-lg hover:bg-surface"
          >
            &rarr;
          </button>
        </div>

        {/* History Lookup Button */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="px-3 py-1.5 text-sm border border-border rounded-lg text-text-muted hover:text-text hover:bg-surface"
        >
          歷史查詢
        </button>
      </div>

      {/* History Lookup Panel */}
      {showHistory && (
        <div className="bg-surface border border-border rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">年份</label>
            <select
              value={histYear}
              onChange={e => setHistYear(Number(e.target.value))}
              className="px-3 py-2 border border-border rounded-lg bg-white text-sm"
            >
              {Array.from({ length: 10 }, (_, i) => now.getFullYear() - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">月份</label>
            <select
              value={histMonth}
              onChange={e => setHistMonth(Number(e.target.value))}
              className="px-3 py-2 border border-border rounded-lg bg-white text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleHistoryLookup}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
          >
            查看
          </button>
        </div>
      )}

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-surface-hover animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
            <div className="text-xs text-text-muted mb-1">總營收</div>
            <div className="text-2xl lg:text-3xl font-bold text-[#7B9E89]">
              ${(data?.revenue ?? 0).toLocaleString()}
            </div>
            <div className="text-xs text-text-muted mt-1">
              淨利 ${netProfit.toLocaleString()} ({profitRate}%)
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
            <div className="text-xs text-text-muted mb-1">總支出</div>
            <div className="text-2xl lg:text-3xl font-bold text-[#B5706E]">
              ${(data?.expenses ?? 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
            <div className="text-xs text-text-muted mb-1">總課數</div>
            <div className="text-2xl lg:text-3xl font-bold text-primary">
              {data?.courseCount ?? 0}
            </div>
            <div className="text-xs text-text-muted mt-1">堂</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
            <div className="text-xs text-text-muted mb-1">老師人數</div>
            <div className="text-2xl lg:text-3xl font-bold text-[#C4956A]">
              {data?.teacherCount ?? 0}
            </div>
            <div className="text-xs text-text-muted mt-1">位</div>
          </div>
        </div>
      )}

      {/* Monthly Breakdown Chart (for quarter/year mode) */}
      {data?.breakdown && data.breakdown.length > 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
          <h3 className="text-sm font-medium text-text mb-3">月度趨勢</h3>
          <div className="space-y-2">
            {data.breakdown.map(item => {
              const maxVal = Math.max(...data.breakdown.map(b => Math.max(b.revenue, b.expenses)), 1)
              return (
                <div key={item.month} className="flex items-center gap-3 text-xs">
                  <span className="w-16 text-text-muted shrink-0">{item.month}</span>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="h-2 bg-[#7B9E89] rounded-full" style={{ width: `${(item.revenue / maxVal) * 100}%`, minWidth: item.revenue > 0 ? '4px' : '0' }} />
                      <span className="text-[#7B9E89] font-medium">${item.revenue.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 bg-[#B5706E] rounded-full" style={{ width: `${(item.expenses / maxVal) * 100}%`, minWidth: item.expenses > 0 ? '4px' : '0' }} />
                      <span className="text-[#B5706E] font-medium">${item.expenses.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-text-muted">
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-[#7B9E89] rounded-full inline-block" /> 營收</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-[#B5706E] rounded-full inline-block" /> 支出</span>
          </div>
        </div>
      )}

      {/* AI Analysis */}
      <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-text">AI 財報分析</h3>
          <button
            onClick={handleAiAnalysis}
            disabled={aiLoading}
            className="px-4 py-1.5 bg-gradient-to-r from-primary to-[#7B9E89] text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {aiLoading ? '分析中...' : '產生分析報告'}
          </button>
        </div>
        {aiReport ? (
          <div className="prose prose-sm max-w-none text-text bg-surface rounded-xl p-4 whitespace-pre-wrap">
            {aiReport}
          </div>
        ) : (
          <p className="text-sm text-text-muted">點擊上方按鈕，AI 將為您分析{periodLabel}的財務狀況。</p>
        )}
      </div>
    </div>
  )
}
