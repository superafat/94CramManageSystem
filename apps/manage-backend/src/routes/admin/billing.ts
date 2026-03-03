import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { RBACVariables } from '../../middleware/rbac'
import { requirePermission, Permission } from '../../middleware/rbac'
import { uuidSchema } from '../../utils/validation'
import { generateInvoices, getInvoices, markPaid } from '../../ai/billing'
import { invoicesToMd } from '../../utils/markdown'
import { db, sql, success, badRequest, notFound, internalError, rows, wantsMd, mdResponse } from './_helpers'
import type { QueryResult } from './_helpers'

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

export { billingRoutes }
