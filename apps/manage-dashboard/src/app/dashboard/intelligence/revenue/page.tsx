'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface MonthForecast {
  month: string
  expectedRevenue: number
  confidencePercent: number
  seasonalFactor: number
  churnAdjustment: number
}

export default function RevenueForecastPage() {
  const [forecasts, setForecasts] = useState<MonthForecast[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/intelligence/revenue-forecast')
      .then(r => r.json())
      .then(d => { setForecasts(d.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-text-muted">載入中...</div>

  const maxRevenue = forecasts.length > 0 ? Math.max(...forecasts.map(f => f.expectedRevenue)) : 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/intelligence" className="text-text-muted hover:text-text transition-colors text-sm">
          ← 智慧中樞
        </Link>
        <h1 className="text-2xl font-bold text-text">📊 營收預測</h1>
      </div>

      {/* Bar Chart Visual */}
      {forecasts.length > 0 && (
        <div className="bg-surface rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-text mb-4">3 個月預測圖</h2>
          <div className="flex items-end gap-4 h-32">
            {forecasts.map(f => {
              const barHeight = maxRevenue > 0 ? (f.expectedRevenue / maxRevenue) * 100 : 0
              return (
                <div key={f.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-text font-semibold">
                    NT${f.expectedRevenue.toLocaleString()}
                  </span>
                  <div className="w-full flex items-end" style={{ height: '80px' }}>
                    <div
                      className="w-full bg-primary rounded-t-lg"
                      style={{ height: `${barHeight}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-muted">{f.month}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Forecast Cards */}
      {forecasts.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border p-8 text-center text-text-muted text-sm">
          尚無預測資料
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {forecasts.map((f, i) => (
            <div key={f.month} className="bg-surface rounded-2xl border border-border p-5">
              {/* Month label */}
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-text">{f.month}</span>
                <span className="text-xs text-text-muted px-2 py-0.5 bg-morandi-cream rounded-lg">
                  第 {i + 1} 個月
                </span>
              </div>

              {/* Revenue */}
              <div className="mb-4">
                <div className="text-xs text-text-muted mb-0.5">預估營收</div>
                <div className="text-2xl font-bold text-text">
                  NT${f.expectedRevenue.toLocaleString()}
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-3">
                {/* Confidence */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-muted">信心度</span>
                    <span className="font-medium text-text">{f.confidencePercent}%</span>
                  </div>
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${f.confidencePercent}%` }}
                    />
                  </div>
                </div>

                {/* Seasonal Factor */}
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">季節因子</span>
                  <span className={`font-medium ${f.seasonalFactor >= 1 ? 'text-green-600' : 'text-red-500'}`}>
                    {f.seasonalFactor >= 1 ? '+' : ''}{((f.seasonalFactor - 1) * 100).toFixed(1)}%
                  </span>
                </div>

                {/* Churn Adjustment */}
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">流失調整</span>
                  <span className={`font-medium ${f.churnAdjustment >= 0 ? 'text-text' : 'text-red-500'}`}>
                    {f.churnAdjustment >= 0 ? '+' : ''}NT${f.churnAdjustment.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
