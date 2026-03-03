'use client'

import { useEffect, useState, useRef } from 'react'
import { BackButton } from '@/components/ui/BackButton'

// ───────────── Types ─────────────

interface SalaryAdjustment {
  type: string
  name: string
  amount: string
}

interface TeacherSalary {
  teacher_id: string
  teacher_name: string
  title: string
  teacher_role?: string
  salary_type: string
  rate_per_class: string
  base_salary: string
  hourly_rate: string
  total_classes: number
  total_hours?: number
  base_amount: number
  bonus_total: number
  deduction_total: number
  total_amount: number
  adjustments: SalaryAdjustment[]
}

interface SalaryData {
  period: { start: string; end: string }
  teachers: TeacherSalary[]
  grand_total_classes: number
  grand_total_amount: number
}

interface ScheduleItem {
  id: string
  teacher_id: string
  teacher_name?: string
  course_name: string
  start_time: string
  end_time: string
  duration_hours?: number
  status: string
  // Individual tutoring fields
  is_individual?: boolean
  per_session_fee?: number
}

interface AttendanceStats {
  teacher_id: string
  sick_leave_days: number
  personal_leave_days: number
  absent_days: number
  total_leave_days: number
}

// ───────────── Constants ─────────────

const API_BASE = ''

const SALARY_TYPE_LABELS: Record<string, string> = {
  monthly: '月薪制',
  hourly: '時薪制',
  per_class: '堂薪制',
}

const getMonthRange = (offset: number = 0) => {
  const date = new Date()
  date.setMonth(date.getMonth() + offset)
  const year = date.getFullYear()
  const month = date.getMonth()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    label: `${year}年${month + 1}月`,
    year,
    month: month + 1,
  }
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toTimeString().slice(0, 5)
}

const getWeekNumber = (dateStr: string): number => {
  const d = new Date(dateStr)
  const dayOfMonth = d.getDate()
  return Math.ceil(dayOfMonth / 7)
}

const groupByWeek = (schedules: ScheduleItem[]) => {
  const weeks: Record<number, ScheduleItem[]> = {}
  for (const s of schedules) {
    const w = getWeekNumber(s.start_time)
    if (!weeks[w]) weeks[w] = []
    weeks[w].push(s)
  }
  return weeks
}

// ───────────── Salary Slip Modal ─────────────

interface SlipProps {
  teacher: TeacherSalary
  schedules: ScheduleItem[]
  attendance: AttendanceStats | null
  period: string
  onClose: () => void
}

function SalarySlipModal({ teacher, schedules, attendance, period, onClose }: SlipProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const content = printRef.current?.innerHTML ?? ''
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>薪資條</title>
      <style>
        body { font-family: 'Noto Sans TC', sans-serif; padding: 24px; color: #333; }
        h2 { text-align: center; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        td, th { border: 1px solid #ccc; padding: 8px 12px; font-size: 13px; }
        th { background: #f5f5f5; }
        .total { font-weight: bold; background: #eef; }
      </style>
      </head><body>${content}</body></html>
    `)
    win.document.close()
    win.print()
  }

  const leaveDeduction = (() => {
    if (teacher.salary_type !== 'monthly' || !attendance) return 0
    const dailyRate = Number(teacher.base_salary) / 30
    return Math.round(attendance.personal_leave_days * dailyRate)
  })()

  const netAmount = teacher.total_amount - leaveDeduction

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">薪資條</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm"
            >
              🖨️ 列印
            </button>
            <button onClick={onClose} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600">
              關閉
            </button>
          </div>
        </div>

        <div ref={printRef} className="p-5 space-y-4">
          <h2 className="text-center text-base font-bold text-gray-800">
            {period} 薪資條
          </h2>

          {/* Basic Info */}
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <tbody>
              <tr>
                <td className="bg-gray-50 px-3 py-2 text-gray-500 w-28">姓名</td>
                <td className="px-3 py-2 font-medium">{teacher.teacher_name}</td>
                <td className="bg-gray-50 px-3 py-2 text-gray-500 w-24">職稱</td>
                <td className="px-3 py-2">{teacher.title}</td>
              </tr>
              <tr>
                <td className="bg-gray-50 px-3 py-2 text-gray-500">薪資類型</td>
                <td className="px-3 py-2">{SALARY_TYPE_LABELS[teacher.salary_type] ?? '堂薪制'}</td>
                <td className="bg-gray-50 px-3 py-2 text-gray-500">計薪月份</td>
                <td className="px-3 py-2">{period}</td>
              </tr>
            </tbody>
          </table>

          {/* Salary Detail */}
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-gray-600">項目</th>
                <th className="px-3 py-2 text-right text-gray-600">金額</th>
              </tr>
            </thead>
            <tbody>
              {/* Base */}
              {teacher.salary_type === 'monthly' && (
                <tr>
                  <td className="px-3 py-2 text-gray-700">月薪底薪</td>
                  <td className="px-3 py-2 text-right">${Number(teacher.base_salary).toLocaleString()}</td>
                </tr>
              )}
              {teacher.salary_type === 'per_class' && (
                <tr>
                  <td className="px-3 py-2 text-gray-700">
                    堂薪 ${Number(teacher.rate_per_class).toLocaleString()} × {teacher.total_classes} 堂
                  </td>
                  <td className="px-3 py-2 text-right">${teacher.base_amount.toLocaleString()}</td>
                </tr>
              )}
              {teacher.salary_type === 'hourly' && (
                <tr>
                  <td className="px-3 py-2 text-gray-700">
                    時薪 ${Number(teacher.hourly_rate).toLocaleString()} × {teacher.total_hours ?? teacher.total_classes} 時
                  </td>
                  <td className="px-3 py-2 text-right">${teacher.base_amount.toLocaleString()}</td>
                </tr>
              )}

              {/* Individual sessions */}
              {schedules.filter(s => s.is_individual).length > 0 && (
                <tr>
                  <td className="px-3 py-2 text-gray-700">
                    個指課程 {schedules.filter(s => s.is_individual).length} 堂
                  </td>
                  <td className="px-3 py-2 text-right">
                    ${schedules.filter(s => s.is_individual).reduce((acc, s) => acc + (s.per_session_fee ?? 0), 0).toLocaleString()}
                  </td>
                </tr>
              )}

              {/* Bonuses */}
              {teacher.adjustments?.filter(a => a.type === 'bonus').map((a, i) => (
                <tr key={i} className="text-green-700">
                  <td className="px-3 py-2">+ {a.name}</td>
                  <td className="px-3 py-2 text-right">${Number(a.amount).toLocaleString()}</td>
                </tr>
              ))}

              {/* Deductions */}
              {teacher.adjustments?.filter(a => a.type === 'deduction').map((a, i) => (
                <tr key={i} className="text-red-700">
                  <td className="px-3 py-2">- {a.name}</td>
                  <td className="px-3 py-2 text-right">-${Number(a.amount).toLocaleString()}</td>
                </tr>
              ))}

              {/* Leave deduction */}
              {leaveDeduction > 0 && (
                <tr className="text-red-700">
                  <td className="px-3 py-2">
                    - 事假扣薪（{attendance?.personal_leave_days} 天）
                  </td>
                  <td className="px-3 py-2 text-right">-${leaveDeduction.toLocaleString()}</td>
                </tr>
              )}

              {/* Total */}
              <tr className="bg-indigo-50 font-bold">
                <td className="px-3 py-2 text-gray-800">實發金額</td>
                <td className="px-3 py-2 text-right text-indigo-700 text-base">
                  ${netAmount.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Attendance */}
          {attendance && (
            <div className="text-xs text-gray-500 border border-gray-100 rounded-lg p-3 space-y-1">
              <p className="font-medium text-gray-700 mb-1">出缺勤紀錄</p>
              <p>病假：{attendance.sick_leave_days} 天（不扣薪）</p>
              <p>事假：{attendance.personal_leave_days} 天{leaveDeduction > 0 ? `（扣 $${leaveDeduction.toLocaleString()}）` : ''}</p>
              <p>曠職：{attendance.absent_days} 天</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ───────────── Schedule Detail Panel ─────────────

interface SchedulePanelProps {
  teacher: TeacherSalary
  schedules: ScheduleItem[]
  loading: boolean
}

function ScheduleDetailPanel({ teacher, schedules, loading }: SchedulePanelProps) {
  const weeks = groupByWeek(schedules)
  const weekKeys = Object.keys(weeks).map(Number).sort((a, b) => a - b)

  const weeklyFee = (items: ScheduleItem[]): number => {
    return items.reduce((acc, s) => {
      if (s.is_individual) return acc + (s.per_session_fee ?? 0)
      if (teacher.salary_type === 'per_class') return acc + Number(teacher.rate_per_class)
      if (teacher.salary_type === 'hourly') {
        const hours = s.duration_hours ?? 1
        return acc + Number(teacher.hourly_rate) * hours
      }
      return acc
    }, 0)
  }

  if (loading) {
    return (
      <div className="mt-3 flex justify-center py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (schedules.length === 0) {
    return (
      <div className="mt-3 text-center py-4 text-text-muted text-sm">本月無排課記錄</div>
    )
  }

  return (
    <div className="mt-3 space-y-3">
      {weekKeys.map(week => {
        const items = weeks[week]
        const subtotal = weeklyFee(items)
        return (
          <div key={week} className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
              <span className="text-xs font-medium text-text-muted">第 {week} 週</span>
              <span className="text-xs font-semibold text-primary">小計 ${subtotal.toLocaleString()}</span>
            </div>
            <div className="divide-y divide-border">
              {items.map((s, i) => {
                const sessionFee = (() => {
                  if (s.is_individual) return s.per_session_fee ?? 0
                  if (teacher.salary_type === 'per_class') return Number(teacher.rate_per_class)
                  if (teacher.salary_type === 'hourly') return Number(teacher.hourly_rate) * (s.duration_hours ?? 1)
                  return 0
                })()
                return (
                  <div key={i} className="px-3 py-2 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-text font-medium">{formatDate(s.start_time)}</span>
                        <span className="text-text-muted">
                          {formatTime(s.start_time)}–{formatTime(s.end_time)}
                        </span>
                        {s.is_individual && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">個指</span>
                        )}
                      </div>
                      <p className="text-text-muted mt-0.5">{s.course_name}</p>
                      {s.is_individual && s.per_session_fee && (
                        <p className="text-amber-600">1 堂 × ${s.per_session_fee.toLocaleString()}</p>
                      )}
                      {teacher.salary_type === 'hourly' && (
                        <p className="text-blue-600">{s.duration_hours ?? 1}h × ${Number(teacher.hourly_rate).toLocaleString()}</p>
                      )}
                    </div>
                    <span className="font-medium text-primary ml-3">
                      {teacher.salary_type === 'monthly' ? '—' : `$${sessionFee.toLocaleString()}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ───────────── Main Page ─────────────

export default function SalaryPage() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [data, setData] = useState<SalaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)

  // Adjustment modal
  const [showAdjModal, setShowAdjModal] = useState(false)
  const [adjForm, setAdjForm] = useState({ teacherId: '', type: 'bonus' as 'bonus' | 'deduction', name: '', amount: '', notes: '' })
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([])

  // Schedule panels
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null)
  const [teacherSchedules, setTeacherSchedules] = useState<Record<string, ScheduleItem[]>>({})
  const [schedulesLoading, setSchedulesLoading] = useState<Record<string, boolean>>({})

  // Attendance
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStats>>({})

  // Salary slip modal
  const [slipTeacher, setSlipTeacher] = useState<TeacherSalary | null>(null)

  const monthRange = getMonthRange(monthOffset)

  useEffect(() => {
    fetchSalary()
  }, [monthOffset])

  const fetchSalary = async () => {
    setLoading(true)
    // Reset expanded state when month changes
    setExpandedTeacher(null)
    setTeacherSchedules({})
    setAttendanceMap({})
    try {
      const res = await fetch(
        `${API_BASE}/api/w8/salary/calculate?startDate=${monthRange.start}&endDate=${monthRange.end}`,
        { headers: { 'Content-Type': 'application/json' }, credentials: 'include' }
      )
      if (!res.ok) return
      const result = await res.json()
      const d = result.data ?? result
      setData(d)
      if (d?.teachers) {
        setTeachers(d.teachers.map((t: TeacherSalary) => ({ id: t.teacher_id, name: t.teacher_name })))
      }
    } catch (err) {
      console.error('Failed to fetch salary:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeacherSchedules = async (teacherId: string) => {
    if (teacherSchedules[teacherId] !== undefined) return
    setSchedulesLoading(prev => ({ ...prev, [teacherId]: true }))
    try {
      const res = await fetch(
        `${API_BASE}/api/w8/schedules?teacherId=${teacherId}&startDate=${monthRange.start}&endDate=${monthRange.end}&status=completed`,
        { credentials: 'include' }
      )
      if (res.ok) {
        const result = await res.json()
        const items: ScheduleItem[] = result.data ?? result ?? []
        setTeacherSchedules(prev => ({ ...prev, [teacherId]: items }))
      } else {
        setTeacherSchedules(prev => ({ ...prev, [teacherId]: [] }))
      }
    } catch (err) {
      console.error('Failed to fetch schedules:', err)
      setTeacherSchedules(prev => ({ ...prev, [teacherId]: [] }))
    } finally {
      setSchedulesLoading(prev => ({ ...prev, [teacherId]: false }))
    }
  }

  const fetchAttendance = async (teacherId: string) => {
    if (attendanceMap[teacherId] !== undefined) return
    try {
      const res = await fetch(
        `${API_BASE}/api/teacher-attendance/stats?teacherId=${teacherId}&startDate=${monthRange.start}&endDate=${monthRange.end}`,
        { credentials: 'include' }
      )
      if (res.ok) {
        const result = await res.json()
        const stats: AttendanceStats = result.data ?? result
        setAttendanceMap(prev => ({ ...prev, [teacherId]: stats }))
      }
    } catch {
      // Attendance API may not exist yet — silently ignore
    }
  }

  const handleToggleExpand = (teacherId: string) => {
    if (expandedTeacher === teacherId) {
      setExpandedTeacher(null)
    } else {
      setExpandedTeacher(teacherId)
      fetchTeacherSchedules(teacherId)
      fetchAttendance(teacherId)
    }
  }

  const handleAddAdjustment = async () => {
    if (!adjForm.teacherId || !adjForm.name || !adjForm.amount) return
    try {
      const res = await fetch(`${API_BASE}/api/w8/salary/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          teacherId: adjForm.teacherId,
          periodStart: monthRange.start,
          periodEnd: monthRange.end,
          type: adjForm.type,
          name: adjForm.name,
          amount: adjForm.amount,
          notes: adjForm.notes || undefined,
        }),
      })
      if (res.ok) {
        setShowAdjModal(false)
        setAdjForm({ teacherId: '', type: 'bonus', name: '', amount: '', notes: '' })
        fetchSalary()
      }
    } catch (err) {
      console.error('Failed to add adjustment:', err)
    }
  }

  const getSalaryBreakdown = (t: TeacherSalary) => {
    const st = t.salary_type || 'per_class'
    if (st === 'monthly') return `月薪 $${Number(t.base_salary || 0).toLocaleString()}`
    if (st === 'hourly') return `時薪 $${Number(t.hourly_rate || 0).toLocaleString()} × ${t.total_hours ?? t.total_classes} 時`
    return `堂薪 $${Number(t.rate_per_class || 0).toLocaleString()} × ${t.total_classes} 堂`
  }

  // Leave deduction for monthly teachers
  const getLeaveDeduction = (teacher: TeacherSalary): number => {
    if (teacher.salary_type !== 'monthly') return 0
    const stats = attendanceMap[teacher.teacher_id]
    if (!stats) return 0
    const dailyRate = Number(teacher.base_salary) / 30
    return Math.round(stats.personal_leave_days * dailyRate)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton fallbackUrl="/dashboard" />
            <h1 className="text-lg font-semibold text-text">薪資管理</h1>
          </div>
          <button
            onClick={() => setShowAdjModal(true)}
            className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium"
          >
            + 獎金/扣薪
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mt-3">
          <button onClick={() => setMonthOffset(m => m - 1)} className="p-2 text-text-muted hover:text-text">
            ← 上月
          </button>
          <div className="text-center">
            <p className="font-medium text-text">{monthRange.label}</p>
            <p className="text-xs text-text-muted">{monthRange.start} ~ {monthRange.end}</p>
          </div>
          <button onClick={() => setMonthOffset(m => m + 1)} className="p-2 text-text-muted hover:text-text">
            下月 →
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Summary Card */}
            <div className="bg-gradient-to-r from-primary to-primary-hover rounded-2xl p-6 text-white">
              <p className="text-sm opacity-80">本月薪資總計</p>
              <p className="text-3xl font-bold mt-1">
                ${data.grand_total_amount.toLocaleString()}
              </p>
              <div className="flex gap-6 mt-4 text-sm">
                <div>
                  <p className="opacity-80">總堂數</p>
                  <p className="font-semibold">{data.grand_total_classes} 堂</p>
                </div>
                <div>
                  <p className="opacity-80">講師數</p>
                  <p className="font-semibold">{data.teachers.length} 位</p>
                </div>
              </div>
            </div>

            {/* Teacher Cards */}
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-text-muted px-1">各講師明細</h2>

              {data.teachers.map((teacher) => {
                const isExpanded = expandedTeacher === teacher.teacher_id
                const schedules = teacherSchedules[teacher.teacher_id] ?? []
                const attendance = attendanceMap[teacher.teacher_id] ?? null
                const leaveDeduction = getLeaveDeduction(teacher)
                const hasLeave = attendance && (attendance.sick_leave_days > 0 || attendance.personal_leave_days > 0 || attendance.absent_days > 0)

                return (
                  <div key={teacher.teacher_id} className="bg-surface rounded-xl border border-border overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-text">{teacher.teacher_name}</span>
                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                              {teacher.title}
                            </span>
                            {teacher.teacher_role && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                                {teacher.teacher_role}
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              {SALARY_TYPE_LABELS[teacher.salary_type] || '堂薪制'}
                            </span>
                          </div>
                          <p className="text-sm text-text-muted mt-1">{getSalaryBreakdown(teacher)}</p>

                          {/* Attendance badges */}
                          {hasLeave && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {attendance.sick_leave_days > 0 && (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
                                  病假 {attendance.sick_leave_days} 天
                                </span>
                              )}
                              {attendance.personal_leave_days > 0 && (
                                <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-xs rounded-full">
                                  事假 {attendance.personal_leave_days} 天
                                  {leaveDeduction > 0 && ` (-$${leaveDeduction.toLocaleString()})`}
                                </span>
                              )}
                              {attendance.absent_days > 0 && (
                                <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full">
                                  曠職 {attendance.absent_days} 天
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="text-right ml-3">
                          <p className="text-xl font-bold text-primary">
                            ${Number(teacher.total_amount - leaveDeduction).toLocaleString()}
                          </p>
                          {leaveDeduction > 0 && (
                            <p className="text-xs text-red-500">含事假扣薪</p>
                          )}
                        </div>
                      </div>

                      {/* Adjustments */}
                      {(teacher.bonus_total > 0 || teacher.deduction_total > 0) && (
                        <div className="mt-2 space-y-1">
                          {teacher.adjustments?.map((adj, i) => (
                            <div key={i} className={`flex justify-between text-xs px-2 py-1 rounded ${adj.type === 'bonus' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                              <span>{adj.type === 'bonus' ? '+' : '-'} {adj.name}</span>
                              <span>${Number(adj.amount).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Leave deduction line item */}
                      {leaveDeduction > 0 && (
                        <div className="mt-1 flex justify-between text-xs px-2 py-1 rounded bg-red-50 text-red-700">
                          <span>- 事假扣薪（{attendance?.personal_leave_days} 天）</span>
                          <span>-${leaveDeduction.toLocaleString()}</span>
                        </div>
                      )}

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{
                              width: `${data.grand_total_amount > 0 ? Math.min(100, (Number(teacher.total_amount) / data.grand_total_amount) * 100) : 0}%`
                            }}
                          />
                        </div>
                        <p className="text-xs text-text-muted mt-1 text-right">
                          佔比 {data.grand_total_amount > 0 ? ((Number(teacher.total_amount) / data.grand_total_amount) * 100).toFixed(1) : '0.0'}%
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-3 flex gap-2">
                        {/* Expand schedule details */}
                        <button
                          onClick={() => handleToggleExpand(teacher.teacher_id)}
                          className="flex-1 py-1.5 text-sm border border-border text-text-muted rounded-lg hover:border-primary hover:text-primary transition-colors"
                        >
                          {isExpanded ? '▲ 收起明細' : '▼ 排課明細'}
                        </button>

                        {/* Salary slip */}
                        <button
                          onClick={() => {
                            // Ensure we have schedules before showing slip
                            if (!teacherSchedules[teacher.teacher_id]) {
                              fetchTeacherSchedules(teacher.teacher_id)
                              fetchAttendance(teacher.teacher_id)
                            }
                            setSlipTeacher(teacher)
                          }}
                          className="px-3 py-1.5 text-sm border border-border text-text-muted rounded-lg hover:border-primary hover:text-primary transition-colors"
                        >
                          薪資條
                        </button>

                        {/* Confirm */}
                        {teacher.total_classes > 0 && (
                          <button
                            disabled={confirming === teacher.teacher_id}
                            onClick={async () => {
                              setConfirming(teacher.teacher_id)
                              try {
                                const res = await fetch(`${API_BASE}/api/w8/salary/records`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({
                                    teacherId: teacher.teacher_id,
                                    periodStart: monthRange.start,
                                    periodEnd: monthRange.end,
                                  }),
                                })
                                if (res.ok) alert(`${teacher.teacher_name} 薪資已確認`)
                                else alert('確認失敗')
                              } catch (err) {
                                console.error('[Salary] Confirm failed:', err)
                                alert('確認失敗')
                              } finally { setConfirming(null) }
                            }}
                            className="px-3 py-1.5 text-sm border border-primary text-primary rounded-lg disabled:opacity-50"
                          >
                            {confirming === teacher.teacher_id ? '處理中...' : '確認薪資'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Schedule Detail Panel */}
                    {isExpanded && (
                      <div className="border-t border-border bg-gray-50/50 px-4 pb-4">
                        <p className="text-xs font-medium text-text-muted pt-3 mb-1">本月排課明細</p>
                        <ScheduleDetailPanel
                          teacher={teacher}
                          schedules={schedules}
                          loading={schedulesLoading[teacher.teacher_id] ?? false}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {data.teachers.length === 0 && (
              <div className="text-center py-12 text-text-muted">本月無排課記錄</div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-text-muted">無法載入資料</div>
        )}
      </div>

      {/* Add Adjustment Modal */}
      {showAdjModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-text mb-4">新增獎金/扣薪</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-text-muted mb-1">講師</label>
                <select
                  value={adjForm.teacherId}
                  onChange={(e) => setAdjForm({ ...adjForm, teacherId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                >
                  <option value="">選擇講師</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-text-muted mb-1">類型</label>
                  <select
                    value={adjForm.type}
                    onChange={(e) => setAdjForm({ ...adjForm, type: e.target.value as 'bonus' | 'deduction' })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                  >
                    <option value="bonus">獎金</option>
                    <option value="deduction">扣薪</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">金額</label>
                  <input
                    type="number"
                    value={adjForm.amount}
                    onChange={(e) => setAdjForm({ ...adjForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    placeholder="金額"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">名目</label>
                <input
                  type="text"
                  value={adjForm.name}
                  onChange={(e) => setAdjForm({ ...adjForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                  placeholder="如：全勤獎金、遲到扣薪"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">備註</label>
                <input
                  type="text"
                  value={adjForm.notes}
                  onChange={(e) => setAdjForm({ ...adjForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                  placeholder="選填"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdjModal(false)} className="flex-1 py-2 border border-border rounded-lg text-text">取消</button>
                <button onClick={handleAddAdjustment} className="flex-1 py-2 bg-primary text-white rounded-lg font-medium">新增</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Salary Slip Modal */}
      {slipTeacher && (
        <SalarySlipModal
          teacher={slipTeacher}
          schedules={teacherSchedules[slipTeacher.teacher_id] ?? []}
          attendance={attendanceMap[slipTeacher.teacher_id] ?? null}
          period={monthRange.label}
          onClose={() => setSlipTeacher(null)}
        />
      )}
    </div>
  )
}
