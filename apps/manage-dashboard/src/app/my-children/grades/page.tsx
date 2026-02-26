'use client'

import { useEffect, useState } from 'react'

const API_BASE = ''

interface GradeRecord {
  id: string
  student_name: string
  subject?: string
  exam_name?: string
  exam_type?: string
  date?: string
  score: number
  max_score: number
  letter_grade?: string
}

export default function MyChildrenGradesPage() {
  const [grades, setGrades] = useState<GradeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadGrades = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_BASE}/api/admin/grades?limit=50`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('載入失敗')
      const json = await res.json()
      const payload = json.data ?? json
      setGrades(payload.grades || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入成績資料失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadGrades() }, [])

  const scoreColor = (letter?: string) => {
    if (!letter) return 'text-text'
    if (letter === 'A') return 'text-primary'
    if (letter === 'B') return 'text-morandi-sage'
    if (letter === 'C') return 'text-morandi-gold'
    return 'text-morandi-rose'
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-8 w-32 bg-surface-hover animate-pulse rounded-xl" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-surface-hover animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="text-6xl">⚠️</div>
        <h2 className="text-xl font-semibold text-text">載入失敗</h2>
        <p className="text-text-muted">{error}</p>
        <button
          onClick={loadGrades}
          className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
        >
          重試
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">成績查詢</h1>
        <p className="text-text-muted mt-1">查看孩子的考試成績</p>
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-background">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">學生</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">科目</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">考試</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">日期</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-text-muted">分數</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-text-muted">等第</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {grades.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-text-muted">
                  尚無成績資料
                </td>
              </tr>
            ) : (
              grades.map(g => (
                <tr key={g.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3 text-sm text-text">{g.student_name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-text">{g.subject || '—'}</td>
                  <td className="px-4 py-3 text-sm text-text">{g.exam_name || g.exam_type || '—'}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {g.date ? g.date.slice(0, 10) : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${scoreColor(g.letter_grade)}`}>
                    {g.score} / {g.max_score}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${scoreColor(g.letter_grade)}`}>
                    {g.letter_grade || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
