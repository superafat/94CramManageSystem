import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { RBACVariables } from '../../middleware/rbac'
import { requirePermission, requireRole, Role, Permission } from '../../middleware/rbac'
import { uuidSchema } from '../../utils/validation'
import { analyzeChurnRisk } from '../../ai/churn'
import { generateBranchReport, generateStudentReport } from '../../ai/reports'
import { branchReportToMd, churnRisksToMd } from '../../utils/markdown'
import { db, sql, success, notFound, internalError, rows, wantsMd, mdResponse } from './_helpers'

const reportsRoutes = new Hono<{ Variables: RBACVariables }>()

const trendQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
})

reportsRoutes.get('/reports/trend',
  requirePermission(Permission.STUDENTS_READ),
  zValidator('query', trendQuerySchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const { months } = c.req.valid('query')

    try {
      // Generate the last N month buckets
      const monthRows = await db.execute(sql`
        SELECT TO_CHAR(m, 'YYYY-MM') as month
        FROM generate_series(
          date_trunc('month', NOW()) - (${months - 1} || ' months')::interval,
          date_trunc('month', NOW()),
          '1 month'::interval
        ) AS m
        ORDER BY m
      `)

      // Active students per month
      const studentRows = await db.execute(sql`
        SELECT
          TO_CHAR(date_trunc('month', generate_series), 'YYYY-MM') as month,
          COUNT(s.id)::int as active_students
        FROM generate_series(
          date_trunc('month', NOW()) - (${months - 1} || ' months')::interval,
          date_trunc('month', NOW()),
          '1 month'::interval
        ) AS generate_series
        LEFT JOIN students s
          ON s.tenant_id = ${tenantId}
          AND s.status = 'active'
          AND s.created_at <= (generate_series + interval '1 month' - interval '1 second')
          AND (s.deleted_at IS NULL OR s.deleted_at > generate_series)
        GROUP BY 1
        ORDER BY 1
      `)

      // Attendance rate per month
      const attRows = await db.execute(sql`
        SELECT
          TO_CHAR(date_trunc('month', a.date), 'YYYY-MM') as month,
          COUNT(*)::int as total,
          SUM(CASE WHEN a.present THEN 1 ELSE 0 END)::int as present_count
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        WHERE s.tenant_id = ${tenantId}
          AND a.date >= date_trunc('month', NOW()) - (${months - 1} || ' months')::interval
          AND a.date < date_trunc('month', NOW()) + interval '1 month'
        GROUP BY 1
        ORDER BY 1
      `)

      // Average grade score per month
      const gradeRows = await db.execute(sql`
        SELECT
          TO_CHAR(date_trunc('month', COALESCE(g.date, g.exam_date)), 'YYYY-MM') as month,
          ROUND(AVG(g.score)::numeric, 1)::float as avg_score
        FROM grades g
        JOIN students s ON g.student_id = s.id
        WHERE g.tenant_id = ${tenantId}
          AND COALESCE(g.date, g.exam_date) >= date_trunc('month', NOW()) - (${months - 1} || ' months')::interval
          AND COALESCE(g.date, g.exam_date) < date_trunc('month', NOW()) + interval '1 month'
        GROUP BY 1
        ORDER BY 1
      `)

      // Build lookup maps
      const studentMap = new Map<string, number>()
      for (const r of rows(studentRows)) {
        studentMap.set(r.month as string, r.active_students as number)
      }

      const attMap = new Map<string, { total: number; present: number }>()
      for (const r of rows(attRows)) {
        attMap.set(r.month as string, { total: r.total as number, present: r.present_count as number })
      }

      const gradeMap = new Map<string, number>()
      for (const r of rows(gradeRows)) {
        gradeMap.set(r.month as string, r.avg_score as number)
      }

      const result = rows(monthRows).map((r) => {
        const month = r.month as string
        const att = attMap.get(month)
        const attendanceRate = att && att.total > 0
          ? Math.round((att.present / att.total) * 100)
          : 0
        return {
          month,
          activeStudents: studentMap.get(month) ?? 0,
          attendanceRate,
          avgScore: gradeMap.get(month) ?? 0,
        }
      })

      return success(c, { months: result })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

reportsRoutes.get('/reports/branch/:branchId',
  requirePermission(Permission.REPORTS_READ),
  zValidator('param', z.object({ branchId: uuidSchema })),
  zValidator('query', z.object({ period: z.string().regex(/^\d{4}-\d{2}$/).optional() })),
  async (c) => {
    const user = c.get('user')
    const { branchId } = c.req.valid('param')
    const { period } = c.req.valid('query')

    try {
      const report = await generateBranchReport(user.tenant_id, branchId, period)
      if (wantsMd(c)) return mdResponse(c, branchReportToMd(report))
      return success(c, report)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

reportsRoutes.get('/reports/student/:studentId',
  requirePermission(Permission.REPORTS_READ),
  zValidator('param', z.object({ studentId: uuidSchema })),
  async (c) => {
    const user = c.get('user')
    const { studentId } = c.req.valid('param')

    try {
      const report = await generateStudentReport(user.tenant_id, studentId)
      if (!report) {
        return notFound(c, 'Student')
      }
      return success(c, report)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

reportsRoutes.get('/churn/:branchId',
  requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('param', z.object({ branchId: uuidSchema })),
  zValidator('query', z.object({ days: z.coerce.number().int().min(7).max(365).default(60) })),
  async (c) => {
    const user = c.get('user')
    const { branchId } = c.req.valid('param')
    const { days } = c.req.valid('query')

    try {
      const risks = await analyzeChurnRisk(user.tenant_id, branchId, days)
      if (wantsMd(c)) return mdResponse(c, churnRisksToMd(risks))

      const high = risks.filter(r => r.riskLevel === 'high')
      const medium = risks.filter(r => r.riskLevel === 'medium')

      return success(c, {
        total: risks.length,
        highRisk: high.length,
        mediumRisk: medium.length,
        lowRisk: risks.length - high.length - medium.length,
        students: risks,
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

export { reportsRoutes }
