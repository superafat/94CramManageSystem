'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface TeacherPerformance {
  teacherId: string
  teacherName: string
  overallScore: number
  attendanceRate: number
  retentionRate: number
  satisfaction: number
  classCount: number
  studentCount: number
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-green-100 text-green-700' :
    score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
  return (
    <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${color}`}>
      {score}
    </span>
  )
}

function MiniBar({ value, color = 'bg-primary' }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="text-xs text-text w-10 text-right">{value}%</span>
    </div>
  )
}

export default function TeachersPerformancePage() {
  const [teachers, setTeachers] = useState<TeacherPerformance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/intelligence/teacher-performance')
      .then(r => r.json())
      .then(d => { setTeachers(d.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-text-muted">載入中...</div>

  const sorted = [...teachers].sort((a, b) => b.overallScore - a.overallScore)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/intelligence" className="text-text-muted hover:text-text transition-colors text-sm">
          ← 智慧中樞
        </Link>
        <h1 className="text-2xl font-bold text-text">👨‍🏫 師資績效</h1>
      </div>

      {/* Summary Bar */}
      {teachers.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface rounded-xl border border-border p-4">
            <div className="text-xs text-text-muted mb-1">教師總數</div>
            <div className="text-2xl font-bold text-text">{teachers.length}</div>
          </div>
          <div className="bg-surface rounded-xl border border-border p-4">
            <div className="text-xs text-text-muted mb-1">平均績效分</div>
            <div className="text-2xl font-bold text-primary">
              {Math.round(teachers.reduce((s, t) => s + t.overallScore, 0) / teachers.length)}
            </div>
          </div>
          <div className="bg-surface rounded-xl border border-border p-4">
            <div className="text-xs text-text-muted mb-1">最高分教師</div>
            <div className="text-base font-semibold text-text truncate">{sorted[0]?.teacherName ?? '—'}</div>
          </div>
        </div>
      )}

      {/* Teacher Cards */}
      {sorted.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border p-8 text-center text-text-muted text-sm">
          尚無資料
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sorted.map((teacher, index) => (
            <div key={teacher.teacherId} className="bg-surface rounded-2xl border border-border p-5">
              {/* Header row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-morandi-cream flex items-center justify-center text-sm font-semibold text-text">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-text">{teacher.teacherName}</div>
                    <div className="text-xs text-text-muted">
                      {teacher.classCount} 堂課 · {teacher.studentCount} 位學生
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">總分</span>
                  <ScoreBadge score={teacher.overallScore} />
                </div>
              </div>

              {/* Overall score bar */}
              <div className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-text-muted font-medium">綜合績效</span>
                  <span className="text-xs font-semibold text-text">{teacher.overallScore} / 100</span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${teacher.overallScore}%` }}
                  />
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-2 mt-4">
                <div>
                  <div className="text-xs text-text-muted mb-1">出席率</div>
                  <MiniBar value={teacher.attendanceRate} color="bg-green-400" />
                </div>
                <div>
                  <div className="text-xs text-text-muted mb-1">學生留存率</div>
                  <MiniBar value={teacher.retentionRate} color="bg-primary" />
                </div>
                <div>
                  <div className="text-xs text-text-muted mb-1">家長滿意度</div>
                  <MiniBar value={teacher.satisfaction} color="bg-morandi-sage" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
