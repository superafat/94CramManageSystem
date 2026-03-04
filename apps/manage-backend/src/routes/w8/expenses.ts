import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireRole, Role, type RBACVariables } from '../../middleware/rbac'
import {
  createExpenseSchema,
  updateExpenseSchema,
  uuidSchema,
  dateStringSchema,
  sanitizeString,
} from '../../utils/validation'
import { db, sql, logger, success, notFound, internalError, rows, first } from './_helpers'

export const expenseRoutes = new Hono<{ Variables: RBACVariables }>()

const expenseQuerySchema = z.object({
  category: z.string().max(50).optional(),
  start_date: dateStringSchema.optional(),
  end_date: dateStringSchema.optional(),
})

expenseRoutes.get('/expenses', requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('query', expenseQuerySchema),
  async (c) => {
    try {
      const query = c.req.valid('query')
      const user = c.get('user')
      const conditions = [sql`e.tenant_id = ${user?.tenant_id}`, sql`e.deleted_at IS NULL`]
      if (query.category) conditions.push(sql`e.category = ${query.category}`)
      if (query.start_date) conditions.push(sql`e.expense_date >= ${query.start_date}::date`)
      if (query.end_date) conditions.push(sql`e.expense_date <= ${query.end_date}::date`)
      const where = sql.join(conditions, sql` AND `)

      const result = await db.execute(sql`
        SELECT e.*, u.name as created_by_name
        FROM manage_expenses e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE ${where}
        ORDER BY e.expense_date DESC
      `)
      return success(c, { expenses: rows(result) })
    } catch (error) {
      logger.error({ err: error }, 'Error fetching expenses:')
      return internalError(c, error)
    }
  }
)

expenseRoutes.get('/expenses/categories', requireRole(Role.ADMIN, Role.MANAGER),
  async (c) => {
    try {
      const user = c.get('user')
      const result = await db.execute(sql`
        SELECT DISTINCT category FROM manage_expenses
        WHERE tenant_id = ${user?.tenant_id} AND deleted_at IS NULL
        ORDER BY category
      `)
      return success(c, { categories: rows(result).map((r) => r.category) })
    } catch (error) {
      logger.error({ err: error }, 'Error fetching expense categories:')
      return internalError(c, error)
    }
  }
)

expenseRoutes.post('/expenses', requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('json', createExpenseSchema),
  async (c) => {
    try {
      const body = c.req.valid('json')
      const user = c.get('user')

      const result = await db.execute(sql`
        INSERT INTO manage_expenses (tenant_id, branch_id, name, amount, category, expense_date, notes, created_by)
        VALUES (${user?.tenant_id}, ${body.branchId || (user as Record<string, unknown>)?.branch_id || null},
                ${sanitizeString(body.name)}, ${body.amount}, ${sanitizeString(body.category)},
                ${body.expenseDate}::date, ${body.notes ? sanitizeString(body.notes) : null},
                ${user?.id || null})
        RETURNING *
      `)
      return success(c, { expense: first(result) }, 201)
    } catch (error) {
      logger.error({ err: error }, 'Error creating expense:')
      return internalError(c, error)
    }
  }
)

expenseRoutes.put('/expenses/:id', requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('param', z.object({ id: uuidSchema })),
  zValidator('json', updateExpenseSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param')
      const body = c.req.valid('json')

      const result = await db.execute(sql`
        UPDATE manage_expenses
        SET name = COALESCE(${body.name != null ? sanitizeString(body.name) : null}, name),
            amount = COALESCE(${body.amount ?? null}, amount),
            category = COALESCE(${body.category != null ? sanitizeString(body.category) : null}, category),
            expense_date = COALESCE(${body.expenseDate ? sql`${body.expenseDate}::date` : null}, expense_date),
            notes = COALESCE(${body.notes != null ? sanitizeString(body.notes) : null}, notes)
        WHERE id = ${id} AND deleted_at IS NULL
        RETURNING *
      `)
      const expense = first(result)
      if (!expense) return notFound(c, 'Expense')
      return success(c, { expense })
    } catch (error) {
      logger.error({ err: error }, 'Error updating expense:')
      return internalError(c, error)
    }
  }
)

expenseRoutes.delete('/expenses/:id', requireRole(Role.ADMIN),
  zValidator('param', z.object({ id: uuidSchema })),
  async (c) => {
    try {
      const { id } = c.req.valid('param')
      const result = await db.execute(sql`
        UPDATE manage_expenses SET deleted_at = NOW()
        WHERE id = ${id} AND deleted_at IS NULL
        RETURNING *
      `)
      const expense = first(result)
      if (!expense) return notFound(c, 'Expense')
      return success(c, { message: 'Deleted', expense })
    } catch (error) {
      logger.error({ err: error }, 'Error deleting expense:')
      return internalError(c, error)
    }
  }
)
