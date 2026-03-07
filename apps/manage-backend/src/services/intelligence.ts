/**
 * Intelligence Service — BI Hub 核心聚合層
 * 匯總學習歷程、教師績效、營收預測與機構健康分數
 */

import { db } from '../db'
import { sql } from 'drizzle-orm'
import { rows, first } from '../db/helpers'
import { logger } from '../utils/logger'

// ============ 型別定義 ============

export interface LearningProfile {
  studentId: string
  studentName: string
  tenantId: string
  paymentStatus: 'paid' | 'pending' | 'overdue' | 'unknown'
  churnRiskScore: number      // 0-100
  renewalProbability: number  // 0-100
  avgScoreTrend: 'improving' | 'declining' | 'stable'
  updatedAt: Date
}

export interface TeacherPerformance {
  teacherId: string
  teacherName: string
  tenantId: string
  period: 'monthly' | 'quarterly'
  teacherAttendanceRate: number   // 0-1
  studentRetentionRate: number    // 0-1
  parentSatisfaction: number      // 0-5
  studentProgressRate: number     // 0-1 (placeholder)
  classAttendanceRate: number     // 0-1 (placeholder)
  overallScore: number            // 0-100 weighted
  calculatedAt: Date
}

export interface RevenueForecast {
  tenantId: string
  month: string           // YYYY-MM
  expectedRevenue: number
  confidence: number      // 0-100
  seasonalFactor: number
  churnAdjustment: number
}

export interface HealthScore {
  score: number
  breakdown: Record<string, number>
}

// ============ 共用查詢工具 ============

function getSeasonalFactor(month: number): number {
  // 2月、7月、8月為招生旺季
  return [2, 7, 8].includes(month) ? 1.3 : 1.0
}

// ============ 1. 聚合學習歷程 ============

/**
 * 聚合指定租戶（可選分校）的所有活躍學生學習歷程，
 * 並 upsert 至 manage_student_learning_profiles 表。
 */
export async function aggregateLearningProfiles(
  tenantId: string,
  branchId?: string
): Promise<LearningProfile[]> {
  // 取得所有活躍學生
  const studentRows = rows<{ id: string; name: string }>(
    await db.execute(sql`
      SELECT s.id, s.name
      FROM manage_students s
      WHERE s.tenant_id = ${tenantId}
        AND s.status = 'active'
        AND s.deleted_at IS NULL
        ${branchId ? sql`AND EXISTS (
          SELECT 1 FROM manage_enrollments e
          JOIN manage_courses c ON e.course_id = c.id
          WHERE e.student_id = s.id
            AND e.status = 'active'
        )` : sql``}
      ORDER BY s.name
    `)
  )

  if (studentRows.length === 0) {
    return []
  }

  const studentIds = studentRows.map(s => s.id)

  // 批次取得每個學生的最新繳費狀態（避免 N+1）
  const paymentRows = rows<{ student_id: string; status: string }>(
    await db.execute(sql`
      SELECT DISTINCT ON (e.student_id)
        e.student_id,
        p.status
      FROM manage_enrollments e
      JOIN manage_payments p ON p.enrollment_id = e.id
      WHERE e.student_id = ANY(${studentIds})
        AND e.tenant_id = ${tenantId}
        AND e.status = 'active'
        AND p.deleted_at IS NULL
      ORDER BY e.student_id, p.created_at DESC
    `)
  )

  // 批次取得每個學生的流失風險分數（從最近的 churn scan 取）
  const churnRows = rows<{ student_id: string; churn_risk_score: number }>(
    await db.execute(sql`
      SELECT DISTINCT ON (student_id)
        student_id,
        churn_risk_score
      FROM manage_churn_scans
      WHERE tenant_id = ${tenantId}
        AND student_id = ANY(${studentIds})
      ORDER BY student_id, scanned_at DESC
    `).catch(() => []) // 表不存在時 graceful fallback
  )

  // 建立快速查詢 map
  const paymentMap = new Map(paymentRows.map(r => [r.student_id, r.status]))
  const churnMap = new Map(churnRows.map(r => [r.student_id, r.churn_risk_score]))

  const profiles: LearningProfile[] = []

  for (const student of studentRows) {
    const rawPaymentStatus = paymentMap.get(student.id) ?? 'unknown'
    const paymentStatus = (['paid', 'pending', 'overdue'].includes(rawPaymentStatus)
      ? rawPaymentStatus
      : 'unknown') as LearningProfile['paymentStatus']

    const churnRiskScore = churnMap.get(student.id) ?? 0
    const renewalProbability = Math.max(0, 100 - churnRiskScore)

    const profile: LearningProfile = {
      studentId: student.id,
      studentName: student.name,
      tenantId,
      paymentStatus,
      churnRiskScore,
      renewalProbability,
      avgScoreTrend: 'stable', // placeholder — will be enriched from inclass API
      updatedAt: new Date(),
    }

    // Upsert into manage_student_learning_profiles
    await db.execute(sql`
      INSERT INTO manage_student_learning_profiles (
        student_id, tenant_id, payment_status, churn_risk_score,
        renewal_probability, avg_score_trend, updated_at
      ) VALUES (
        ${student.id}, ${tenantId}, ${paymentStatus}, ${churnRiskScore},
        ${renewalProbability}, ${'stable'}, NOW()
      )
      ON CONFLICT (student_id) DO UPDATE SET
        payment_status      = EXCLUDED.payment_status,
        churn_risk_score    = EXCLUDED.churn_risk_score,
        renewal_probability = EXCLUDED.renewal_probability,
        avg_score_trend     = EXCLUDED.avg_score_trend,
        updated_at          = NOW()
    `).catch((err: unknown) => {
      // 表尚未遷移時 graceful skip，不中斷整個聚合
      logger.warn({ err, studentId: student.id }, '[intelligence] upsert learning profile skipped')
    })

    profiles.push(profile)
  }

  logger.info({ tenantId, count: profiles.length }, '[intelligence] aggregateLearningProfiles done')
  return profiles
}

// ============ 2. 計算教師績效 ============

/**
 * 計算指定租戶所有活躍教師的績效分數並 upsert 至 manage_teacher_performance。
 */
export async function calculateTeacherPerformance(
  tenantId: string,
  period: 'monthly' | 'quarterly'
): Promise<TeacherPerformance[]> {
  const now = new Date()
  const periodMonths = period === 'monthly' ? 1 : 3
  const periodStart = new Date(now)
  periodStart.setMonth(periodStart.getMonth() - periodMonths)
  const periodStartStr = periodStart.toISOString().split('T')[0]
  const periodEndStr = now.toISOString().split('T')[0]

  // 取得所有活躍教師
  const teacherRows = rows<{ id: string; name: string }>(
    await db.execute(sql`
      SELECT id, name
      FROM manage_teachers
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
      ORDER BY name
    `)
  )

  if (teacherRows.length === 0) {
    return []
  }

  const teacherIds = teacherRows.map(t => t.id)

  // 批次取得教師出勤統計
  const attendanceRows = rows<{
    teacher_id: string
    total: string
    present: string
  }>(
    await db.execute(sql`
      SELECT
        teacher_id,
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE status = 'present')::text AS present
      FROM manage_teacher_attendance
      WHERE tenant_id = ${tenantId}
        AND teacher_id = ANY(${teacherIds})
        AND date >= ${periodStartStr}::date
        AND date <= ${periodEndStr}::date
      GROUP BY teacher_id
    `)
  )

  // 批次取得每位教師課程的學生保留率（active enrollments / total enrollments）
  const retentionRows = rows<{
    teacher_id: string
    active: string
    total: string
  }>(
    await db.execute(sql`
      SELECT
        c.teacher_id,
        COUNT(*) FILTER (WHERE e.status = 'active')::text AS active,
        COUNT(*)::text AS total
      FROM manage_enrollments e
      JOIN manage_courses c ON e.course_id = c.id
      WHERE e.tenant_id = ${tenantId}
        AND c.teacher_id = ANY(${teacherIds})
        AND e.deleted_at IS NULL
        AND e.created_at >= ${periodStartStr}::date
      GROUP BY c.teacher_id
    `).catch(() => []) // manage_courses may not have teacher_id column yet
  )

  // 批次取得家長滿意度（聯絡簿回饋評分）
  const satisfactionRows = rows<{
    teacher_id: string
    avg_rating: string
  }>(
    await db.execute(sql`
      SELECT
        e.teacher_id,
        AVG(f.rating)::text AS avg_rating
      FROM manage_contact_book_feedback f
      JOIN manage_contact_book_entries e ON f.entry_id = e.id
      WHERE e.tenant_id = ${tenantId}
        AND e.teacher_id = ANY(${teacherIds})
        AND f.rating IS NOT NULL
        AND e.entry_date >= ${periodStartStr}::date
      GROUP BY e.teacher_id
    `).catch(() => [])
  )

  // 建立快速查詢 map
  const attendanceMap = new Map(attendanceRows.map(r => [
    r.teacher_id,
    { total: parseInt(r.total, 10), present: parseInt(r.present, 10) },
  ]))
  const retentionMap = new Map(retentionRows.map(r => [
    r.teacher_id,
    { active: parseInt(r.active, 10), total: parseInt(r.total, 10) },
  ]))
  const satisfactionMap = new Map(satisfactionRows.map(r => [
    r.teacher_id,
    parseFloat(r.avg_rating),
  ]))

  const performances: TeacherPerformance[] = []

  for (const teacher of teacherRows) {
    const att = attendanceMap.get(teacher.id)
    const ret = retentionMap.get(teacher.id)

    const teacherAttendanceRate = att && att.total > 0
      ? att.present / att.total
      : 1.0 // default: fully present if no records

    const studentRetentionRate = ret && ret.total > 0
      ? ret.active / ret.total
      : 1.0

    const parentSatisfaction = satisfactionMap.get(teacher.id) ?? 4.0

    // Placeholders — needs exam/attendance data from inclass
    const studentProgressRate = 0.7
    const classAttendanceRate = 0.85

    // Weighted score: attendance 30%, retention 20%, satisfaction 25%, progress 15%, classAtt 10%
    const overallScore = Math.round(
      teacherAttendanceRate * 30 +
      studentRetentionRate * 20 +
      (parentSatisfaction / 5) * 25 +
      studentProgressRate * 15 +
      classAttendanceRate * 10
    )

    const perf: TeacherPerformance = {
      teacherId: teacher.id,
      teacherName: teacher.name,
      tenantId,
      period,
      teacherAttendanceRate,
      studentRetentionRate,
      parentSatisfaction,
      studentProgressRate,
      classAttendanceRate,
      overallScore,
      calculatedAt: new Date(),
    }

    // Upsert into manage_teacher_performance
    await db.execute(sql`
      INSERT INTO manage_teacher_performance (
        teacher_id, tenant_id, period,
        teacher_attendance_rate, student_retention_rate, parent_satisfaction,
        student_progress_rate, class_attendance_rate, overall_score, calculated_at
      ) VALUES (
        ${teacher.id}, ${tenantId}, ${period},
        ${teacherAttendanceRate}, ${studentRetentionRate}, ${parentSatisfaction},
        ${studentProgressRate}, ${classAttendanceRate}, ${overallScore}, NOW()
      )
      ON CONFLICT (teacher_id, period) DO UPDATE SET
        teacher_attendance_rate = EXCLUDED.teacher_attendance_rate,
        student_retention_rate  = EXCLUDED.student_retention_rate,
        parent_satisfaction     = EXCLUDED.parent_satisfaction,
        student_progress_rate   = EXCLUDED.student_progress_rate,
        class_attendance_rate   = EXCLUDED.class_attendance_rate,
        overall_score           = EXCLUDED.overall_score,
        calculated_at           = NOW()
    `).catch((err: unknown) => {
      logger.warn({ err, teacherId: teacher.id }, '[intelligence] upsert teacher performance skipped')
    })

    performances.push(perf)
  }

  logger.info({ tenantId, period, count: performances.length }, '[intelligence] calculateTeacherPerformance done')
  return performances
}

// ============ 3. 營收預測 ============

/**
 * 根據目前招生數、平均月費、流失率及季節因子，預測未來 N 個月的營收。
 */
export async function generateRevenueForecast(
  tenantId: string,
  months = 3
): Promise<RevenueForecast[]> {
  // 取得活躍招生數
  const enrollmentRow = first<{ count: string }>(
    await db.execute(sql`
      SELECT COUNT(*)::text AS count
      FROM manage_enrollments
      WHERE tenant_id = ${tenantId}
        AND status = 'active'
        AND deleted_at IS NULL
    `)
  )
  const activeEnrollments = parseInt(enrollmentRow?.count ?? '0', 10)

  // 取得課程平均月費
  const feeRow = first<{ avg_fee: string }>(
    await db.execute(sql`
      SELECT AVG(fee_monthly)::text AS avg_fee
      FROM manage_courses
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND fee_monthly IS NOT NULL
    `)
  )
  const avgMonthlyFee = parseFloat(feeRow?.avg_fee ?? '0') || 0

  const baseRevenue = activeEnrollments * avgMonthlyFee

  // 取得近 3 個月平均流失率（從 churn scans 均值，fallback 5%）
  const churnRow = first<{ avg_churn: string }>(
    await db.execute(sql`
      SELECT AVG(churn_risk_score)::text AS avg_churn
      FROM manage_churn_scans
      WHERE tenant_id = ${tenantId}
        AND scanned_at >= NOW() - INTERVAL '3 months'
    `).catch(() => [])
  )
  const avgChurnRate = Math.min(
    parseFloat(churnRow?.avg_churn ?? '5') / 100,
    0.5 // cap at 50%
  )

  const now = new Date()
  const forecasts: RevenueForecast[] = []

  for (let i = 1; i <= months; i++) {
    const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const forecastMonth = forecastDate.toISOString().slice(0, 7) // YYYY-MM
    const monthNum = forecastDate.getMonth() + 1

    const seasonalFactor = getSeasonalFactor(monthNum)
    const churnAdjustment = baseRevenue * avgChurnRate * i * 0.5
    const expectedRevenue = Math.max(
      0,
      baseRevenue * seasonalFactor - churnAdjustment
    )

    // 歷史資料越多 confidence 越高，基本值 80
    const confidence = Math.min(80 + Math.floor(activeEnrollments / 10), 95)

    const forecast: RevenueForecast = {
      tenantId,
      month: forecastMonth,
      expectedRevenue: Math.round(expectedRevenue),
      confidence,
      seasonalFactor,
      churnAdjustment: Math.round(churnAdjustment),
    }

    await db.execute(sql`
      INSERT INTO manage_revenue_forecasts (
        tenant_id, month, expected_revenue, confidence,
        seasonal_factor, churn_adjustment, created_at
      ) VALUES (
        ${tenantId}, ${forecastMonth}, ${forecast.expectedRevenue},
        ${confidence}, ${seasonalFactor}, ${forecast.churnAdjustment}, NOW()
      )
      ON CONFLICT (tenant_id, month) DO UPDATE SET
        expected_revenue  = EXCLUDED.expected_revenue,
        confidence        = EXCLUDED.confidence,
        seasonal_factor   = EXCLUDED.seasonal_factor,
        churn_adjustment  = EXCLUDED.churn_adjustment,
        created_at        = NOW()
    `).catch((err: unknown) => {
      logger.warn({ err, month: forecastMonth }, '[intelligence] upsert revenue forecast skipped')
    })

    forecasts.push(forecast)
  }

  logger.info({ tenantId, months, forecasts: forecasts.length }, '[intelligence] generateRevenueForecast done')
  return forecasts
}

// ============ 4. 機構健康分數 ============

/**
 * 從最新的學習歷程與教師績效聚合出機構整體健康分數（0-100）。
 */
export async function calculateHealthScore(tenantId: string): Promise<HealthScore> {
  // 取得最新學習歷程統計
  const profileStats = first<{
    avg_renewal: string
    count: string
  }>(
    await db.execute(sql`
      SELECT
        AVG(renewal_probability)::text AS avg_renewal,
        COUNT(*)::text AS count
      FROM manage_student_learning_profiles
      WHERE tenant_id = ${tenantId}
    `).catch(() => [])
  )

  // 取得最新教師績效統計
  const teacherStats = first<{
    avg_attendance: string
    avg_satisfaction: string
  }>(
    await db.execute(sql`
      SELECT
        AVG(teacher_attendance_rate)::text AS avg_attendance,
        AVG(parent_satisfaction)::text AS avg_satisfaction
      FROM manage_teacher_performance
      WHERE tenant_id = ${tenantId}
    `).catch(() => [])
  )

  // 取得最新預測的 confidence 作為 revenueTrend 指標
  const forecastStats = first<{ avg_confidence: string }>(
    await db.execute(sql`
      SELECT AVG(confidence)::text AS avg_confidence
      FROM manage_revenue_forecasts
      WHERE tenant_id = ${tenantId}
        AND created_at >= NOW() - INTERVAL '7 days'
    `).catch(() => [])
  )

  // 正規化各項指標 (0-100)
  const renewalRate = Math.min(100, parseFloat(profileStats?.avg_renewal ?? '70'))
  const revenueTrend = Math.min(100, parseFloat(forecastStats?.avg_confidence ?? '70'))

  const rawTeacherAtt = parseFloat(teacherStats?.avg_attendance ?? '0.85')
  const teacherStability = Math.min(100, rawTeacherAtt * 100)

  const rawSatisfaction = parseFloat(teacherStats?.avg_satisfaction ?? '4.0')
  const parentSatisfaction = Math.min(100, (rawSatisfaction / 5) * 100)

  // 出席率 placeholder（未與 inclass 串接前使用預設 85%）
  const attendanceRate = 85

  // 加權計算 (weights: revenue 25%, renewal 25%, attendance 20%, satisfaction 15%, teacher 15%)
  const score = Math.round(
    revenueTrend * 0.25 +
    renewalRate * 0.25 +
    attendanceRate * 0.20 +
    parentSatisfaction * 0.15 +
    teacherStability * 0.15
  )

  const breakdown: Record<string, number> = {
    revenueTrend: Math.round(revenueTrend),
    renewalRate: Math.round(renewalRate),
    attendanceRate: Math.round(attendanceRate),
    parentSatisfaction: Math.round(parentSatisfaction),
    teacherStability: Math.round(teacherStability),
  }

  logger.info({ tenantId, score, breakdown }, '[intelligence] calculateHealthScore done')
  return { score: Math.min(100, Math.max(0, score)), breakdown }
}

// ============ 5. 取得單一學生學習歷程 ============

/**
 * 查詢單一學生的學習歷程（joined 學生基本資訊）。
 */
export async function getLearningProfile(
  tenantId: string,
  studentId: string
): Promise<(LearningProfile & { grade: string | null; guardianName: string | null }) | null> {
  const row = first<{
    student_id: string
    student_name: string
    tenant_id: string
    payment_status: string
    churn_risk_score: number
    renewal_probability: number
    avg_score_trend: string
    updated_at: string
    grade: string | null
    guardian_name: string | null
  }>(
    await db.execute(sql`
      SELECT
        p.student_id,
        s.name            AS student_name,
        p.tenant_id,
        p.payment_status,
        p.churn_risk_score,
        p.renewal_probability,
        p.avg_score_trend,
        p.updated_at,
        s.grade,
        s.guardian_name
      FROM manage_student_learning_profiles p
      JOIN manage_students s ON p.student_id = s.id
      WHERE p.tenant_id = ${tenantId}
        AND p.student_id = ${studentId}
        AND s.deleted_at IS NULL
      LIMIT 1
    `).catch(() => [])
  )

  if (!row) return null

  const paymentStatus = (['paid', 'pending', 'overdue'].includes(row.payment_status)
    ? row.payment_status
    : 'unknown') as LearningProfile['paymentStatus']

  const avgScoreTrend = (['improving', 'declining', 'stable'].includes(row.avg_score_trend)
    ? row.avg_score_trend
    : 'stable') as LearningProfile['avgScoreTrend']

  return {
    studentId: row.student_id,
    studentName: row.student_name,
    tenantId: row.tenant_id,
    paymentStatus,
    churnRiskScore: row.churn_risk_score,
    renewalProbability: row.renewal_probability,
    avgScoreTrend,
    updatedAt: new Date(row.updated_at),
    grade: row.grade,
    guardianName: row.guardian_name,
  }
}
