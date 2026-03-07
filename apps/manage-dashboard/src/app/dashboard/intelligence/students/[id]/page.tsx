'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { use } from 'react'

interface StudentDetail {
  studentId: string
  studentName: string
  grade: string
  guardian: string
  churnRiskScore: number
  renewalProbability: number
  paymentStatus: 'paid' | 'overdue' | 'pending'
  avgScoreTrend: number
  attendanceRate: number
  engagementScore: number
  supportNeed: number
  notes: string
}

const PAYMENT_LABEL: Record<string, string> = {
  paid: '已繳費',
  overdue: '逾期未繳',
  pending: '待繳費',
}

const PAYMENT_COLOR: Record<string, string> = {
  paid: 'text-green-600',
  overdue: 'text-red-500',
  pending: 'text-yellow-600',
}

interface StatBarProps {
  label: string
  value: number
  max?: number
  color?: string
}

function StatBar({ label, value, max = 100, color = 'bg-primary' }: StatBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm text-text">{label}</span>
        <span className="text-sm font-semibold text-text">{value}</span>
      </div>
      <div className="h-3 bg-border rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/intelligence/learning-profiles/${id}`)
      .then(r => r.json())
      .then(d => { setData(d.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-8 text-center text-text-muted">載入中...</div>

  if (!data) return (
    <div className="p-8 text-center">
      <p className="text-text-muted">找不到學生資料</p>
      <Link href="/dashboard/intelligence/students" className="text-primary hover:underline text-sm mt-2 inline-block">
        返回列表
      </Link>
    </div>
  )

  const riskColor = data.churnRiskScore >= 70 ? 'text-red-600 bg-red-50' :
    data.churnRiskScore >= 40 ? 'text-yellow-600 bg-yellow-50' : 'text-green-600 bg-green-50'

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/dashboard/intelligence" className="text-text-muted hover:text-text transition-colors">智慧中樞</Link>
        <span className="text-text-muted">/</span>
        <Link href="/dashboard/intelligence/students" className="text-text-muted hover:text-text transition-colors">學習輪廓</Link>
        <span className="text-text-muted">/</span>
        <span className="text-text">{data.studentName}</span>
      </div>

      {/* Student Info */}
      <div className="bg-surface rounded-2xl border border-border p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text">{data.studentName}</h1>
            <div className="flex gap-4 mt-1 text-sm text-text-muted">
              <span>年級：{data.grade}</span>
              <span>監護人：{data.guardian}</span>
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-xl text-sm font-medium ${PAYMENT_COLOR[data.paymentStatus] ?? 'text-text-muted'}`}>
            {PAYMENT_LABEL[data.paymentStatus] ?? data.paymentStatus}
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`rounded-xl p-4 ${riskColor}`}>
          <div className="text-xs font-medium mb-1 opacity-70">流失風險分數</div>
          <div className="text-3xl font-bold">{data.churnRiskScore}</div>
          <div className="text-xs mt-1 opacity-70">/ 100</div>
        </div>
        <div className="bg-surface rounded-xl p-4 border border-border">
          <div className="text-xs font-medium text-text-muted mb-1">續費機率</div>
          <div className="text-3xl font-bold text-text">{data.renewalProbability}%</div>
        </div>
        <div className="bg-surface rounded-xl p-4 border border-border">
          <div className="text-xs font-medium text-text-muted mb-1">平均成績趨勢</div>
          <div className={`text-3xl font-bold ${data.avgScoreTrend > 0 ? 'text-green-600' : data.avgScoreTrend < 0 ? 'text-red-500' : 'text-text'}`}>
            {data.avgScoreTrend > 0 ? '+' : ''}{data.avgScoreTrend}
          </div>
        </div>
        <div className="bg-surface rounded-xl p-4 border border-border">
          <div className="text-xs font-medium text-text-muted mb-1">出席率</div>
          <div className="text-3xl font-bold text-text">{data.attendanceRate}%</div>
        </div>
      </div>

      {/* Performance Bars */}
      <div className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text mb-4">能力指標分析</h2>
        <div className="space-y-4">
          <StatBar label="出席率" value={data.attendanceRate} color="bg-primary" />
          <StatBar label="參與度" value={data.engagementScore} color="bg-morandi-sage" />
          <StatBar label="續費機率" value={data.renewalProbability} color="bg-green-400" />
          <StatBar
            label="流失風險"
            value={data.churnRiskScore}
            color={data.churnRiskScore >= 70 ? 'bg-red-400' : data.churnRiskScore >= 40 ? 'bg-yellow-400' : 'bg-green-400'}
          />
          <StatBar label="支援需求" value={data.supportNeed} color="bg-orange-300" />
        </div>
      </div>

      {/* Notes */}
      {data.notes && (
        <div className="bg-morandi-cream rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-text mb-2">📝 備註</h2>
          <p className="text-sm text-text-muted">{data.notes}</p>
        </div>
      )}
    </div>
  )
}
