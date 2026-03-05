import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireRole, Role, type RBACVariables } from '../../middleware/rbac'
import {
  salaryCalculateSchema,
  createSalaryRecordSchema,
  createSalaryAdjustmentSchema,
  uuidSchema,
  dateStringSchema,
  sanitizeString,
} from '../../utils/validation'
import { db, sql, logger, success, notFound, badRequest, internalError, conflict, rows, first } from './_helpers'
import { notifySalaryPaid } from '../../services/notify-helper'

export const salaryRoutes = new Hono<{ Variables: RBACVariables }>()

// GET /api/w8/salary/calculate - 計算薪資預覽
salaryRoutes.get('/salary/calculate', requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('query', salaryCalculateSchema),
  async (c) => {
    try {
      const query = c.req.valid('query')

      const conditions = [
        sql`s.scheduled_date >= ${query.startDate}::date`,
        sql`s.scheduled_date <= ${query.endDate}::date`,
        sql`s.status IN ('scheduled', 'completed')`,
      ]
      if (query.teacherId) {
        conditions.push(sql`t.id = ${query.teacherId}`)
      }

      const where = sql.join(conditions, sql` AND `)

      const result = await db.execute(sql`
        SELECT
          t.id as teacher_id,
          t.name as teacher_name,
          t.title,
          t.teacher_role,
          t.salary_type,
          t.rate_per_class,
          t.base_salary,
          t.hourly_rate,
          COUNT(s.id)::int as total_classes,
          (COUNT(s.id) * COALESCE(t.rate_per_class, 0))::numeric as class_amount,
          COALESCE(
            SUM(EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600 * COALESCE(t.hourly_rate, 0)),
            0
          )::numeric as hourly_amount
        FROM teachers t
        LEFT JOIN schedules s ON t.id = s.teacher_id AND ${where}
        LEFT JOIN courses c ON s.course_id = c.id
        WHERE t.deleted_at IS NULL
        GROUP BY t.id, t.name, t.title, t.teacher_role, t.salary_type, t.rate_per_class, t.base_salary, t.hourly_rate
        ORDER BY t.name
      `)

      // 查詢薪資調整（獎金/扣薪）
      const user = c.get('user')
      const adjResult = await db.execute(sql`
        SELECT id, teacher_id, type, name, amount, notes
        FROM manage_salary_adjustments
        WHERE tenant_id = ${user?.tenant_id}
          AND period_start >= ${query.startDate}::date
          AND period_end <= ${query.endDate}::date
          AND deleted_at IS NULL
      `)
      const adjustments = rows(adjResult)

      const teachers = rows(result).map((t) => {
        const salaryType = String(t.salary_type || 'per_class')
        let baseAmount = 0
        if (salaryType === 'monthly') {
          baseAmount = parseFloat(String(t.base_salary || 0))
        } else if (salaryType === 'hourly') {
          baseAmount = parseFloat(String(t.hourly_amount || 0))
        } else {
          baseAmount = parseFloat(String(t.class_amount || 0))
        }

        // 加上獎金、扣除扣薪
        const teacherAdj = adjustments.filter((a) => a.teacher_id === t.teacher_id)
        const bonusTotal = teacherAdj.filter((a) => a.type === 'bonus').reduce((s, a) => s + parseFloat(String(a.amount || 0)), 0)
        const deductionTotal = teacherAdj.filter((a) => a.type === 'deduction').reduce((s, a) => s + parseFloat(String(a.amount || 0)), 0)
        const totalAmount = baseAmount + bonusTotal - deductionTotal

        return {
          ...t,
          salary_type: salaryType,
          total_classes: Number(t.total_classes) || 0,
          base_amount: baseAmount,
          bonus_total: bonusTotal,
          deduction_total: deductionTotal,
          total_amount: totalAmount,
          adjustments: teacherAdj,
        }
      })

      return success(c, {
        period: { start: query.startDate, end: query.endDate },
        teachers,
        grandTotalClasses: teachers.reduce((sum: number, r) => sum + (Number(r.total_classes) || 0), 0),
        grandTotalAmount: teachers.reduce((sum: number, r) => sum + (r.total_amount || 0), 0),
      })
    } catch (error) {
      logger.error({ err: error }, 'Error calculating salary:')
      return internalError(c, error)
    }
  }
)

// POST /api/w8/salary/records - 建立薪資結算紀錄
salaryRoutes.post('/salary/records', requireRole(Role.ADMIN), zValidator('json', createSalaryRecordSchema), async (c) => {
  try {
    const body = c.req.valid('json')

    // Check existing
    const existingResult = await db.execute(sql`
      SELECT id FROM salary_records
      WHERE teacher_id = ${body.teacherId}
        AND period_start = ${body.periodStart}::date
        AND period_end = ${body.periodEnd}::date
    `)

    if (rows(existingResult).length > 0) {
      return conflict(c, 'Salary record already exists for this period')
    }

    // Calculate
    const calcResult = await db.execute(sql`
      SELECT
        t.rate_per_class,
        COUNT(s.id)::int as total_classes
      FROM teachers t
      LEFT JOIN schedules s ON t.id = s.teacher_id
        AND s.scheduled_date >= ${body.periodStart}::date
        AND s.scheduled_date <= ${body.periodEnd}::date
        AND s.status IN ('scheduled', 'completed')
      WHERE t.id = ${body.teacherId}
      GROUP BY t.id, t.rate_per_class
    `)

    const calc = first(calcResult)
    if (!calc) {
      return notFound(c, 'Teacher')
    }

    const totalAmount = parseFloat(String(calc.rate_per_class)) * Number(calc.total_classes)

    const insertResult = await db.execute(sql`
      INSERT INTO salary_records (teacher_id, period_start, period_end, total_classes, rate_per_class, total_amount)
      VALUES (${body.teacherId}, ${body.periodStart}::date, ${body.periodEnd}::date,
              ${calc.total_classes}, ${calc.rate_per_class}, ${totalAmount})
      RETURNING *
    `)

    return success(c, { record: first(insertResult) }, 201)
  } catch (error) {
    logger.error({ err: error }, 'Error creating salary record:')
    return internalError(c, error)
  }
})

// GET /api/w8/salary/records - 列出薪資紀錄
const salaryRecordsQuerySchema = z.object({
  teacher_id: uuidSchema.optional(),
  status: z.enum(['pending', 'confirmed', 'paid']).optional(),
})

salaryRoutes.get('/salary/records', requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('query', salaryRecordsQuerySchema),
  async (c) => {
    try {
      const query = c.req.valid('query')

      const conditions = [sql`1=1`]
      if (query.teacher_id) conditions.push(sql`sr.teacher_id = ${query.teacher_id}`)
      if (query.status) conditions.push(sql`sr.status = ${query.status}`)

      const where = sql.join(conditions, sql` AND `)

      const result = await db.execute(sql`
        SELECT sr.*, t.name as teacher_name, t.title
        FROM salary_records sr
        JOIN teachers t ON sr.teacher_id = t.id
        WHERE ${where}
        ORDER BY sr.period_start DESC, t.name
      `)

      return success(c, { records: rows(result) })
    } catch (error) {
      logger.error({ err: error }, 'Error fetching salary records:')
      return internalError(c, error)
    }
  }
)

// PUT /api/w8/salary/records/:id/confirm
salaryRoutes.put('/salary/records/:id/confirm', requireRole(Role.ADMIN),
  zValidator('param', z.object({ id: uuidSchema })),
  async (c) => {
    try {
      const { id } = c.req.valid('param')

      const result = await db.execute(sql`
        UPDATE salary_records
        SET status = 'confirmed', confirmed_at = NOW()
        WHERE id = ${id} AND status = 'pending'
        RETURNING *
      `)

      const record = first(result)
      if (!record) {
        return badRequest(c, 'Record not found or already confirmed')
      }

      return success(c, { record })
    } catch (error) {
      logger.error({ err: error }, 'Error confirming salary:')
      return internalError(c, error)
    }
  }
)

// PUT /api/w8/salary/records/:id/pay
salaryRoutes.put('/salary/records/:id/pay', requireRole(Role.ADMIN),
  zValidator('param', z.object({ id: uuidSchema })),
  async (c) => {
    try {
      const { id } = c.req.valid('param')

      const result = await db.execute(sql`
        UPDATE salary_records
        SET status = 'paid', paid_at = NOW()
        WHERE id = ${id} AND status = 'confirmed'
        RETURNING *
      `)

      const record = first(result)
      if (!record) {
        return badRequest(c, 'Record not found or not confirmed yet')
      }

      // Notify teacher via Telegram
      if (record) {
        const teacherResult = await db.execute(sql`
          SELECT t.id as teacher_id, t.full_name, t.tenant_id
          FROM manage_teachers t
          JOIN salary_records sr ON sr.teacher_id = t.id
          WHERE sr.id = ${id}
          LIMIT 1
        `)
        const teacher = first(teacherResult)
        if (teacher) {
          const period = record.period_start && record.period_end
            ? `${String(record.period_start).slice(0, 7)}`
            : ''
          void notifySalaryPaid(
            String(teacher.tenant_id),
            String(teacher.teacher_id),
            String(teacher.full_name),
            period,
            Number(record.total_amount || 0)
          )
        }
      }

      return success(c, { record })
    } catch (error) {
      logger.error({ err: error }, 'Error marking salary as paid:')
      return internalError(c, error)
    }
  }
)

// ========================================================================
// SALARY ADJUSTMENTS (獎金/扣薪)
// ========================================================================

const adjQuerySchema = z.object({
  teacher_id: uuidSchema.optional(),
  period_start: dateStringSchema.optional(),
  period_end: dateStringSchema.optional(),
})

salaryRoutes.get('/salary/adjustments', requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('query', adjQuerySchema),
  async (c) => {
    try {
      const query = c.req.valid('query')
      const user = c.get('user')
      const conditions = [sql`sa.tenant_id = ${user?.tenant_id}`]
      if (query.teacher_id) conditions.push(sql`sa.teacher_id = ${query.teacher_id}`)
      if (query.period_start) conditions.push(sql`sa.period_start >= ${query.period_start}::date`)
      if (query.period_end) conditions.push(sql`sa.period_end <= ${query.period_end}::date`)
      const where = sql.join(conditions, sql` AND `)

      const result = await db.execute(sql`
        SELECT sa.*, t.name as teacher_name
        FROM manage_salary_adjustments sa
        JOIN teachers t ON sa.teacher_id = t.id
        WHERE ${where}
        ORDER BY sa.created_at DESC
      `)
      return success(c, { adjustments: rows(result) })
    } catch (error) {
      logger.error({ err: error }, 'Error fetching salary adjustments:')
      return internalError(c, error)
    }
  }
)

salaryRoutes.post('/salary/adjustments', requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('json', createSalaryAdjustmentSchema),
  async (c) => {
    try {
      const body = c.req.valid('json')
      const user = c.get('user')

      const result = await db.execute(sql`
        INSERT INTO manage_salary_adjustments (tenant_id, teacher_id, period_start, period_end, type, name, amount, notes, created_by)
        VALUES (${user?.tenant_id}, ${body.teacherId}, ${body.periodStart}::date, ${body.periodEnd}::date,
                ${body.type}, ${sanitizeString(body.name)}, ${body.amount},
                ${body.notes ? sanitizeString(body.notes) : null}, ${user?.id || null})
        RETURNING *
      `)
      return success(c, { adjustment: first(result) }, 201)
    } catch (error) {
      logger.error({ err: error }, 'Error creating salary adjustment:')
      return internalError(c, error)
    }
  }
)

salaryRoutes.delete('/salary/adjustments/:id', requireRole(Role.ADMIN),
  zValidator('param', z.object({ id: uuidSchema })),
  async (c) => {
    try {
      const { id } = c.req.valid('param')
      const user = c.get('user')
      const result = await db.execute(sql`
        DELETE FROM manage_salary_adjustments WHERE id = ${id} AND tenant_id = ${user?.tenant_id} RETURNING *
      `)
      const adj = first(result)
      if (!adj) return notFound(c, 'Salary adjustment')
      return success(c, { message: 'Deleted', adjustment: adj })
    } catch (error) {
      logger.error({ err: error }, 'Error deleting salary adjustment:')
      return internalError(c, error)
    }
  }
)
