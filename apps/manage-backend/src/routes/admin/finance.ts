import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { RBACVariables } from '../../middleware/rbac'
import { requirePermission, Permission } from '../../middleware/rbac'
import { db, sql, success, internalError } from './_helpers'

const financeRoutes = new Hono<{ Variables: RBACVariables }>()

// ─── Finance Summary (aggregated stats) ──────────────────────────────────────
financeRoutes.get('/finance/summary',
  requirePermission(Permission.BILLING_READ),
  zValidator('query', z.object({
    mode: z.enum(['month', 'quarter', 'year']).default('month'),
    year: z.coerce.number().int().min(2020).max(2100).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    quarter: z.coerce.number().int().min(1).max(4).optional(),
  })),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const query = c.req.valid('query')
    const now = new Date()
    const year = query.year ?? now.getFullYear()

    let startDate: string
    let endDate: string

    if (query.mode === 'year') {
      startDate = `${year}-01-01`
      endDate = `${year}-12-31`
    } else if (query.mode === 'quarter') {
      const q = query.quarter ?? Math.ceil((now.getMonth() + 1) / 3)
      const sm = (q - 1) * 3 + 1
      startDate = `${year}-${String(sm).padStart(2, '0')}-01`
      const em = sm + 2
      const lastDay = new Date(year, em, 0).getDate()
      endDate = `${year}-${String(em).padStart(2, '0')}-${lastDay}`
    } else {
      const month = query.month ?? (now.getMonth() + 1)
      startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`
    }

    try {
      // Revenue: sum of paid billing amounts in period
      const [revenue] = await db.execute(sql`
        SELECT COALESCE(SUM(amount), 0)::numeric AS total
        FROM manage_payments
        WHERE tenant_id = ${tenantId}
          AND status = 'paid'
          AND paid_at >= ${startDate}::date
          AND paid_at <= ${endDate}::date
      `) as any[]

      // Expenses: sum from manage_expenses in period
      const [expenses] = await db.execute(sql`
        SELECT COALESCE(SUM(amount), 0)::numeric AS total
        FROM manage_expenses
        WHERE tenant_id = ${tenantId}
          AND deleted_at IS NULL
          AND expense_date >= ${startDate}::date
          AND expense_date <= ${endDate}::date
      `) as any[]

      // Course count: distinct active courses with schedules in period
      const [courses] = await db.execute(sql`
        SELECT COUNT(DISTINCT course_id)::int AS total
        FROM inclass_schedules
        WHERE tenant_id = ${tenantId}
          AND start_time >= ${startDate}::date
          AND start_time <= (${endDate}::date + interval '1 day')
      `) as any[]

      // Teacher count: active teachers
      const [teachers] = await db.execute(sql`
        SELECT COUNT(*)::int AS total
        FROM manage_teachers
        WHERE tenant_id = ${tenantId}
          AND deleted_at IS NULL
      `) as any[]

      // Monthly breakdown for chart (when mode is year or quarter)
      let breakdown: { month: string; revenue: number; expenses: number }[] = []
      if (query.mode === 'year' || query.mode === 'quarter') {
        const bdRows = await db.execute(sql`
          SELECT
            TO_CHAR(d.month, 'YYYY-MM') AS month,
            COALESCE(r.total, 0)::numeric AS revenue,
            COALESCE(e.total, 0)::numeric AS expenses
          FROM generate_series(${startDate}::date, ${endDate}::date, '1 month') AS d(month)
          LEFT JOIN LATERAL (
            SELECT SUM(amount) AS total
            FROM manage_payments
            WHERE tenant_id = ${tenantId} AND status = 'paid'
              AND paid_at >= d.month AND paid_at < d.month + interval '1 month'
          ) r ON true
          LEFT JOIN LATERAL (
            SELECT SUM(amount) AS total
            FROM manage_expenses
            WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
              AND expense_date >= d.month AND expense_date < d.month + interval '1 month'
          ) e ON true
          ORDER BY d.month
        `)
        breakdown = (Array.isArray(bdRows) ? bdRows : []).map((row: any) => ({
          month: row.month,
          revenue: Number(row.revenue) || 0,
          expenses: Number(row.expenses) || 0,
        }))
      }

      return success(c, {
        period: { mode: query.mode, startDate, endDate, year },
        revenue: Number(revenue?.total) || 0,
        expenses: Number(expenses?.total) || 0,
        courseCount: courses?.total ?? 0,
        teacherCount: teachers?.total ?? 0,
        breakdown,
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ─── AI Financial Analysis ───────────────────────────────────────────────────
financeRoutes.post('/finance/ai-analysis',
  requirePermission(Permission.REPORTS_READ),
  zValidator('json', z.object({
    mode: z.enum(['month', 'year']).default('month'),
    year: z.coerce.number().int().optional(),
    month: z.coerce.number().int().optional(),
  })),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const body = c.req.valid('json')
    const now = new Date()
    const year = body.year ?? now.getFullYear()
    const month = body.month ?? (now.getMonth() + 1)

    let startDate: string
    let endDate: string

    if (body.mode === 'year') {
      startDate = `${year}-01-01`
      endDate = `${year}-12-31`
    } else {
      startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`
    }

    try {
      // Gather financial data for AI analysis
      const [revData] = await db.execute(sql`
        SELECT COALESCE(SUM(amount), 0)::numeric AS total, COUNT(*)::int AS count
        FROM manage_payments
        WHERE tenant_id = ${tenantId} AND status = 'paid'
          AND paid_at >= ${startDate}::date AND paid_at <= ${endDate}::date
      `) as any[]

      const [expData] = await db.execute(sql`
        SELECT COALESCE(SUM(amount), 0)::numeric AS total, COUNT(*)::int AS count
        FROM manage_expenses
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
          AND expense_date >= ${startDate}::date AND expense_date <= ${endDate}::date
      `) as any[]

      const expByCategory = await db.execute(sql`
        SELECT category, SUM(amount)::numeric AS total
        FROM manage_expenses
        WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
          AND expense_date >= ${startDate}::date AND expense_date <= ${endDate}::date
        GROUP BY category ORDER BY total DESC
      `)

      const [salaryData] = await db.execute(sql`
        SELECT COALESCE(SUM(
          CASE WHEN sa.type = 'bonus' THEN sa.amount ELSE -sa.amount END
        ), 0)::numeric AS net_adjustments
        FROM manage_salary_adjustments sa
        WHERE sa.tenant_id = ${tenantId}
          AND sa.period_start >= ${startDate}::date
          AND sa.period_end <= ${endDate}::date
      `) as any[]

      const revenue = Number(revData?.total) || 0
      const expenseTotal = Number(expData?.total) || 0
      const netProfit = revenue - expenseTotal
      const categoryBreakdown = (Array.isArray(expByCategory) ? expByCategory : [])
        .map((r: any) => `${r.category}: $${Number(r.total).toLocaleString()}`)
        .join(', ')

      const period = body.mode === 'year' ? `${year}年` : `${year}年${month}月`
      const analysis = [
        `## ${period} 財務分析報告`,
        '',
        `### 收支概況`,
        `- **總營收**: $${revenue.toLocaleString()}（${revData?.count ?? 0} 筆繳費）`,
        `- **總支出**: $${expenseTotal.toLocaleString()}（${expData?.count ?? 0} 筆）`,
        `- **淨利潤**: $${netProfit.toLocaleString()}`,
        `- **利潤率**: ${revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : 0}%`,
        '',
        `### 支出分類明細`,
        categoryBreakdown || '（無支出記錄）',
        '',
        `### 薪資調整淨額`,
        `$${Number(salaryData?.net_adjustments || 0).toLocaleString()}`,
        '',
        `### 建議`,
        revenue === 0 && expenseTotal === 0
          ? '本期無財務數據，建議開始記錄收支。'
          : netProfit < 0
          ? `本期虧損 $${Math.abs(netProfit).toLocaleString()}，建議檢視支出項目，尤其是佔比最大的類別。`
          : `本期獲利 $${netProfit.toLocaleString()}，營運狀況良好。建議持續追蹤各類別支出變化趨勢。`,
      ].join('\n')

      return success(c, { analysis, period, revenue, expenses: expenseTotal, netProfit })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

export { financeRoutes }
