'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface LearningProfile {
  studentId: string
  studentName: string
  grade: string
  paymentStatus: 'paid' | 'overdue' | 'pending'
  churnRisk: 'high' | 'medium' | 'low'
  renewalProbability: number
  scoreTrend: number
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

const PAYMENT_BADGE: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
}

const PAYMENT_LABEL: Record<string, string> = {
  paid: '已繳費',
  overdue: '逾期',
  pending: '待繳',
}

export default function StudentsIntelligencePage() {
  const [profiles, setProfiles] = useState<LearningProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/intelligence/learning-profiles')
      .then(r => r.json())
      .then(d => { setProfiles(d.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-text-muted">載入中...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/intelligence" className="text-text-muted hover:text-text transition-colors text-sm">
          ← 智慧中樞
        </Link>
        <h1 className="text-2xl font-bold text-text">🎓 學習輪廓</h1>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        {(['high', 'medium', 'low'] as const).map(risk => {
          const count = profiles.filter(p => p.churnRisk === risk).length
          return (
            <div key={risk} className={`rounded-xl p-4 ${risk === 'high' ? 'bg-red-50 border border-red-100' : risk === 'medium' ? 'bg-yellow-50 border border-yellow-100' : 'bg-green-50 border border-green-100'}`}>
              <div className="text-2xl font-bold text-text">{count}</div>
              <div className={`text-sm font-medium ${risk === 'high' ? 'text-red-600' : risk === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                {RISK_LABEL[risk]}
              </div>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-morandi-cream">
                <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">姓名</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">年級</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">繳費狀態</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">流失風險</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">續費機率</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">成績趨勢</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-muted"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-text-muted text-sm">尚無資料</td>
                </tr>
              ) : (
                profiles.map(profile => (
                  <tr key={profile.studentId} className="hover:bg-morandi-fog transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-text">{profile.studentName}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{profile.grade}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${PAYMENT_BADGE[profile.paymentStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                        {PAYMENT_LABEL[profile.paymentStatus] ?? profile.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${RISK_BADGE[profile.churnRisk] ?? 'bg-gray-100 text-gray-600'}`}>
                        {RISK_LABEL[profile.churnRisk] ?? profile.churnRisk}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${profile.renewalProbability}%` }}
                          />
                        </div>
                        <span className="text-sm text-text">{profile.renewalProbability}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${profile.scoreTrend > 0 ? 'text-green-600' : profile.scoreTrend < 0 ? 'text-red-500' : 'text-text-muted'}`}>
                        {profile.scoreTrend > 0 ? '▲' : profile.scoreTrend < 0 ? '▼' : '—'} {Math.abs(profile.scoreTrend)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/intelligence/students/${profile.studentId}`}
                        className="text-primary text-sm hover:underline"
                      >
                        詳情 →
                      </Link>
                    </td>
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
