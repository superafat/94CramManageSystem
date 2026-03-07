'use client'

import { useEffect, useState } from 'react'

interface AnalyticsData {
  total_questions: number
  avg_per_day: number
  most_active_student: string
  most_active_count: number
  subject_breakdown: { subject: string; count: number }[]
  top_questions: { question: string; count: number }[]
}

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}

export default function AiTutorAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/ai-tutor/analytics', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setData({
          total_questions: d.total_questions ?? 0,
          avg_per_day: d.avg_per_day ?? 0,
          most_active_student: d.most_active_student ?? '—',
          most_active_count: d.most_active_count ?? 0,
          subject_breakdown: d.subject_breakdown ?? [],
          top_questions: d.top_questions ?? [],
        })
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [])

  if (loading) return <Loading />

  if (error || !data) {
    return (
      <div className="text-center py-16 text-text-muted">
        <p className="text-4xl mb-3">📊</p>
        <p className="font-medium">無法載入統計資料</p>
        <p className="text-sm mt-1">請稍後再試</p>
      </div>
    )
  }

  const maxSubjectCount = Math.max(...data.subject_breakdown.map(s => s.count), 1)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">📊</span>
        <div>
          <h1 className="text-2xl font-bold text-text">統計分析</h1>
          <p className="text-sm text-text-muted">神算子 AI 課業助教</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">累計問答數</p>
          <p className="text-2xl font-bold text-text">{data.total_questions}</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">平均每日問答</p>
          <p className="text-2xl font-bold text-text">{data.avg_per_day}</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">最活躍學生</p>
          <p className="text-xl font-bold text-text truncate">{data.most_active_student}</p>
          {data.most_active_count > 0 && (
            <p className="text-xs text-text-muted mt-0.5">{data.most_active_count} 題</p>
          )}
        </div>
      </div>

      {/* Subject Breakdown */}
      {data.subject_breakdown.length > 0 && (
        <div className="bg-surface rounded-2xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-text mb-4">科目分布</h2>
          <div className="space-y-3">
            {data.subject_breakdown.map(item => (
              <div key={item.subject}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text font-medium">{item.subject}</span>
                  <span className="text-text-muted">{item.count} 題</span>
                </div>
                <div className="w-full bg-border rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full bg-primary transition-all"
                    style={{ width: `${Math.round((item.count / maxSubjectCount) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Questions */}
      <div className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text mb-4">熱門問題 Top 10</h2>
        {data.top_questions.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-4">尚無問題紀錄</p>
        ) : (
          <div className="space-y-0">
            {data.top_questions.slice(0, 10).map((q, idx) => (
              <div
                key={idx}
                className="flex items-start gap-4 py-3 border-b border-border last:border-0"
              >
                <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  idx === 0 ? 'bg-warning text-white' :
                  idx === 1 ? 'bg-border text-text-muted' :
                  idx === 2 ? 'bg-primary/20 text-primary' :
                  'bg-surface text-text-muted border border-border'
                }`}>
                  {idx + 1}
                </span>
                <p className="flex-1 text-sm text-text">{q.question}</p>
                <span className="shrink-0 text-xs text-text-muted bg-surface-hover px-2 py-0.5 rounded-full">
                  {q.count} 次
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
