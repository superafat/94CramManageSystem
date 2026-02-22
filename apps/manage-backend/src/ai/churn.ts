/**
 * W5: Churn Prediction Engine
 * AI-powered student dropout risk analysis
 */
import { db } from '../db/index'
import { sql } from 'drizzle-orm'

export interface ChurnRisk {
  studentId: string
  studentName: string
  grade: string
  parentName: string | null
  phone: string | null
  riskScore: number        // 0-100
  riskLevel: 'high' | 'medium' | 'low'
  factors: RiskFactor[]
  courses: string[]
  recommendation: string
}

interface RiskFactor {
  type: string
  label: string
  weight: number
  detail: string
}

interface StudentData {
  id: string
  name: string
  grade: string
  parent_name: string | null
  phone: string | null
  status: string
}

/**
 * Analyze churn risk for all active students in a branch
 */
export async function analyzeChurnRisk(
  tenantId: string,
  branchId: string,
  daysBack = 60
): Promise<ChurnRisk[]> {
  // 1. Get all active students
  const students = await db.execute(sql`
    SELECT id, name, grade, parent_name, phone, status
    FROM students
    WHERE tenant_id = ${tenantId}
      AND branch_id = ${branchId}
      AND status = 'active'
    ORDER BY name
  `) as unknown as StudentData[]

  const risks: ChurnRisk[] = []

  for (const student of students) {
    const risk = await analyzeStudent(tenantId, student, daysBack)
    risks.push(risk)
  }

  // Sort by risk score descending
  risks.sort((a, b) => b.riskScore - a.riskScore)
  return risks
}

async function analyzeStudent(
  tenantId: string,
  student: StudentData,
  daysBack: number
): Promise<ChurnRisk> {
  const factors: RiskFactor[] = []
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysBack)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  // --- Factor 1: Attendance rate (weight: 35) ---
  const attendanceRows = await db.execute(sql`
    SELECT status, COUNT(*)::int as cnt
    FROM attendance
    WHERE student_id = ${student.id}
      AND tenant_id = ${tenantId}
      AND date >= ${cutoffStr}::date
    GROUP BY status
  `) as unknown as { status: string; cnt: number }[]

  const attMap: Record<string, number> = {}
  let totalAtt = 0
  for (const r of attendanceRows) {
    attMap[r.status] = r.cnt
    totalAtt += r.cnt
  }

  const presentCount = (attMap['present'] ?? 0) + (attMap['late'] ?? 0)
  const absentCount = attMap['absent'] ?? 0
  const attendanceRate = totalAtt > 0 ? presentCount / totalAtt : 1

  if (attendanceRate < 0.5) {
    factors.push({ type: 'attendance', label: '出席率極低', weight: 35, detail: `出席率 ${(attendanceRate * 100).toFixed(0)}%（${absentCount}次缺席/${totalAtt}次）` })
  } else if (attendanceRate < 0.7) {
    factors.push({ type: 'attendance', label: '出席率偏低', weight: 25, detail: `出席率 ${(attendanceRate * 100).toFixed(0)}%（${absentCount}次缺席/${totalAtt}次）` })
  } else if (attendanceRate < 0.85) {
    factors.push({ type: 'attendance', label: '出席率下降', weight: 15, detail: `出席率 ${(attendanceRate * 100).toFixed(0)}%` })
  }

  // --- Factor 2: Attendance trend (weight: 25) ---
  // Compare first half vs second half
  const halfDays = Math.floor(daysBack / 2)
  const midDate = new Date()
  midDate.setDate(midDate.getDate() - halfDays)
  const midStr = midDate.toISOString().slice(0, 10)

  const [firstHalf, secondHalf] = await Promise.all([
    db.execute(sql`
      SELECT COUNT(*)::int as total,
             COUNT(*) FILTER (WHERE status IN ('present','late'))::int as attended
      FROM attendance
      WHERE student_id = ${student.id} AND tenant_id = ${tenantId}
        AND date >= ${cutoffStr}::date AND date < ${midStr}::date
    `),
    db.execute(sql`
      SELECT COUNT(*)::int as total,
             COUNT(*) FILTER (WHERE status IN ('present','late'))::int as attended
      FROM attendance
      WHERE student_id = ${student.id} AND tenant_id = ${tenantId}
        AND date >= ${midStr}::date
    `)
  ]) as unknown as [{ total: number; attended: number }[], { total: number; attended: number }[]]

  const firstRate = firstHalf[0]?.total > 0 ? firstHalf[0].attended / firstHalf[0].total : 1
  const secondRate = secondHalf[0]?.total > 0 ? secondHalf[0].attended / secondHalf[0].total : 1
  const trendDrop = firstRate - secondRate

  if (trendDrop > 0.3) {
    factors.push({ type: 'attendance_trend', label: '出席急遽下滑', weight: 25, detail: `前期 ${(firstRate * 100).toFixed(0)}% → 近期 ${(secondRate * 100).toFixed(0)}%（下降${(trendDrop * 100).toFixed(0)}%）` })
  } else if (trendDrop > 0.15) {
    factors.push({ type: 'attendance_trend', label: '出席趨勢下降', weight: 15, detail: `前期 ${(firstRate * 100).toFixed(0)}% → 近期 ${(secondRate * 100).toFixed(0)}%` })
  }

  // --- Factor 3: Grade decline (weight: 25) ---
  const gradeRows = await db.execute(sql`
    SELECT score, date
    FROM grades
    WHERE student_id = ${student.id} AND tenant_id = ${tenantId}
    ORDER BY date ASC
  `) as unknown as { score: number; date: string }[]

  if (gradeRows.length >= 2) {
    const firstScore = Number(gradeRows[0].score)
    const lastScore = Number(gradeRows[gradeRows.length - 1].score)
    const scoreDrop = firstScore - lastScore

    if (scoreDrop >= 20) {
      factors.push({ type: 'grade_decline', label: '成績大幅退步', weight: 25, detail: `${firstScore} → ${lastScore}（下降${scoreDrop}分）` })
    } else if (scoreDrop >= 10) {
      factors.push({ type: 'grade_decline', label: '成績退步', weight: 15, detail: `${firstScore} → ${lastScore}（下降${scoreDrop}分）` })
    }

    // Low absolute score
    if (lastScore < 50) {
      factors.push({ type: 'low_grade', label: '最近成績不及格', weight: 10, detail: `最新成績 ${lastScore} 分` })
    }
  }

  // --- Factor 4: Recent consecutive absences (weight: 15) ---
  const recentAtt = await db.execute(sql`
    SELECT status FROM attendance
    WHERE student_id = ${student.id} AND tenant_id = ${tenantId}
    ORDER BY date DESC LIMIT 5
  `) as unknown as { status: string }[]

  let consecutiveAbsent = 0
  for (const r of recentAtt) {
    if (r.status === 'absent') consecutiveAbsent++
    else break
  }

  if (consecutiveAbsent >= 3) {
    factors.push({ type: 'consecutive_absent', label: '連續缺席', weight: 15, detail: `最近連續 ${consecutiveAbsent} 次缺席` })
  }

  // --- Calculate total risk score ---
  const riskScore = Math.min(100, factors.reduce((sum, f) => sum + f.weight, 0))
  const riskLevel: ChurnRisk['riskLevel'] =
    riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low'

  // --- Get enrolled courses ---
  const courseRows = await db.execute(sql`
    SELECT course_name FROM enrollments
    WHERE student_id = ${student.id} AND tenant_id = ${tenantId} AND status = 'active'
  `) as unknown as { course_name: string }[]
  const courses = courseRows.map(r => r.course_name)

  // --- Generate recommendation ---
  const recommendation = generateRecommendation(riskLevel, factors, student.name)

  return {
    studentId: student.id,
    studentName: student.name,
    grade: student.grade,
    parentName: student.parent_name,
    phone: student.phone,
    riskScore,
    riskLevel,
    factors,
    courses,
    recommendation,
  }
}

function generateRecommendation(
  level: ChurnRisk['riskLevel'],
  factors: RiskFactor[],
  name: string,
): string {
  const hasAttendance = factors.some(f => f.type === 'attendance' || f.type === 'attendance_trend')
  const hasGrade = factors.some(f => f.type === 'grade_decline' || f.type === 'low_grade')
  const hasConsecutive = factors.some(f => f.type === 'consecutive_absent')

  if (level === 'high') {
    const actions: string[] = ['⚠️ 建議立即聯繫家長']
    if (hasConsecutive) actions.push('了解連續缺席原因')
    if (hasGrade) actions.push('安排補強課程或一對一輔導')
    if (hasAttendance) actions.push('討論調整上課時段的可能性')
    return actions.join('，')
  }
  if (level === 'medium') {
    const actions: string[] = ['📋 建議近期關注']
    if (hasGrade) actions.push('加強課堂互動與小考回饋')
    if (hasAttendance) actions.push('電話關心出席狀況')
    return actions.join('，')
  }
  return '✅ 目前狀況良好，持續維持'
}
