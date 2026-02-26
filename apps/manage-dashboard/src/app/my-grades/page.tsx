'use client'

import { BackButton } from '@/components/ui/BackButton'
import { useEffect, useState } from 'react'

interface GradeRecord {
  id: string
  student_id: string
  subject: string
  exam_name: string
  date: string
  score: number
  max_score: number
  full_score: number
}

const API_BASE = ''

const getScoreColor = (score: number, max: number) => {
  const pct = (score / max) * 100
  if (pct >= 90) return 'text-morandi-sage'
  if (pct >= 70) return 'text-primary'
  return 'text-text'
}

export default function MyGradesPage() {
  const [records, setRecords] = useState<GradeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadGrades = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_BASE}/api/admin/grades?limit=100`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('載入失敗')
      const json = await res.json()
      const payload = json.data ?? json
      setRecords(payload.grades || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadGrades() }, [])

  const avgScore = records.length
    ? Math.round(records.reduce((sum, r) => sum + r.score, 0) / records.length)
    : 0

  const highScore = records.length
    ? Math.max(...records.map(r => r.score))
    : 0

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-24 bg-surface-hover animate-pulse rounded" />
        <div className="h-8 w-48 bg-surface-hover animate-pulse rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-hover animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="h-48 bg-surface-hover animate-pulse rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <BackButton />

      <div>
        <h1 className="text-2xl font-bold text-text">我的成績</h1>
        <p className="text-text-muted mt-1">查看歷次考試成績</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex justify-between items-center">
          <span>{error}</span>
          <button onClick={loadGrades} className="text-sm underline">重試</button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface rounded-2xl border border-border p-6 text-center">
          <p className="text-3xl font-bold text-primary">{avgScore || '-'}</p>
          <p className="text-sm text-text-muted mt-1">本學期平均</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-6 text-center">
          <p className="text-3xl font-bold text-morandi-sage">{highScore || '-'}</p>
          <p className="text-sm text-text-muted mt-1">最高分</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-6 text-center">
          <p className="text-3xl font-bold text-text">{records.length}</p>
          <p className="text-sm text-text-muted mt-1">考試次數</p>
        </div>
      </div>

      {records.length === 0 && !error ? (
        <div className="bg-surface rounded-2xl border border-border p-12 text-center text-text-muted">
          尚無成績資料
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">科目</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">考試</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">日期</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-text-muted">分數</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.map((record) => {
                const max = record.max_score || record.full_score || 100
                return (
                  <tr key={record.id}>
                    <td className="px-4 py-3 text-sm">{record.subject || '-'}</td>
                    <td className="px-4 py-3 text-sm">{record.exam_name}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{record.date}</td>
                    <td className={`px-4 py-3 text-right font-medium ${getScoreColor(record.score, max)}`}>
                      {record.score}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
