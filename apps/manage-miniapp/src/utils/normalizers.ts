/**
 * API data normalizers - convert various API formats to consistent types
 */

import type { Student, ScheduleSlot, Alert } from '../types'

// Student normalizer — handles real DB fields (full_name, grade_level, etc.)
export function normalizeStudent(s: Record<string, unknown>): Student {
  // Calculate subjects from enrollments if available
  const subjects = (s.subjects || s.courses || []) as string[]

  return {
    id: s.id as string,
    name: (s.full_name || s.name || s.fullName || '(未命名)') as string,
    grade: (s.grade_level || s.gradeLevel || s.grade || '') as string,
    subjects,
    status: (s.status as Student['status']) || 'active',
    attendanceRate: (s.attendanceRate ?? s.attendance ?? s.attendance_rate ?? 0) as number,
    avgGrade: (s.avgGrade ?? s.avg_grade ?? 0) as number,
    risk: (s.risk as Student['risk']) || (s.riskLevel as Student['risk']) ||
      (s.status === 'at_risk' ? 'high' : undefined),
    phone: s.phone as string | undefined,
    email: s.email as string | undefined,
    joinDate: (s.enrollment_date || s.enrollmentDate || s.joinDate) as string | undefined,
    monthlyFee: (s.monthlyFee ?? s.monthly_fee) as number | undefined,
  }
}

// Schedule slot normalizer — handles W8 API format
export function normalizeScheduleSlot(s: Record<string, unknown>): ScheduleSlot {
  // W8 format: scheduled_date, start_time, end_time, course_name, teacher_name
  let day = s.day as number | undefined
  if (!day && s.scheduled_date) {
    const d = new Date(s.scheduled_date as string)
    day = d.getDay() || 7 // 0=Sun→7, 1=Mon...6=Sat
  }

  let time = (s.time as string) || ''
  if (!time && s.start_time && s.end_time) {
    time = `${(s.start_time as string).slice(0, 5)}-${(s.end_time as string).slice(0, 5)}`
  } else if (!time && s.startHour != null && s.endHour != null) {
    time = `${String(s.startHour).padStart(2, '0')}:00-${String(s.endHour).padStart(2, '0')}:00`
  }

  return {
    id: s.id as string,
    day: day as number,
    time,
    subject: ((s.course_name || s.subject || '') as string),
    teacher: ((s.teacher_name || s.teacher || '') as string),
    classroom: ((s.classroom || s.room || s.notes || '') as string),
    students: (s.students ?? s.enrollment_count ?? 0) as number,
  }
}

// Alert normalizer — handles churn API response (students array)
export function normalizeAlert(a: Record<string, unknown>): Alert {
  const levelMap: Record<string, 'critical' | 'warning' | 'info'> = {
    high: 'critical', medium: 'warning', low: 'info',
    critical: 'critical', warning: 'warning', info: 'info',
  }

  // Build detail from factors
  const factors = a.factors as Array<Record<string, unknown>> | undefined
  const detail = (a.detail || a.reason ||
    (factors ? factors.slice(0, 2).map((f) => (f.label || f.detail) as string).join('、') : '') ||
    a.suggestion || '') as string

  return {
    id: (a.id || a.studentId || String(Math.random())) as string,
    level: levelMap[String(a.riskLevel || a.level || 'info')] || 'info',
    title: (a.title || (a.studentName ? `${a.studentName} 流失風險` : '通知')) as string,
    detail,
    time: ((a.time || a.lastAttendance || '') as string),
    studentId: a.studentId as string | undefined,
  }
}
