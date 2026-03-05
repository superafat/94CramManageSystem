/**
 * Platform Finance Routes — 財務管理 API
 * 僅 SUPERADMIN 可存取（由 platform/index.ts 統一掛 middleware）
 *
 * Routes:
 *   === 財務總覽 ===
 *   GET    /overview              — 本月收入/支出/毛利 + 近 12 月趨勢
 *
 *   === 方案定價 ===
 *   GET    /pricing               — 方案定價列表
 *   PUT    /pricing/:id           — 修改定價
 *
 *   === 收款紀錄 ===
 *   GET    /payments              — 收款列表（篩選 + 分頁）
 *   POST   /payments              — 新增收款
 *   PUT    /payments/:id          — 修改收款
 *   DELETE /payments/:id          — 刪除收款
 *
 *   === 支出紀錄 ===
 *   GET    /costs                 — 支出列表（篩選 + 分頁）
 *   POST   /costs                 — 新增支出
 *   PUT    /costs/:id             — 修改支出
 *   DELETE /costs/:id             — 刪除支出
 *
 *   === 財務報表 ===
 *   GET    /reports/pnl           — 損益表
 *   GET    /reports/mrr           — 每月固定收入趨勢
 *   GET    /reports/receivables   — 應收帳款（帳齡分析）
 *   GET    /reports/export        — 匯出 CSV
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../../db'
import { sql } from 'drizzle-orm'
import { success, successWithPagination, badRequest, notFound, internalError } from '../../utils/response'
import { logger } from '../../utils/logger'
import type { RBACVariables } from '../../middleware/rbac'

export const platformFinanceRoutes = new Hono<{ Variables: RBACVariables }>()

// Helper: normalise drizzle result rows
type AnyRow = Record<string, unknown>
function getRows(result: unknown): AnyRow[] {
  if (Array.isArray(result)) return result as AnyRow[]
  return ((result as { rows?: unknown[] })?.rows ?? []) as AnyRow[]
}

// ─────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────

const uuidParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID' }),
})

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

const paymentListQuerySchema = paginationQuerySchema.extend({
  tenantId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

const costListQuerySchema = paginationQuerySchema.extend({
  category: z.enum(['infra', 'ai', 'domain', 'labor', 'other']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

const createPaymentSchema = z.object({
  tenantId: z.string().uuid(),
  amount: z.number().int().positive(),
  paidAt: z.string(),
  method: z.enum(['transfer', 'cash', 'other']).default('transfer'),
  invoiceNo: z.string().max(50).optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  notes: z.string().max(500).optional(),
})

const updatePaymentSchema = z.object({
  tenantId: z.string().uuid().optional(),
  amount: z.number().int().positive().optional(),
  paidAt: z.string().optional(),
  method: z.enum(['transfer', 'cash', 'other']).optional(),
  invoiceNo: z.string().max(50).optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  notes: z.string().max(500).optional(),
})

const createCostSchema = z.object({
  category: z.enum(['infra', 'ai', 'domain', 'labor', 'other']),
  subcategory: z.string().max(50).optional(),
  amount: z.number().int().positive(),
  date: z.string(),
  description: z.string().max(500).optional(),
  isRecurring: z.boolean().default(false),
})

const updateCostSchema = z.object({
  category: z.enum(['infra', 'ai', 'domain', 'labor', 'other']).optional(),
  subcategory: z.string().max(50).optional(),
  amount: z.number().int().positive().optional(),
  date: z.string().optional(),
  description: z.string().max(500).optional(),
  isRecurring: z.boolean().optional(),
})

const updatePricingSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  monthlyPrice: z.number().int().nonnegative().optional(),
  features: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
})

const pnlQuerySchema = z.object({
  period: z.enum(['monthly', 'quarterly']).default('monthly'),
})

const exportQuerySchema = z.object({
  type: z.enum(['payments', 'costs']),
  startDate: z.string(),
  endDate: z.string(),
})

// ─────────────────────────────────────────────
// GET /overview — 財務總覽
// ─────────────────────────────────────────────
platformFinanceRoutes.get('/overview', async (c) => {
  try {
    // 本月收入
    const revenueResult = await db.execute(sql`
      SELECT COALESCE(SUM(amount), 0)::text AS total
      FROM platform_payments
      WHERE paid_at >= date_trunc('month', NOW())
    `)
    const monthlyRevenue = parseInt(getRows(revenueResult)[0]?.total as string ?? '0', 10)

    // 本月支出
    const costResult = await db.execute(sql`
      SELECT COALESCE(SUM(amount), 0)::text AS total
      FROM platform_costs
      WHERE date >= date_trunc('month', NOW())
    `)
    const monthlyCost = parseInt(getRows(costResult)[0]?.total as string ?? '0', 10)

    // 近 12 月收入趨勢
    const revenueTrend = await db.execute(sql`
      SELECT date_trunc('month', paid_at) AS month, SUM(amount)::text AS revenue
      FROM platform_payments
      WHERE paid_at >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month
    `)

    // 近 12 月支出趨勢
    const costTrend = await db.execute(sql`
      SELECT date_trunc('month', date) AS month, SUM(amount)::text AS cost
      FROM platform_costs
      WHERE date >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month
    `)

    return success(c, {
      currentMonth: {
        revenue: monthlyRevenue,
        cost: monthlyCost,
        profit: monthlyRevenue - monthlyCost,
      },
      revenueTrend: getRows(revenueTrend).map((r) => ({
        month: r.month,
        revenue: parseInt(r.revenue as string ?? '0', 10),
      })),
      costTrend: getRows(costTrend).map((r) => ({
        month: r.month,
        cost: parseInt(r.cost as string ?? '0', 10),
      })),
    })
  } catch (err) {
    logger.error({ err }, '[Platform Finance] GET /overview error')
    return internalError(c, err)
  }
})

// ─────────────────────────────────────────────
// GET /pricing — 方案定價列表
// ─────────────────────────────────────────────
platformFinanceRoutes.get('/pricing', async (c) => {
  try {
    const result = await db.execute(sql`
      SELECT id, plan_key, name, monthly_price, features, is_active, created_at, updated_at
      FROM platform_plan_pricing
      ORDER BY monthly_price ASC
    `)
    return success(c, getRows(result))
  } catch (err) {
    logger.error({ err }, '[Platform Finance] GET /pricing error')
    return internalError(c, err)
  }
})

// ─────────────────────────────────────────────
// PUT /pricing/:id — 修改定價
// ─────────────────────────────────────────────
platformFinanceRoutes.put(
  '/pricing/:id',
  zValidator('param', uuidParamSchema),
  zValidator('json', updatePricingSchema),
  async (c) => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')

    if (Object.keys(body).length === 0) {
      return badRequest(c, 'At least one field is required')
    }

    try {
      const setClauses: ReturnType<typeof sql>[] = []

      if (body.name !== undefined) {
        setClauses.push(sql`name = ${body.name}`)
      }
      if (body.monthlyPrice !== undefined) {
        setClauses.push(sql`monthly_price = ${body.monthlyPrice}`)
      }
      if (body.features !== undefined) {
        setClauses.push(sql`features = ${JSON.stringify(body.features)}::jsonb`)
      }
      if (body.isActive !== undefined) {
        setClauses.push(sql`is_active = ${body.isActive}`)
      }
      setClauses.push(sql`updated_at = NOW()`)

      const setClause = sql.join(setClauses, sql`, `)

      const result = await db.execute(sql`
        UPDATE platform_plan_pricing
        SET ${setClause}
        WHERE id = ${id}
        RETURNING id
      `)

      if (getRows(result).length === 0) {
        return notFound(c, 'Plan pricing')
      }

      logger.info({ pricingId: id, fields: Object.keys(body) }, '[Platform Finance] Pricing updated')
      return success(c, { id, updated: true })
    } catch (err) {
      logger.error({ err, pricingId: id }, '[Platform Finance] PUT /pricing/:id error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// GET /payments — 收款列表（篩選 + 分頁）
// ─────────────────────────────────────────────
platformFinanceRoutes.get(
  '/payments',
  zValidator('query', paymentListQuerySchema),
  async (c) => {
    const { tenantId, startDate, endDate, page, limit } = c.req.valid('query')
    const offset = (page - 1) * limit

    try {
      const conditions: ReturnType<typeof sql>[] = [sql`1=1`]

      if (tenantId) {
        conditions.push(sql`p.tenant_id = ${tenantId}`)
      }
      if (startDate) {
        conditions.push(sql`p.paid_at >= ${startDate}::timestamp`)
      }
      if (endDate) {
        conditions.push(sql`p.paid_at <= ${endDate}::timestamp`)
      }

      const whereClause = sql.join(conditions, sql` AND `)

      const countResult = await db.execute(sql`
        SELECT COUNT(*)::text AS total
        FROM platform_payments p
        WHERE ${whereClause}
      `)
      const total = parseInt(getRows(countResult)[0]?.total as string ?? '0', 10)

      const result = await db.execute(sql`
        SELECT p.id, p.tenant_id, p.amount, p.paid_at, p.method,
               p.invoice_no, p.period_start, p.period_end, p.notes, p.created_at,
               t.name AS tenant_name
        FROM platform_payments p
        LEFT JOIN tenants t ON t.id = p.tenant_id
        WHERE ${whereClause}
        ORDER BY p.paid_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `)

      return successWithPagination(c, getRows(result), { page, limit, total })
    } catch (err) {
      logger.error({ err }, '[Platform Finance] GET /payments error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// POST /payments — 新增收款
// ─────────────────────────────────────────────
platformFinanceRoutes.post(
  '/payments',
  zValidator('json', createPaymentSchema),
  async (c) => {
    const body = c.req.valid('json')

    try {
      const id = crypto.randomUUID()

      await db.execute(sql`
        INSERT INTO platform_payments (id, tenant_id, amount, paid_at, method, invoice_no, period_start, period_end, notes, created_at)
        VALUES (
          ${id},
          ${body.tenantId},
          ${body.amount},
          ${body.paidAt}::timestamp,
          ${body.method},
          ${body.invoiceNo ?? null},
          ${body.periodStart ? sql`${body.periodStart}::timestamp` : sql`NULL`},
          ${body.periodEnd ? sql`${body.periodEnd}::timestamp` : sql`NULL`},
          ${body.notes ?? null},
          NOW()
        )
      `)

      // 更新租戶最後付款日期
      await db.execute(sql`
        UPDATE tenants
        SET last_payment_at = ${body.paidAt}::timestamp,
            updated_at = NOW()
        WHERE id = ${body.tenantId}
      `)

      logger.info({ paymentId: id, tenantId: body.tenantId, amount: body.amount }, '[Platform Finance] Payment created')
      return success(c, { id, created: true }, 201)
    } catch (err) {
      logger.error({ err }, '[Platform Finance] POST /payments error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// PUT /payments/:id — 修改收款
// ─────────────────────────────────────────────
platformFinanceRoutes.put(
  '/payments/:id',
  zValidator('param', uuidParamSchema),
  zValidator('json', updatePaymentSchema),
  async (c) => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')

    if (Object.keys(body).length === 0) {
      return badRequest(c, 'At least one field is required')
    }

    try {
      const setClauses: ReturnType<typeof sql>[] = []

      if (body.tenantId !== undefined) {
        setClauses.push(sql`tenant_id = ${body.tenantId}`)
      }
      if (body.amount !== undefined) {
        setClauses.push(sql`amount = ${body.amount}`)
      }
      if (body.paidAt !== undefined) {
        setClauses.push(sql`paid_at = ${body.paidAt}::timestamp`)
      }
      if (body.method !== undefined) {
        setClauses.push(sql`method = ${body.method}`)
      }
      if (body.invoiceNo !== undefined) {
        setClauses.push(sql`invoice_no = ${body.invoiceNo}`)
      }
      if (body.periodStart !== undefined) {
        setClauses.push(sql`period_start = ${body.periodStart}::timestamp`)
      }
      if (body.periodEnd !== undefined) {
        setClauses.push(sql`period_end = ${body.periodEnd}::timestamp`)
      }
      if (body.notes !== undefined) {
        setClauses.push(sql`notes = ${body.notes}`)
      }

      const setClause = sql.join(setClauses, sql`, `)

      const result = await db.execute(sql`
        UPDATE platform_payments
        SET ${setClause}
        WHERE id = ${id}
        RETURNING id
      `)

      if (getRows(result).length === 0) {
        return notFound(c, 'Payment')
      }

      logger.info({ paymentId: id, fields: Object.keys(body) }, '[Platform Finance] Payment updated')
      return success(c, { id, updated: true })
    } catch (err) {
      logger.error({ err, paymentId: id }, '[Platform Finance] PUT /payments/:id error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// DELETE /payments/:id — 刪除收款
// ─────────────────────────────────────────────
platformFinanceRoutes.delete(
  '/payments/:id',
  zValidator('param', uuidParamSchema),
  async (c) => {
    const { id } = c.req.valid('param')

    try {
      const result = await db.execute(sql`
        DELETE FROM platform_payments
        WHERE id = ${id}
        RETURNING id
      `)

      if (getRows(result).length === 0) {
        return notFound(c, 'Payment')
      }

      logger.info({ paymentId: id }, '[Platform Finance] Payment deleted')
      return success(c, { id, deleted: true })
    } catch (err) {
      logger.error({ err, paymentId: id }, '[Platform Finance] DELETE /payments/:id error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// GET /costs — 支出列表（篩選 + 分頁）
// ─────────────────────────────────────────────
platformFinanceRoutes.get(
  '/costs',
  zValidator('query', costListQuerySchema),
  async (c) => {
    const { category, startDate, endDate, page, limit } = c.req.valid('query')
    const offset = (page - 1) * limit

    try {
      const conditions: ReturnType<typeof sql>[] = [sql`1=1`]

      if (category) {
        conditions.push(sql`category = ${category}`)
      }
      if (startDate) {
        conditions.push(sql`date >= ${startDate}::timestamp`)
      }
      if (endDate) {
        conditions.push(sql`date <= ${endDate}::timestamp`)
      }

      const whereClause = sql.join(conditions, sql` AND `)

      const countResult = await db.execute(sql`
        SELECT COUNT(*)::text AS total
        FROM platform_costs
        WHERE ${whereClause}
      `)
      const total = parseInt(getRows(countResult)[0]?.total as string ?? '0', 10)

      const result = await db.execute(sql`
        SELECT id, category, subcategory, amount, date, description, is_recurring, created_at
        FROM platform_costs
        WHERE ${whereClause}
        ORDER BY date DESC
        LIMIT ${limit} OFFSET ${offset}
      `)

      return successWithPagination(c, getRows(result), { page, limit, total })
    } catch (err) {
      logger.error({ err }, '[Platform Finance] GET /costs error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// POST /costs — 新增支出
// ─────────────────────────────────────────────
platformFinanceRoutes.post(
  '/costs',
  zValidator('json', createCostSchema),
  async (c) => {
    const body = c.req.valid('json')

    try {
      const id = crypto.randomUUID()

      await db.execute(sql`
        INSERT INTO platform_costs (id, category, subcategory, amount, date, description, is_recurring, created_at)
        VALUES (
          ${id},
          ${body.category},
          ${body.subcategory ?? null},
          ${body.amount},
          ${body.date}::timestamp,
          ${body.description ?? null},
          ${body.isRecurring},
          NOW()
        )
      `)

      logger.info({ costId: id, category: body.category, amount: body.amount }, '[Platform Finance] Cost created')
      return success(c, { id, created: true }, 201)
    } catch (err) {
      logger.error({ err }, '[Platform Finance] POST /costs error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// PUT /costs/:id — 修改支出
// ─────────────────────────────────────────────
platformFinanceRoutes.put(
  '/costs/:id',
  zValidator('param', uuidParamSchema),
  zValidator('json', updateCostSchema),
  async (c) => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')

    if (Object.keys(body).length === 0) {
      return badRequest(c, 'At least one field is required')
    }

    try {
      const setClauses: ReturnType<typeof sql>[] = []

      if (body.category !== undefined) {
        setClauses.push(sql`category = ${body.category}`)
      }
      if (body.subcategory !== undefined) {
        setClauses.push(sql`subcategory = ${body.subcategory}`)
      }
      if (body.amount !== undefined) {
        setClauses.push(sql`amount = ${body.amount}`)
      }
      if (body.date !== undefined) {
        setClauses.push(sql`date = ${body.date}::timestamp`)
      }
      if (body.description !== undefined) {
        setClauses.push(sql`description = ${body.description}`)
      }
      if (body.isRecurring !== undefined) {
        setClauses.push(sql`is_recurring = ${body.isRecurring}`)
      }

      const setClause = sql.join(setClauses, sql`, `)

      const result = await db.execute(sql`
        UPDATE platform_costs
        SET ${setClause}
        WHERE id = ${id}
        RETURNING id
      `)

      if (getRows(result).length === 0) {
        return notFound(c, 'Cost')
      }

      logger.info({ costId: id, fields: Object.keys(body) }, '[Platform Finance] Cost updated')
      return success(c, { id, updated: true })
    } catch (err) {
      logger.error({ err, costId: id }, '[Platform Finance] PUT /costs/:id error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// DELETE /costs/:id — 刪除支出
// ─────────────────────────────────────────────
platformFinanceRoutes.delete(
  '/costs/:id',
  zValidator('param', uuidParamSchema),
  async (c) => {
    const { id } = c.req.valid('param')

    try {
      const result = await db.execute(sql`
        DELETE FROM platform_costs
        WHERE id = ${id}
        RETURNING id
      `)

      if (getRows(result).length === 0) {
        return notFound(c, 'Cost')
      }

      logger.info({ costId: id }, '[Platform Finance] Cost deleted')
      return success(c, { id, deleted: true })
    } catch (err) {
      logger.error({ err, costId: id }, '[Platform Finance] DELETE /costs/:id error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// GET /reports/pnl — 損益表
// ─────────────────────────────────────────────
platformFinanceRoutes.get(
  '/reports/pnl',
  zValidator('query', pnlQuerySchema),
  async (c) => {
    const { period } = c.req.valid('query')

    try {
      const truncUnit = period === 'quarterly' ? 'quarter' : 'month'

      const revenueResult = await db.execute(sql`
        SELECT date_trunc(${truncUnit}, paid_at) AS period,
               SUM(amount)::text AS revenue
        FROM platform_payments
        WHERE paid_at >= NOW() - INTERVAL '12 months'
        GROUP BY period
        ORDER BY period
      `)

      const costResult = await db.execute(sql`
        SELECT date_trunc(${truncUnit}, date) AS period,
               SUM(amount)::text AS cost
        FROM platform_costs
        WHERE date >= NOW() - INTERVAL '12 months'
        GROUP BY period
        ORDER BY period
      `)

      // 合併收入與支出成損益表
      const revenueMap = new Map<string, number>()
      for (const row of getRows(revenueResult)) {
        const key = String(row.period)
        revenueMap.set(key, parseInt(row.revenue as string ?? '0', 10))
      }

      const costMap = new Map<string, number>()
      for (const row of getRows(costResult)) {
        const key = String(row.period)
        costMap.set(key, parseInt(row.cost as string ?? '0', 10))
      }

      // 取得所有期間的聯集
      const allPeriods = new Set([...revenueMap.keys(), ...costMap.keys()])
      const pnl = Array.from(allPeriods)
        .sort()
        .map((p) => {
          const revenue = revenueMap.get(p) ?? 0
          const cost = costMap.get(p) ?? 0
          return { period: p, revenue, cost, profit: revenue - cost }
        })

      return success(c, pnl)
    } catch (err) {
      logger.error({ err }, '[Platform Finance] GET /reports/pnl error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// GET /reports/mrr — 每月固定收入趨勢
// ─────────────────────────────────────────────
platformFinanceRoutes.get('/reports/mrr', async (c) => {
  try {
    const result = await db.execute(sql`
      SELECT date_trunc('month', paid_at) AS month,
             COUNT(DISTINCT tenant_id)::text AS tenant_count,
             SUM(amount)::text AS mrr
      FROM platform_payments
      WHERE paid_at >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month
    `)

    const data = getRows(result).map((row) => ({
      month: row.month,
      tenantCount: parseInt(row.tenant_count as string ?? '0', 10),
      mrr: parseInt(row.mrr as string ?? '0', 10),
    }))

    return success(c, data)
  } catch (err) {
    logger.error({ err }, '[Platform Finance] GET /reports/mrr error')
    return internalError(c, err)
  }
})

// ─────────────────────────────────────────────
// GET /reports/receivables — 應收帳款（帳齡分析）
// ─────────────────────────────────────────────
platformFinanceRoutes.get('/reports/receivables', async (c) => {
  try {
    // 取得所有非免費且活躍的租戶，含最後付款日與付款到期日
    const result = await db.execute(sql`
      SELECT t.id, t.name, t.plan, t.last_payment_at, t.payment_due_at,
             (SELECT MAX(paid_at) FROM platform_payments WHERE tenant_id = t.id) AS latest_payment
      FROM tenants t
      WHERE t.plan != 'free'
        AND t.status = 'active'
        AND t.deleted_at IS NULL
      ORDER BY t.payment_due_at ASC NULLS LAST
    `)

    const rows = getRows(result)
    const now = new Date()

    const summary = { current: 0, overdue30: 0, overdue60: 0, overdue90: 0 }
    const details: AnyRow[] = []

    for (const row of rows) {
      const dueAt = row.payment_due_at ? new Date(row.payment_due_at as string) : null

      if (!dueAt) {
        // 無到期日視為正常
        summary.current++
        details.push({ ...row, status: 'current', overdueDays: 0 })
        continue
      }

      const diffMs = now.getTime() - dueAt.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays <= 0) {
        summary.current++
        details.push({ ...row, status: 'current', overdueDays: 0 })
      } else if (diffDays <= 30) {
        summary.overdue30++
        details.push({ ...row, status: 'overdue_30', overdueDays: diffDays })
      } else if (diffDays <= 60) {
        summary.overdue60++
        details.push({ ...row, status: 'overdue_60', overdueDays: diffDays })
      } else if (diffDays <= 90) {
        summary.overdue90++
        details.push({ ...row, status: 'overdue_90', overdueDays: diffDays })
      } else {
        summary.overdue90++
        details.push({ ...row, status: 'overdue_90_plus', overdueDays: diffDays })
      }
    }

    return success(c, { summary, details })
  } catch (err) {
    logger.error({ err }, '[Platform Finance] GET /reports/receivables error')
    return internalError(c, err)
  }
})

// ─────────────────────────────────────────────
// GET /reports/export — 匯出 CSV
// ─────────────────────────────────────────────
platformFinanceRoutes.get(
  '/reports/export',
  zValidator('query', exportQuerySchema),
  async (c) => {
    const { type, startDate, endDate } = c.req.valid('query')

    try {
      let csvContent = ''

      if (type === 'payments') {
        const result = await db.execute(sql`
          SELECT p.id, t.name AS tenant_name, p.amount, p.paid_at, p.method,
                 p.invoice_no, p.period_start, p.period_end, p.notes
          FROM platform_payments p
          LEFT JOIN tenants t ON t.id = p.tenant_id
          WHERE p.paid_at >= ${startDate}::timestamp
            AND p.paid_at <= ${endDate}::timestamp
          ORDER BY p.paid_at DESC
        `)

        csvContent = 'ID,租戶名稱,金額,付款日期,付款方式,發票號碼,計費起始,計費結束,備註\n'
        for (const row of getRows(result)) {
          csvContent += [
            row.id,
            `"${String(row.tenant_name ?? '').replace(/"/g, '""')}"`,
            row.amount,
            row.paid_at,
            row.method,
            row.invoice_no ?? '',
            row.period_start ?? '',
            row.period_end ?? '',
            `"${String(row.notes ?? '').replace(/"/g, '""')}"`,
          ].join(',') + '\n'
        }
      } else {
        const result = await db.execute(sql`
          SELECT id, category, subcategory, amount, date, description, is_recurring
          FROM platform_costs
          WHERE date >= ${startDate}::timestamp
            AND date <= ${endDate}::timestamp
          ORDER BY date DESC
        `)

        csvContent = 'ID,類別,子類別,金額,日期,描述,是否固定支出\n'
        for (const row of getRows(result)) {
          csvContent += [
            row.id,
            row.category,
            row.subcategory ?? '',
            row.amount,
            row.date,
            `"${String(row.description ?? '').replace(/"/g, '""')}"`,
            row.is_recurring ? '是' : '否',
          ].join(',') + '\n'
        }
      }

      const filename = `${type}_${startDate}_${endDate}.csv`

      c.header('Content-Type', 'text/csv; charset=utf-8')
      c.header('Content-Disposition', `attachment; filename="${filename}"`)
      // 加入 BOM 讓 Excel 正確識別 UTF-8
      return c.body('\uFEFF' + csvContent)
    } catch (err) {
      logger.error({ err }, '[Platform Finance] GET /reports/export error')
      return internalError(c, err)
    }
  }
)
