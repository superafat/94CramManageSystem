'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface RenewalPrediction {
  studentId: string
  studentName: string
  grade: string
  renewalProbability: number
  riskLevel: 'high' | 'medium' | 'low'
  lastPaymentDate: string
  recommendedAction: string
}

interface RenewalSummary {
  totalStudents: number
  avgRenewalRate: number
  highRiskCount: number
  mediumRiskCount: number
  lowRiskCount: number
}

const RISK_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
}

const RISK_LABEL: Record<string, string> = {
  high: '高風險',
  medium: '中風險',
  low: '低風險',
}

export default function RenewalPage() {
  const [predictions, setPredictions] = useState<RenewalPrediction[]>([])
  const [summary, setSummary] = useState<RenewalSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/intelligence/renewal-predictions').then(r => r.json()),
      fetch('/api/admin/intelligence/renewal-predictions/summary').then(r => r.json()),
    ]).then(([predsData, summaryData]) => {
      setPredictions(predsData.data ?? [])
      setSummary(summaryData.data ?? null)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-text-muted">載入中...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/intelligence" className="text-text-muted hover:text-text transition-colors text-sm">
          ← 智慧中樞
        </Link>
        <h1 className="text-2xl font-bold text-text">🔄 續費預測</h1>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-surface rounded-xl border border-border p-4 lg:col-span-1">
            <div className="text-xs text-text-muted mb-1">學生總數</div>
            <div className="text-2xl font-bold text-text">{summary.totalStudents}</div>
          </div>
          <div className="bg-surface rounded-xl border border-border p-4 lg:col-span-1">
            <div className="text-xs text-text-muted mb-1">平均續費率</div>
            <div className="text-2xl font-bold text-primary">{summary.avgRenewalRate}%</div>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-100 p-4">
            <div className="text-xs text-red-600 mb-1">高風險</div>
            <div className="text-2xl font-bold text-red-700">{summary.highRiskCount}</div>
            <div className="text-xs text-red-500 mt-0.5">人</div>
          </div>
          <div className="bg-yellow-50 rounded-xl border border-yellow-100 p-4">
            <div className="text-xs text-yellow-600 mb-1">中風險</div>
            <div className="text-2xl font-bold text-yellow-700">{summary.mediumRiskCount}</div>
            <div className="text-xs text-yellow-500 mt-0.5">人</div>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-100 p-4">
            <div className="text-xs text-green-600 mb-1">低風險</div>
            <div className="text-2xl font-bold text-green-700">{summary.lowRiskCount}</div>
            <div className="text-xs text-green-500 mt-0.5">人</div>
          </div>
        </div>
      )}

      {/* At-risk Students Table */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-text">待追蹤學生</h2>
          <p className="text-xs text-text-muted mt-0.5">依續費機率由低到高排序</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-morandi-cream">
                <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">姓名</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">年級</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">風險等級</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">續費機率</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">上次繳費</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">建議行動</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {predictions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-muted text-sm">尚無資料</td>
                </tr>
              ) : (
                [...predictions]
                  .sort((a, b) => a.renewalProbability - b.renewalProbability)
                  .map(pred => (
                    <tr key={pred.studentId} className="hover:bg-morandi-fog transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-text">{pred.studentName}</td>
                      <td className="px-4 py-3 text-sm text-text-muted">{pred.grade}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${RISK_BADGE[pred.riskLevel] ?? 'bg-gray-100 text-gray-600'}`}>
                          {RISK_LABEL[pred.riskLevel] ?? pred.riskLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pred.renewalProbability < 40 ? 'bg-red-400' : pred.renewalProbability < 70 ? 'bg-yellow-400' : 'bg-green-400'}`}
                              style={{ width: `${pred.renewalProbability}%` }}
                            />
                          </div>
                          <span className="text-sm text-text">{pred.renewalProbability}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {pred.lastPaymentDate ? new Date(pred.lastPaymentDate).toLocaleDateString('zh-TW') : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">{pred.recommendedAction || '—'}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
