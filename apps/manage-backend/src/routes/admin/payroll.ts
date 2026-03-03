import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { RBACVariables } from '../../middleware/rbac'
import { requireRole, Role } from '../../middleware/rbac'
import { uuidSchema } from '../../utils/validation'
import { calculatePayroll, getPayroll } from '../../ai/payroll'
import { success, internalError } from './_helpers'

const payrollRoutes = new Hono<{ Variables: RBACVariables }>()

const calculatePayrollSchema = z.object({
  branchId: uuidSchema,
  period: z.string().regex(/^\d{4}-\d{2}$/),
})

payrollRoutes.post('/payroll/calculate',
  requireRole(Role.ADMIN),
  zValidator('json', calculatePayrollSchema),
  async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')

    try {
      const result = await calculatePayroll(user.tenant_id, body.branchId, body.period)
      return success(c, result)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

payrollRoutes.get('/payroll',
  requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('query', z.object({ period: z.string().regex(/^\d{4}-\d{2}$/).optional() })),
  async (c) => {
    const user = c.get('user')
    const { period = new Date().toISOString().slice(0, 7) } = c.req.valid('query')

    try {
      const records = await getPayroll(user.tenant_id, period)
      return success(c, { records, period })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

export { payrollRoutes }
