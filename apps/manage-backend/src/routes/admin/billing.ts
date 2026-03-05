import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { eq, and, inArray, isNull } from 'drizzle-orm'
import { manageDaycarePackages, managePriceMemory, inclassSchedules } from '@94cram/shared'
import type { RBACVariables } from '../../middleware/rbac'
import { requirePermission, Permission } from '../../middleware/rbac'
import { uuidSchema } from '../../utils/validation'
import { generateInvoices, getInvoices, markPaid } from '../../ai/billing'
import { invoicesToMd } from '../../utils/markdown'
import { db, sql, success, badRequest, notFound, internalError, rows, wantsMd, mdResponse } from './_helpers'
import type { QueryResult } from './_helpers'
import { notifyBillingPaid, notifyBillingCreated } from '../../services/notify-helper'

const billingRoutes = new Hono<{ Variables: RBACVariables }>()

const billingQuerySchema = z.object({
  parentId: uuidSchema.optional(),
  branchId: uuidSchema.optional(),
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
})

billingRoutes.get('/billing',
  requirePermission(Permission.BILLING_READ),
  zValidator('query', billingQuerySchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const query = c.req.valid('query')
    const period = query.period ?? new Date().toISOString().slice(0, 7)

    try {
      // If parentId, get billing for parent's children
      if (query.parentId) {
        const students = await db.execute(sql`
          SELECT s.id, s.full_name
          FROM students s
          JOIN parent_students ps ON ps.student_id = s.id
          WHERE ps.parent_id = ${query.parentId} AND s.tenant_id = ${tenantId} AND s.deleted_at IS NULL
        `)

        const result = []
        for (const s of rows(students)) {
          const fees = await db.execute(sql`
            SELECT p.id, p.description as item, p.amount, p.due_date,
              p.status as paid, p.paid_amount,
              (p.amount - COALESCE(p.paid_amount, 0)) as remaining
            FROM payments p
            WHERE p.student_id = ${s.id} AND p.tenant_id = ${tenantId}
            ORDER BY p.due_date DESC
          `)
          const feeList = rows(fees)
          const totalDue = feeList.reduce((sum: number, f: QueryResult) => sum + Number(f.amount || 0), 0)
          const totalPaid = feeList.reduce((sum: number, f: QueryResult) => sum + Number(f.paid_amount || 0), 0)
          result.push({
            studentId: s.id,
            name: s.full_name,
            fees: feeList,
            totalDue,
            totalPaid,
            totalRemaining: totalDue - totalPaid,
          })
        }
        return success(c, { billing: result })
      }

      // Otherwise, branch-level billing
      if (query.branchId) {
        const invoices = await getInvoices(tenantId, query.branchId, period)
        if (wantsMd(c)) return mdResponse(c, invoicesToMd(invoices as any[], period))
        return success(c, { invoices, period })
      }

      return badRequest(c, 'Provide parentId or branchId')
    } catch (err) {
      return internalError(c, err)
    }
  }
)

const generateInvoicesSchema = z.object({
  branchId: uuidSchema,
  period: z.string().regex(/^\d{4}-\d{2}$/),
})

billingRoutes.post('/billing/generate',
  requirePermission(Permission.BILLING_WRITE),
  zValidator('json', generateInvoicesSchema),
  async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')

    try {
      const result = await generateInvoices(user.tenant_id, body.branchId, body.period)
      return success(c, result, 201)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

billingRoutes.get('/billing/:branchId',
  requirePermission(Permission.BILLING_READ),
  zValidator('param', z.object({ branchId: uuidSchema })),
  zValidator('query', z.object({ period: z.string().regex(/^\d{4}-\d{2}$/).optional() })),
  async (c) => {
    const user = c.get('user')
    const { branchId } = c.req.valid('param')
    const { period = new Date().toISOString().slice(0, 7) } = c.req.valid('query')

    try {
      const invoices = await getInvoices(user.tenant_id, branchId, period)
      if (wantsMd(c)) return mdResponse(c, invoicesToMd(invoices as any[], period))
      return success(c, { invoices, period })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

const markPaidSchema = z.object({
  method: z.string().max(20).optional(),
  ref: z.string().max(50).optional(),
})

billingRoutes.post('/billing/:invoiceId/pay',
  requirePermission(Permission.BILLING_WRITE),
  zValidator('param', z.object({ invoiceId: uuidSchema })),
  zValidator('json', markPaidSchema),
  async (c) => {
    const { invoiceId } = c.req.valid('param')
    const body = c.req.valid('json')

    try {
      await markPaid(invoiceId, body.method ?? 'cash', body.ref)
      return success(c, { paid: true })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// Get course fee settings
billingRoutes.get('/courses/:id/fees', requirePermission(Permission.SCHEDULE_READ), async (c) => {
  const user = c.get('user')
  const courseId = c.req.param('id')

  try {
    const [result] = await db.execute(sql`
      SELECT id, name, fee_monthly, fee_quarterly, fee_semester, fee_yearly
      FROM courses
      WHERE id = ${courseId} AND tenant_id = ${user.tenant_id}
    `) as any[]

    if (!result) return notFound(c, 'Course not found')
    return success(c, { course: result })
  } catch (err) {
    return internalError(c, err)
  }
})

// Update course fee settings
billingRoutes.put('/courses/:id/fees',
  requirePermission(Permission.SCHEDULE_WRITE),
  zValidator('param', z.object({ id: uuidSchema })),
  zValidator('json', z.object({
    feeMonthly: z.number().nonnegative().optional(),
    feeQuarterly: z.number().nonnegative().optional(),
    feeSemester: z.number().nonnegative().optional(),
    feeYearly: z.number().nonnegative().optional(),
  })),
  async (c) => {
    const user = c.get('user')
    const { id: courseId } = c.req.valid('param')
    const body = c.req.valid('json')

    try {
      await db.execute(sql`
        UPDATE courses SET
          fee_monthly = ${body.feeMonthly},
          fee_quarterly = ${body.feeQuarterly},
          fee_semester = ${body.feeSemester},
          fee_yearly = ${body.feeYearly},
          updated_at = NOW()
        WHERE id = ${courseId} AND tenant_id = ${user.tenant_id}
      `)
      return success(c, { message: 'Fees updated' })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// Get billing data for a course (students + payment status)
billingRoutes.get('/billing/course/:courseId',
  requirePermission(Permission.BILLING_READ),
  zValidator('param', z.object({ courseId: uuidSchema })),
  zValidator('query', z.object({
    periodMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  })),
  async (c) => {
    const user = c.get('user')
    const { courseId } = c.req.valid('param')
    const periodMonth = c.req.valid('query').periodMonth || new Date().toISOString().substring(0, 7)

    try {
      // Get course info with fees
      const [course] = await db.execute(sql`
        SELECT id, name, fee_monthly, fee_quarterly, fee_semester, fee_yearly
        FROM courses WHERE id = ${courseId} AND tenant_id = ${user.tenant_id}
      `) as any[]

      if (!course) return notFound(c, 'Course not found')

      // Get students in this course with payment records
      const studentRows = await db.execute(sql`
        SELECT
          s.id, s.full_name, s.grade_level,
          pr.id as payment_id, pr.amount as paid_amount, pr.payment_type, pr.payment_date
        FROM students s
        LEFT JOIN course_enrollments ce ON ce.student_id = s.id AND ce.course_id = ${courseId} AND ce.status = 'active'
        LEFT JOIN payment_records pr ON pr.student_id = s.id
          AND pr.course_id = ${courseId}
          AND pr.period_month = ${periodMonth}
          AND pr.status = 'paid'
        WHERE s.tenant_id = ${user.tenant_id} AND s.deleted_at IS NULL
          AND ce.student_id IS NOT NULL
        ORDER BY s.full_name
      `)

      const students = rows(studentRows)
      const total = students.length
      const paid = students.filter((s: QueryResult) => s.payment_id).length

      return success(c, {
        course,
        periodMonth,
        students,
        stats: {
          total,
          paid,
          unpaid: total - paid,
        },
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// Batch create payment records
billingRoutes.post('/billing/payment-records/batch',
  requirePermission(Permission.BILLING_WRITE),
  zValidator('json', z.object({
    records: z.array(z.object({
      studentId: uuidSchema,
      courseId: uuidSchema,
      paymentType: z.string().min(1),
      amount: z.number().positive(),
      periodMonth: z.string().regex(/^\d{4}-\d{2}$/),
      paymentDate: z.string().optional(),
      notes: z.string().optional(),
    })).min(1),
  })),
  async (c) => {
    const user = c.get('user')
    const { records } = c.req.valid('json')

    try {
      for (const rec of records) {
        await db.execute(sql`
          INSERT INTO payment_records (
            tenant_id, student_id, course_id, payment_type, amount,
            payment_date, period_month, status, notes, created_by, created_at
          ) VALUES (
            ${user.tenant_id}, ${rec.studentId}, ${rec.courseId}, ${rec.paymentType},
            ${rec.amount}, ${rec.paymentDate || new Date().toISOString().split('T')[0]},
            ${rec.periodMonth}, 'paid', ${rec.notes || null}, ${user.id}, NOW()
          )
        `)
      }

      // Fire-and-forget: notify parents about payment
      for (const rec of records) {
        void (async () => {
          try {
            const [info] = await db.execute(sql`
              SELECT s.full_name, c.name as course_name
              FROM students s LEFT JOIN courses c ON c.id = ${rec.courseId}
              WHERE s.id = ${rec.studentId} LIMIT 1
            `) as any[]
            if (info) {
              await notifyBillingPaid(user.tenant_id, rec.studentId, info.full_name || '', info.course_name || '', rec.amount)
            }
          } catch { /* fire-and-forget */ }
        })()
      }

      return success(c, { created: records.length })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// Get all payment records with filters
billingRoutes.get('/billing/payment-records', requirePermission(Permission.BILLING_READ), async (c) => {
  const user = c.get('user')
  const courseId = c.req.query('courseId')
  const periodMonth = c.req.query('periodMonth')
  const studentId = c.req.query('studentId')

  try {
    const conditions = [sql`pr.tenant_id = ${user.tenant_id}`]
    if (courseId) conditions.push(sql`pr.course_id = ${courseId}`)
    if (periodMonth) conditions.push(sql`pr.period_month = ${periodMonth}`)
    if (studentId) conditions.push(sql`pr.student_id = ${studentId}`)

    const where = sql.join(conditions, sql` AND `)

    const rowsData = await db.execute(sql`
      SELECT pr.*, s.full_name as student_name, c.name as course_name
      FROM payment_records pr
      LEFT JOIN students s ON pr.student_id = s.id
      LEFT JOIN courses c ON pr.course_id = c.id
      WHERE ${where}
      ORDER BY pr.created_at DESC
      LIMIT 100
    `)

    return success(c, { records: rows(rowsData) })
  } catch (err) {
    return internalError(c, err)
  }
})

// ==================== 安親套餐 CRUD ====================

const daycarePackageBodySchema = z.object({
  branchId: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  services: z.array(z.string()).min(1),
  price: z.number().positive(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

// GET /billing/daycare-packages — 列出套餐
billingRoutes.get('/billing/daycare-packages',
  requirePermission(Permission.BILLING_READ),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const branchId = c.req.query('branchId')

    try {
      const conditions = [
        eq(manageDaycarePackages.tenantId, tenantId),
        eq(manageDaycarePackages.isActive, true),
      ]
      if (branchId) {
        conditions.push(eq(manageDaycarePackages.branchId, branchId))
      }

      const packages = await db
        .select()
        .from(manageDaycarePackages)
        .where(and(...conditions))

      return success(c, { packages })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// POST /billing/daycare-packages — 新增套餐
billingRoutes.post('/billing/daycare-packages',
  requirePermission(Permission.BILLING_WRITE),
  zValidator('json', daycarePackageBodySchema),
  async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')

    try {
      const [created] = await db
        .insert(manageDaycarePackages)
        .values({
          tenantId: user.tenant_id,
          branchId: body.branchId ?? null,
          name: body.name,
          services: body.services,
          price: String(body.price),
          description: body.description ?? null,
          isActive: body.isActive ?? true,
        })
        .returning()

      return success(c, { package: created }, 201)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// PUT /billing/daycare-packages/:id — 更新套餐
billingRoutes.put('/billing/daycare-packages/:id',
  requirePermission(Permission.BILLING_WRITE),
  zValidator('param', z.object({ id: uuidSchema })),
  zValidator('json', daycarePackageBodySchema.partial()),
  async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')

    try {
      // 建構更新物件，只包含有值的欄位
      const updateData: Record<string, unknown> = {}
      if (body.branchId !== undefined) updateData.branchId = body.branchId
      if (body.name !== undefined) updateData.name = body.name
      if (body.services !== undefined) updateData.services = body.services
      if (body.price !== undefined) updateData.price = String(body.price)
      if (body.description !== undefined) updateData.description = body.description
      if (body.isActive !== undefined) updateData.isActive = body.isActive

      if (Object.keys(updateData).length === 0) {
        return badRequest(c, 'No fields to update')
      }

      const [updated] = await db
        .update(manageDaycarePackages)
        .set(updateData)
        .where(
          and(
            eq(manageDaycarePackages.id, id),
            eq(manageDaycarePackages.tenantId, user.tenant_id),
          )
        )
        .returning()

      if (!updated) return notFound(c, 'Package not found')
      return success(c, { package: updated })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// DELETE /billing/daycare-packages/:id — 軟刪除（isActive=false）
billingRoutes.delete('/billing/daycare-packages/:id',
  requirePermission(Permission.BILLING_WRITE),
  zValidator('param', z.object({ id: uuidSchema })),
  async (c) => {
    const user = c.get('user')
    const { id } = c.req.valid('param')

    try {
      const [deleted] = await db
        .update(manageDaycarePackages)
        .set({ isActive: false })
        .where(
          and(
            eq(manageDaycarePackages.id, id),
            eq(manageDaycarePackages.tenantId, user.tenant_id),
          )
        )
        .returning()

      if (!deleted) return notFound(c, 'Package not found')
      return success(c, { deleted: true })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ==================== 價格記憶 ====================

// GET /billing/price-memory — 批量查詢價格記憶
billingRoutes.get('/billing/price-memory',
  requirePermission(Permission.BILLING_READ),
  zValidator('query', z.object({
    courseId: z.string().min(1),
    studentIds: z.string().optional(),
  })),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const { courseId, studentIds } = c.req.valid('query')

    try {
      const conditions = [
        eq(managePriceMemory.tenantId, tenantId),
        eq(managePriceMemory.courseId, courseId),
      ]

      if (studentIds) {
        const ids = studentIds.split(',').map((s) => s.trim()).filter(Boolean)
        if (ids.length > 0) {
          conditions.push(inArray(managePriceMemory.studentId, ids))
        }
      }

      const records = await db
        .select()
        .from(managePriceMemory)
        .where(and(...conditions))

      return success(c, { data: records })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// PUT /billing/price-memory — 批量更新/建立價格記憶（UPSERT）
const priceMemoryBatchSchema = z.object({
  records: z.array(z.object({
    courseId: z.string().min(1),
    studentId: z.string().min(1),
    amount: z.number().positive(),
    paymentType: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })).min(1),
})

billingRoutes.put('/billing/price-memory',
  requirePermission(Permission.BILLING_WRITE),
  zValidator('json', priceMemoryBatchSchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const { records } = c.req.valid('json')

    try {
      const results = []

      for (const rec of records) {
        const [upserted] = await db
          .insert(managePriceMemory)
          .values({
            tenantId,
            courseId: rec.courseId,
            studentId: rec.studentId,
            amount: String(rec.amount),
            paymentType: rec.paymentType ?? null,
            metadata: rec.metadata ?? null,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [managePriceMemory.tenantId, managePriceMemory.courseId, managePriceMemory.studentId],
            set: {
              amount: String(rec.amount),
              paymentType: rec.paymentType ?? null,
              metadata: rec.metadata ?? null,
              updatedAt: new Date(),
            },
          })
          .returning()

        results.push(upserted)
      }

      return success(c, { data: results })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ==================== 堂數計算 ====================

/**
 * 根據 dayOfWeek 展開指定月份內所有實際排課日期
 */
function expandScheduleDates(year: number, month: number, dayOfWeek: number): string[] {
  const dates: string[] = []
  // month 是 1-based，Date constructor 的 month 是 0-based
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0) // 該月最後一天

  // 找到該月第一個符合 dayOfWeek 的日期
  let current = new Date(firstDay)
  const currentDow = current.getDay() // 0=Sunday
  let diff = dayOfWeek - currentDow
  if (diff < 0) diff += 7
  current.setDate(current.getDate() + diff)

  while (current <= lastDay) {
    const y = current.getFullYear()
    const m = String(current.getMonth() + 1).padStart(2, '0')
    const d = String(current.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    current.setDate(current.getDate() + 7)
  }

  return dates
}

const sessionCountQuerySchema = z.object({
  courseId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
})

// GET /billing/session-count — 查詢指定課程在指定月份的實際排課堂數
billingRoutes.get('/billing/session-count',
  requirePermission(Permission.BILLING_READ),
  zValidator('query', sessionCountQuerySchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const { courseId, month } = c.req.valid('query')

    try {
      // 從 inclassSchedules 查出該課程的所有排課規則（未刪除的）
      const schedules = await db
        .select()
        .from(inclassSchedules)
        .where(
          and(
            eq(inclassSchedules.tenantId, tenantId),
            eq(inclassSchedules.courseId, courseId),
            isNull(inclassSchedules.deletedAt),
          )
        )

      // 解析 YYYY-MM
      const [yearStr, monthStr] = month.split('-')
      const year = parseInt(yearStr, 10)
      const mon = parseInt(monthStr, 10)

      // 展開每條排課規則為實際日期
      const sessions: { date: string; startTime: string; endTime: string; status: string }[] = []

      for (const sched of schedules) {
        const dates = expandScheduleDates(year, mon, sched.dayOfWeek)
        for (const date of dates) {
          sessions.push({
            date,
            startTime: sched.startTime,
            endTime: sched.endTime,
            status: 'scheduled',
          })
        }
      }

      // 按日期 + 開始時間排序
      sessions.sort((a, b) => {
        const cmp = a.date.localeCompare(b.date)
        return cmp !== 0 ? cmp : a.startTime.localeCompare(b.startTime)
      })

      return success(c, {
        courseId,
        month,
        sessionCount: sessions.length,
        sessions,
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

export { billingRoutes }
