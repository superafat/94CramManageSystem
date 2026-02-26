'use client'

import { BackButton } from '@/components/ui/BackButton'
import { useEffect, useState } from 'react'

const API_BASE = ''

interface Student {
  id: string
  full_name: string
  grade_level?: string
  school_name?: string
  status: string
}

interface AttendanceRecord {
  id: string
  present: boolean
  status?: string
}

interface GradeRecord {
  id: string
  score: number
  max_score: number
}

interface BillingRecord {
  id: string
  amount: number
  status: string
}

export default function MyChildrenPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null)
  const [avgGrade, setAvgGrade] = useState<number | null>(null)
  const [pendingBilling, setPendingBilling] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [stuRes, attRes, gradeRes, billRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/students?limit=10`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/admin/attendance?limit=100`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/admin/grades?limit=50`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/admin/billing/payment-records`, { credentials: 'include' }),
      ])

      if (!stuRes.ok) throw new Error('載入學生資料失敗')

      const stuJson = await stuRes.json()
      const stuPayload = stuJson.data ?? stuJson
      const studentList: Student[] = stuPayload.students || []
      setStudents(studentList)
      if (studentList.length > 0) setSelectedStudent(studentList[0])

      if (attRes.ok) {
        const attJson = await attRes.json()
        const attPayload = attJson.data ?? attJson
        const records: AttendanceRecord[] = attPayload.attendance || []
        if (records.length > 0) {
          const presentCount = records.filter(r => r.present || r.status === 'present' || r.status === 'late').length
          setAttendanceRate(Math.round((presentCount / records.length) * 100))
        }
      }

      if (gradeRes.ok) {
        const gradeJson = await gradeRes.json()
        const gradePayload = gradeJson.data ?? gradeJson
        const grades: GradeRecord[] = gradePayload.grades || []
        if (grades.length > 0) {
          const avg = grades.reduce((sum, g) => sum + Number(g.score), 0) / grades.length
          setAvgGrade(Math.round(avg))
        }
      }

      if (billRes.ok) {
        const billJson = await billRes.json()
        const billPayload = billJson.data ?? billJson
        const records: BillingRecord[] = billPayload.records || []
        const pending = records.filter(r => r.status === 'pending' || r.status === 'unpaid').length
        setPendingBilling(pending)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-8 w-32 bg-surface-hover animate-pulse rounded-xl" />
        <div className="h-40 bg-surface-hover animate-pulse rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-surface-hover animate-pulse rounded-xl" />
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
          onClick={loadData}
          className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
        >
          重試
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <BackButton />

      <div>
        <h1 className="text-2xl font-bold text-text">我的孩子</h1>
        <p className="text-text-muted mt-1">查看孩子的學習狀況</p>
      </div>

      {students.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <div className="text-4xl mb-2">📭</div>
          <p>尚無關聯學生資料</p>
        </div>
      ) : (
        <>
          {/* Student selector */}
          {students.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {students.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedStudent?.id === s.id
                      ? 'bg-primary text-white'
                      : 'bg-surface border border-border text-text hover:border-primary'
                  }`}
                >
                  {s.full_name}
                </button>
              ))}
            </div>
          )}

          {/* Student card */}
          {selectedStudent && (
            <div className="bg-surface rounded-2xl border border-border p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                  👦
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text">{selectedStudent.full_name}</h2>
                  <p className="text-sm text-text-muted">
                    {selectedStudent.grade_level || '—'}
                    {selectedStudent.school_name ? ` • ${selectedStudent.school_name}` : ''}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-background rounded-xl">
                  <p className="text-2xl font-bold text-primary">
                    {attendanceRate !== null ? `${attendanceRate}%` : '—'}
                  </p>
                  <p className="text-xs text-text-muted mt-1">出席率</p>
                </div>
                <div className="text-center p-4 bg-background rounded-xl">
                  <p className="text-2xl font-bold text-morandi-sage">
                    {avgGrade !== null ? avgGrade : '—'}
                  </p>
                  <p className="text-xs text-text-muted mt-1">平均成績</p>
                </div>
                <div className="text-center p-4 bg-background rounded-xl">
                  <p className="text-2xl font-bold text-morandi-gold">
                    {pendingBilling !== null ? pendingBilling : '—'}
                  </p>
                  <p className="text-xs text-text-muted mt-1">待繳費項目</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
