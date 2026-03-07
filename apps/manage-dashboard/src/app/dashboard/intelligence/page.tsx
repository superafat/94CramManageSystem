'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface KPI {
  revenueTrend: number
  renewalRate: number
  attendanceRate: number
  parentSatisfaction: number
  teacherStability: number
}

interface DashboardData {
  healthScore: number
  kpis: KPI
  summary: string
}

function CircleGauge({ score }: { score: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? '#8FA895' : score >= 60 ? '#C4A882' : '#C47C7C'

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" className="-rotate-90">
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke="#E8E4DE"
          strokeWidth="12"
        />
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-text">{score}</span>
        <span className="text-xs text-text-muted">/ 100</span>
      </div>
    </div>
  )
}

const KPI_META: Record<keyof KPI, { label: string; icon: string; unit: string }> = {
  revenueTrend: { label: '營收趨勢', icon: '💰', unit: '%' },
  renewalRate: { label: '續費率', icon: '🔄', unit: '%' },
  attendanceRate: { label: '出席率', icon: '📅', unit: '%' },
  parentSatisfaction: { label: '家長滿意度', icon: '😊', unit: '%' },
  teacherStability: { label: '師資穩定度', icon: '👨‍🏫', unit: '%' },
}

const SUB_PAGES = [
  { href: '/dashboard/intelligence/students', icon: '🎓', label: '學習輪廓', desc: '學生流失風險分析' },
  { href: '/dashboard/intelligence/renewal', icon: '🔄', label: '續費預測', desc: '高風險學生名單' },
  { href: '/dashboard/intelligence/teachers', icon: '👨‍🏫', label: '師資績效', desc: '教師表現綜合評分' },
  { href: '/dashboard/intelligence/revenue', icon: '📊', label: '營收預測', desc: '3個月收入預測' },
]

export default function IntelligencePage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/intelligence/dashboard')
      .then(r => r.json())
      .then(d => { setData(d.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-text-muted">載入中...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">🧠 智慧中樞</h1>
        <p className="text-text-muted mt-1">經營健康度總覽與預測分析</p>
      </div>

      {/* Health Score + KPIs */}
      <div className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text mb-6">經營健康分數</h2>
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Gauge */}
          <div className="relative flex items-center justify-center w-[140px] h-[140px] shrink-0">
            <CircleGauge score={data?.healthScore ?? 0} />
          </div>

          {/* KPI Breakdown */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
            {data?.kpis && (Object.keys(KPI_META) as Array<keyof KPI>).map(key => {
              const meta = KPI_META[key]
              const value = data.kpis[key]
              const bar = Math.min(100, Math.max(0, value))
              return (
                <div key={key} className="bg-morandi-cream rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{meta.icon}</span>
                    <span className="text-sm font-medium text-text">{meta.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${bar}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-text shrink-0">
                      {value}{meta.unit}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {data?.summary && (
          <p className="mt-4 text-sm text-text-muted bg-morandi-fog rounded-xl px-4 py-2">
            {data.summary}
          </p>
        )}
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-sm font-medium text-text-muted mb-3">分析模組</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {SUB_PAGES.map(page => (
            <Link
              key={page.href}
              href={page.href}
              className="flex flex-col gap-2 p-4 bg-surface rounded-2xl border border-border hover:border-primary transition-colors"
            >
              <span className="text-2xl">{page.icon}</span>
              <div>
                <div className="font-medium text-text text-sm">{page.label}</div>
                <div className="text-xs text-text-muted mt-0.5">{page.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
