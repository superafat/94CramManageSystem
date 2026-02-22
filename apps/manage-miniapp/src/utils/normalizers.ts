/**
 * API data normalizers - convert various API formats to consistent types
 */

import type { Student, ScheduleSlot, Alert } from '../types'

// Student normalizer — handles real DB fields (full_name, grade_level, etc.)
export function normalizeStudent(s: any): Student {
  // Calculate subjects from enrollments if available
  const subjects = s.subjects || s.courses || []
  
  return {
    id: s.id,
    name: s.full_name || s.name || s.fullName || '(未命名)',
    grade: s.grade_level || s.gradeLevel || s.grade || '',
    subjects,
    status: s.status as Student['status'] || 'active',
    attendanceRate: s.attendanceRate ?? s.attendance ?? s.attendance_rate ?? 0,
    avgGrade: s.avgGrade ?? s.avg_grade ?? 0,
    risk: s.risk as Student['risk'] || s.riskLevel as Student['risk'] || 
      (s.status === 'at_risk' ? 'high' : undefined),
    phone: s.phone,
    email: s.email,
    joinDate: s.enrollment_date || s.enrollmentDate || s.joinDate,
    monthlyFee: s.monthlyFee ?? s.monthly_fee,
  }
}

// Schedule slot normalizer — handles W8 API format
export function normalizeScheduleSlot(s: any): ScheduleSlot {
  // W8 format: scheduled_date, start_time, end_time, course_name, teacher_name
  let day = s.day
  if (!day && s.scheduled_date) {
    const d = new Date(s.scheduled_date)
    day = d.getDay() || 7 // 0=Sun→7, 1=Mon...6=Sat
  }
  
  let time = s.time || ''
  if (!time && s.start_time && s.end_time) {
    time = `${s.start_time.slice(0,5)}-${s.end_time.slice(0,5)}`
  } else if (!time && s.startHour != null && s.endHour != null) {
    time = `${String(s.startHour).padStart(2,'0')}:00-${String(s.endHour).padStart(2,'0')}:00`
  }

  return {
    id: s.id,
    day,
    time,
    subject: s.course_name || s.subject || '',
    teacher: s.teacher_name || s.teacher || '',
    classroom: s.classroom || s.room || s.notes || '',
    students: s.students ?? s.enrollment_count ?? 0,
  }
}

// Alert normalizer — handles churn API response (students array)
export function normalizeAlert(a: any): Alert {
  const levelMap: Record<string, 'critical' | 'warning' | 'info'> = {
    high: 'critical', medium: 'warning', low: 'info',
    critical: 'critical', warning: 'warning', info: 'info',
  }
  
  // Build detail from factors
  const detail = a.detail || a.reason || 
    (a.factors ? a.factors.slice(0, 2).map((f: any) => f.label || f.detail).join('、') : '') ||
    a.suggestion || ''

  return {
    id: a.id || a.studentId || String(Math.random()),
    level: levelMap[a.riskLevel || a.level || 'info'] || 'info',
    title: a.title || (a.studentName ? `${a.studentName} 流失風險` : '通知'),
    detail,
    time: a.time || a.lastAttendance || '',
    studentId: a.studentId,
  }
}
