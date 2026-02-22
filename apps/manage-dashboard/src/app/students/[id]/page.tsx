'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiFetch, type Student } from '@/lib/api'

interface AttendanceRecord {
  id: string
  date: string
  status: 'present' | 'absent' | 'late'
  course?: string
  notes?: string
}

interface GradeRecord {
  id: string
  subject: string
  score: number
  maxScore: number
  date: string
  examType?: string
  notes?: string
}

export default function StudentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params?.id as string

  const [student, setStudent] = useState<Student | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [grades, setGrades] = useState<GradeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!studentId) return

    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch student details
        const studentData = await apiFetch<{ student: Student }>(`/admin/students/${studentId}`)
        setStudent(studentData.student)

        // Try to fetch attendance (optional)
        try {
          const attendanceData = await apiFetch<{ records: AttendanceRecord[] }>(
            `/admin/attendance?studentId=${studentId}`
          )
          setAttendance(attendanceData.records ?? [])
        } catch {
          // Attendance API may not exist yet
          setAttendance([])
        }

        // Try to fetch grades (optional)
        try {
          const gradesData = await apiFetch<{ grades: GradeRecord[] }>(
            `/admin/grades?studentId=${studentId}`
          )
          setGrades(gradesData.grades ?? [])
        } catch {
          // Grades API may not exist yet
          setGrades([])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '載入學生資料失敗')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [studentId])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-surface-hover animate-pulse rounded-xl" />
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-surface-hover animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="text-6xl">⚠️</div>
        <h2 className="text-xl font-semibold text-text">載入失敗</h2>
        <p className="text-text-muted">{error ?? '找不到學生資料'}</p>
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-surface border border-border text-text rounded-xl hover:bg-surface-hover transition-colors"
          >
            返回
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
          >
            重試
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-surface-hover rounded-xl transition-colors text-text-muted hover:text-text"
          >
            ← 返回
          </button>
          <h1 className="text-2xl font-semibold text-text">{student.name}</h1>
        </div>
      </div>

      {/* Personal Info Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
        <h2 className="text-lg font-semibold text-text mb-4">個人資料</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <InfoField label="年級" value={student.grade} />
          <InfoField label="電話" value={student.phone} />
          <InfoField label="Email" value={student.email} />
          <InfoField label="加入日期" value={student.joined_date} />
          <InfoField label="狀態" value={<StatusBadge status={student.status} />} />
          <InfoField label="風險等級" value={<RiskBadge level={student.risk_level} />} />
          <div className="md:col-span-2 lg:col-span-3">
            <InfoField
              label="科目"
              value={
                student.subjects && student.subjects.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {student.subjects.map((subject, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-lg"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                ) : undefined
              }
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-text-muted">出席率</h3>
            <span className="text-2xl">✅</span>
          </div>
          <div className="text-3xl font-bold text-text">
            {student.attendance_rate != null ? `${student.attendance_rate}%` : '—'}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-text-muted">平均成績</h3>
            <span className="text-2xl">📊</span>
          </div>
          <div className="text-3xl font-bold text-text">
            {student.average_grade != null ? student.average_grade : '—'}
          </div>
        </div>
      </div>

      {/* Attendance Records */}
      <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
        <h2 className="text-lg font-semibold text-text mb-4">出席紀錄</h2>
        {attendance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text">日期</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text">課程</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-text">狀態</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text">備註</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attendance.map((record) => (
                  <tr key={record.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3 text-sm text-text">{record.date}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{record.course ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <AttendanceStatusBadge status={record.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">{record.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-text-muted">
            暫無出席紀錄
          </div>
        )}
      </div>

      {/* Grade Records */}
      <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
        <h2 className="text-lg font-semibold text-text mb-4">成績歷史</h2>
        {grades.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text">日期</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text">科目</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text">考試類型</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-text">成績</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text">備註</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {grades.map((record) => (
                  <tr key={record.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3 text-sm text-text">{record.date}</td>
                    <td className="px-4 py-3 text-sm text-text">{record.subject}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{record.examType ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium text-text">
                        {record.score} / {record.maxScore}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">{record.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-text-muted">
            暫無成績紀錄
          </div>
        )}
      </div>
    </div>
  )
}

// Helper Components
function InfoField({ label, value }: { label: string; value?: React.ReactNode | string }) {
  return (
    <div>
      <div className="text-xs text-text-muted mb-1 font-medium">{label}</div>
      <div className="text-sm text-text">{value ?? '未提供'}</div>
    </div>
  )
}

function StatusBadge({ status }: { status?: 'active' | 'at_risk' | 'inactive' }) {
  if (!status) return <span className="text-sm text-text-muted">—</span>

  const styles = {
    active: 'bg-[#7B9E89]/10 text-[#7B9E89] border-[#7B9E89]/20',
    at_risk: 'bg-[#C4956A]/10 text-[#C4956A] border-[#C4956A]/20',
    inactive: 'bg-[#B5706E]/10 text-[#B5706E] border-[#B5706E]/20',
  }

  const labels = {
    active: '正常',
    at_risk: '注意',
    inactive: '停課',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

function RiskBadge({ level }: { level?: 'high' | 'medium' | 'low' | null }) {
  if (!level) return <span className="text-sm text-text-muted">—</span>

  const styles = {
    high: 'bg-[#B5706E]/10 text-[#B5706E] border-[#B5706E]/20',
    medium: 'bg-[#C4956A]/10 text-[#C4956A] border-[#C4956A]/20',
    low: 'bg-[#7B9E89]/10 text-[#7B9E89] border-[#7B9E89]/20',
  }

  const labels = {
    high: '高風險',
    medium: '中風險',
    low: '低風險',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[level]}`}>
      {labels[level]}
    </span>
  )
}

function AttendanceStatusBadge({ status }: { status: 'present' | 'absent' | 'late' }) {
  const styles = {
    present: 'bg-[#7B9E89]/10 text-[#7B9E89] border-[#7B9E89]/20',
    late: 'bg-[#C4956A]/10 text-[#C4956A] border-[#C4956A]/20',
    absent: 'bg-[#B5706E]/10 text-[#B5706E] border-[#B5706E]/20',
  }

  const labels = {
    present: '出席',
    late: '遲到',
    absent: '缺席',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
