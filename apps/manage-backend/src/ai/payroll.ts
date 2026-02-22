/**
 * W5: Auto Payroll Engine
 * Calculate teacher pay from lesson records
 */
import { db } from '../db/index'
import { sql } from 'drizzle-orm'

export interface PayrollSummary {
  teacherId: string
  teacherName: string
  period: string
  tutoringSessions: number
  privateSessions: number
  assistantSessions: number
  tutoringAmount: number
  privateAmount: number
  assistantAmount: number
  totalAmount: number
  status: string
}

/**
 * Calculate payroll for all teachers in a branch for a month
 * Counts completed lessons and multiplies by hourly rates
 */
export async function calculatePayroll(
  tenantId: string,
  branchId: string,
  period: string  // '2026-02'
): Promise<{ calculated: number; records: PayrollSummary[] }> {
  const [year, month] = period.split('-').map(Number)
  const startDate = `${period}-01`
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10)

  // Count lessons per teacher (attendance = present)
  const lessonCounts = await db.execute(sql`
    SELECT
      l.teacher_id,
      t.name as teacher_name,
      t.hourly_rates,
      COUNT(*) FILTER (WHERE l.attendance = 'present')::int as sessions
    FROM lessons l
    JOIN teachers t ON l.teacher_id = t.id
    WHERE l.tenant_id = ${tenantId}
      AND l.date >= ${startDate}::date
      AND l.date <= ${endDate}::date
      AND l.teacher_id IS NOT NULL
    GROUP BY l.teacher_id, t.name, t.hourly_rates
  `) as unknown as any[]

  const records: PayrollSummary[] = []

  for (const row of lessonCounts) {
    const rates = row.hourly_rates ?? { tutoring: 250, private: 350, assistant: 88 }
    const sessions = row.sessions

    // Default: all sessions are tutoring (can be refined later with lesson types)
    const tutoringAmount = sessions * (rates.tutoring ?? 250)

    // Check if record exists
    const existing = await db.execute(sql`
      SELECT id FROM payroll_records
      WHERE tenant_id = ${tenantId} AND teacher_id = ${row.teacher_id} AND period = ${period}
    `) as unknown as any[]

    if (existing.length > 0) continue

    await db.execute(sql`
      INSERT INTO payroll_records (tenant_id, teacher_id, period, tutoring_sessions, tutoring_amount, total_amount)
      VALUES (${tenantId}, ${row.teacher_id}, ${period}, ${sessions}, ${tutoringAmount}, ${tutoringAmount})
    `)

    records.push({
      teacherId: row.teacher_id,
      teacherName: row.teacher_name,
      period,
      tutoringSessions: sessions,
      privateSessions: 0,
      assistantSessions: 0,
      tutoringAmount,
      privateAmount: 0,
      assistantAmount: 0,
      totalAmount: tutoringAmount,
      status: 'draft',
    })
  }

  return { calculated: records.length, records }
}

/**
 * Get payroll records for a period
 */
export async function getPayroll(tenantId: string, period: string) {
  return db.execute(sql`
    SELECT pr.*, t.name as teacher_name
    FROM payroll_records pr
    JOIN teachers t ON pr.teacher_id = t.id
    WHERE pr.tenant_id = ${tenantId} AND pr.period = ${period}
    ORDER BY t.name
  `)
}
