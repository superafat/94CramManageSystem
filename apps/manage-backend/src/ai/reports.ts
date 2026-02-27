/**
 * W5: Report Generation Engine
 * Branch monthly report + student individual report
 */
import { db } from '../db/index'
import { sql } from 'drizzle-orm'
import { analyzeChurnRisk } from './churn'

// ===== Branch Monthly Report =====

export interface BranchReport {
  tenantId: string
  branchId: string
  period: string        // '2026-02'
  generatedAt: string
  summary: BranchSummary
  students: StudentSummary[]
  churnAlerts: ChurnAlert[]
  courseStats: CourseStat[]
}

interface BranchSummary {
  totalStudents: number
  activeStudents: number
  newStudents: number
  droppedStudents: number
  avgAttendanceRate: number
  avgGrade: number
  totalRevenue: number
}

interface StudentSummary {
  name: string
  grade: string
  courses: string[]
  attendanceRate: number
  avgScore: number | null
  riskLevel: 'high' | 'medium' | 'low'
}

interface ChurnAlert {
  studentName: string
  riskScore: number
  riskLevel: string
  factors: string[]
  recommendation: string
}

interface CourseStat {
  courseName: string
  studentCount: number
  avgAttendance: number
  avgGrade: number | null
  monthlyRevenue: number
}

export async function generateBranchReport(
  tenantId: string,
  branchId: string,
  yearMonth?: string
): Promise<BranchReport> {
  // Normalize period: accept YYYY-MM or fallback to current month
  let period = yearMonth ?? new Date().toISOString().slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(period)) {
    // Invalid format (e.g. "month", "week") → use current month
    period = new Date().toISOString().slice(0, 7)
  }
  const [year, month] = period.split('-').map(Number)
  const startDate = `${period}-01`
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10) // last day of month

  // Total students
  const totalRows = await db.execute(sql`
    SELECT
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE status = 'active')::int as active,
      COUNT(*) FILTER (WHERE enrolled_at >= ${startDate}::date AND enrolled_at <= ${endDate}::date)::int as new_students,
      COUNT(*) FILTER (WHERE status = 'dropped')::int as dropped
    FROM students
    WHERE tenant_id = ${tenantId} AND branch_id = ${branchId}
  `) as unknown as Record<string, unknown>[]
  const t = totalRows[0]

  // Attendance rate for the month
  const attRows = await db.execute(sql`
    SELECT
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE a.status IN ('present','late'))::int as attended
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    WHERE a.tenant_id = ${tenantId}
      AND s.branch_id = ${branchId}
      AND a.date >= ${startDate}::date
      AND a.date <= ${endDate}::date
  `) as unknown as Record<string, unknown>[]
  const avgAttendanceRate = Number(attRows[0]?.total) > 0 ? Number(attRows[0].attended) / Number(attRows[0].total) : 0

  // Average grade for the month
  const gradeRows = await db.execute(sql`
    SELECT AVG(g.score)::numeric(5,1) as avg_score
    FROM grades g
    JOIN students s ON g.student_id = s.id
    WHERE g.tenant_id = ${tenantId}
      AND s.branch_id = ${branchId}
      AND g.date >= ${startDate}::date
      AND g.date <= ${endDate}::date
  `) as unknown as Record<string, unknown>[]
  const avgGrade = gradeRows[0]?.avg_score ? Number(gradeRows[0].avg_score) : 0

  // Revenue (sum of monthly fees for active enrollments)
  const revRows = await db.execute(sql`
    SELECT COALESCE(SUM(e.fee_monthly), 0)::int as revenue
    FROM enrollments e
    JOIN students s ON e.student_id = s.id
    WHERE e.tenant_id = ${tenantId}
      AND s.branch_id = ${branchId}
      AND e.status = 'active'
  `) as unknown as Record<string, unknown>[]
  const totalRevenue = revRows[0]?.revenue ?? 0

  // Per-student summary
  const studentRows = await db.execute(sql`
    SELECT
      s.id, s.name, s.grade,
      COALESCE(att.rate, 0) as attendance_rate,
      g.avg_score
    FROM students s
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (WHERE a.status IN ('present','late'))::float /
        NULLIF(COUNT(*)::float, 0) as rate
      FROM attendance a
      WHERE a.student_id = s.id
        AND a.date >= ${startDate}::date AND a.date <= ${endDate}::date
    ) att ON true
    LEFT JOIN LATERAL (
      SELECT AVG(gr.score)::numeric(5,1) as avg_score
      FROM grades gr
      WHERE gr.student_id = s.id
        AND gr.date >= ${startDate}::date AND gr.date <= ${endDate}::date
    ) g ON true
    WHERE s.tenant_id = ${tenantId}
      AND s.branch_id = ${branchId}
      AND s.status = 'active'
    ORDER BY s.name
  `) as unknown as Record<string, unknown>[]

  // Course stats
  const courseRows = await db.execute(sql`
    SELECT
      e.course_name,
      COUNT(DISTINCT e.student_id)::int as student_count,
      SUM(e.fee_monthly)::int as monthly_revenue
    FROM enrollments e
    JOIN students s ON e.student_id = s.id
    WHERE e.tenant_id = ${tenantId}
      AND s.branch_id = ${branchId}
      AND e.status = 'active'
    GROUP BY e.course_name
    ORDER BY student_count DESC
  `) as unknown as Record<string, unknown>[]

  // Churn risks
  const churnRisks = await analyzeChurnRisk(tenantId, branchId, 60)

  // Get courses per student
  const enrollmentRows = await db.execute(sql`
    SELECT student_id, course_name
    FROM enrollments
    WHERE tenant_id = ${tenantId} AND status = 'active'
  `) as unknown as { student_id: string; course_name: string }[]

  const studentCourses: Record<string, string[]> = {}
  for (const r of enrollmentRows) {
    if (!studentCourses[r.student_id]) studentCourses[r.student_id] = []
    studentCourses[r.student_id].push(r.course_name)
  }

  const churnMap = new Map(churnRisks.map(c => [c.studentId, c]))

  const students: StudentSummary[] = studentRows.map((r) => ({
    name: String(r.name),
    grade: String(r.grade),
    courses: studentCourses[String(r.id)] ?? [],
    attendanceRate: Number(r.attendance_rate) || 0,
    avgScore: r.avg_score ? Number(r.avg_score) : null,
    riskLevel: churnMap.get(String(r.id))?.riskLevel ?? 'low',
  }))

  const churnAlerts: ChurnAlert[] = churnRisks
    .filter(r => r.riskLevel !== 'low')
    .map(r => ({
      studentName: r.studentName,
      riskScore: r.riskScore,
      riskLevel: r.riskLevel,
      factors: r.factors.map(f => f.detail),
      recommendation: r.recommendation,
    }))

  const courseStats: CourseStat[] = courseRows.map((r) => ({
    courseName: String(r.course_name),
    studentCount: Number(r.student_count),
    avgAttendance: 0, // TODO: per-course attendance
    avgGrade: null,
    monthlyRevenue: Number(r.monthly_revenue),
  }))

  return {
    tenantId,
    branchId,
    period,
    generatedAt: new Date().toISOString(),
    summary: {
      totalStudents: Number(t.total),
      activeStudents: Number(t.active),
      newStudents: Number(t.new_students),
      droppedStudents: Number(t.dropped),
      avgAttendanceRate,
      avgGrade,
      totalRevenue: Number(totalRevenue),
    },
    students,
    churnAlerts,
    courseStats,
  }
}

// ===== Student Individual Report =====

export interface StudentReport {
  studentId: string
  studentName: string
  grade: string
  parentName: string | null
  courses: { name: string; fee: number; schedule: string }[]
  attendanceHistory: { date: string; status: string }[]
  attendanceRate: number
  gradeHistory: { examName: string; score: number; date: string }[]
  avgScore: number | null
  scoreTrend: 'improving' | 'stable' | 'declining'
  riskLevel: string
  riskFactors: string[]
  recommendation: string
}

export async function generateStudentReport(
  tenantId: string,
  studentId: string
): Promise<StudentReport | null> {
  const studentRows = await db.execute(sql`
    SELECT id, name, grade, parent_name, phone, branch_id
    FROM students WHERE id = ${studentId} AND tenant_id = ${tenantId}
  `) as unknown as Record<string, unknown>[]

  if (!studentRows.length) return null
  const s = studentRows[0]

  const courses = await db.execute(sql`
    SELECT course_name, fee_monthly, day_of_week, time_slot
    FROM enrollments
    WHERE student_id = ${studentId} AND tenant_id = ${tenantId} AND status = 'active'
  `) as unknown as Record<string, unknown>[]

  const attendance = await db.execute(sql`
    SELECT date::text, status FROM attendance
    WHERE student_id = ${studentId} AND tenant_id = ${tenantId}
    ORDER BY date DESC LIMIT 30
  `) as unknown as Record<string, unknown>[]

  const totalAtt = attendance.length
  const presentCount = attendance.filter((a) => a.status === 'present' || a.status === 'late').length
  const attendanceRate = totalAtt > 0 ? presentCount / totalAtt : 1

  const grades = await db.execute(sql`
    SELECT exam_name, score, date::text FROM grades
    WHERE student_id = ${studentId} AND tenant_id = ${tenantId}
    ORDER BY date ASC
  `) as unknown as Record<string, unknown>[]

  const avgScore = grades.length > 0
    ? grades.reduce((acc: number, g) => acc + Number(g.score), 0) / grades.length
    : null

  let scoreTrend: StudentReport['scoreTrend'] = 'stable'
  if (grades.length >= 2) {
    const first = Number(grades[0].score)
    const last = Number(grades[grades.length - 1].score)
    if (last - first >= 5) scoreTrend = 'improving'
    else if (first - last >= 5) scoreTrend = 'declining'
  }

  const churnRisks = await analyzeChurnRisk(tenantId, String(s.branch_id ?? ''), 60)
  const myRisk = churnRisks.find(r => r.studentId === studentId)

  return {
    studentId,
    studentName: String(s.name),
    grade: String(s.grade),
    parentName: s.parent_name != null ? String(s.parent_name) : null,
    courses: courses.map((c) => ({
      name: String(c.course_name),
      fee: Number(c.fee_monthly),
      schedule: `${c.day_of_week ?? ''} ${c.time_slot ?? ''}`.trim(),
    })),
    attendanceHistory: attendance.map((a) => ({ date: String(a.date), status: String(a.status) })),
    attendanceRate,
    gradeHistory: grades.map((g) => ({ examName: String(g.exam_name), score: Number(g.score), date: String(g.date) })),
    avgScore: avgScore ? Math.round(avgScore * 10) / 10 : null,
    scoreTrend,
    riskLevel: myRisk?.riskLevel ?? 'low',
    riskFactors: myRisk?.factors.map(f => f.detail) ?? [],
    recommendation: myRisk?.recommendation ?? '✅ 目前狀況良好',
  }
}
