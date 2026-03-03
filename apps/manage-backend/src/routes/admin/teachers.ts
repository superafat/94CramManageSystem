import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { RBACVariables } from '../../middleware/rbac'
import { requirePermission, requireRole, Role, Permission } from '../../middleware/rbac'
import { db, sql, success, internalError, rows, first } from './_helpers'

const teachersRoutes = new Hono<{ Variables: RBACVariables }>()

teachersRoutes.get('/teachers', requirePermission(Permission.SCHEDULE_READ), async (c) => {
  const user = c.get('user')

  try {
    const teacherRows = await db.execute(sql`
      SELECT id, name, phone, school, department, specialty, is_local,
        available_slots, hourly_rates, status, created_at
      FROM teachers
      WHERE tenant_id = ${user.tenant_id} AND deleted_at IS NULL
      ORDER BY name
    `)
    return success(c, { teachers: rows(teacherRows) })
  } catch (err) {
    return internalError(c, err)
  }
})

const createTeacherSchema = z.object({
  name: z.string().min(1).max(50),
  phone: z.string().max(20).optional(),
  school: z.string().max(50).optional(),
  department: z.string().max(50).optional(),
  specialty: z.enum(['both', 'tutoring', 'private']).default('both'),
  isLocal: z.boolean().default(false),
  availableSlots: z.record(z.string(), z.any()).default({}),
  hourlyRates: z.object({
    tutoring: z.number().optional(),
    private: z.number().optional(),
    assistant: z.number().optional(),
  }).default({ tutoring: 250, private: 350, assistant: 88 }),
})

teachersRoutes.post('/teachers',
  requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('json', createTeacherSchema),
  async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')

    try {
      const result = await db.execute(sql`
        INSERT INTO teachers (tenant_id, name, phone, school, department, specialty, is_local, available_slots, hourly_rates)
        VALUES (${user.tenant_id}, ${body.name}, ${body.phone ?? null}, ${body.school ?? null},
          ${body.department ?? null}, ${body.specialty}, ${body.isLocal},
          ${JSON.stringify(body.availableSlots)}::jsonb,
          ${JSON.stringify(body.hourlyRates)}::jsonb)
        RETURNING id
      `)
      return success(c, { id: first(result)?.id }, 201)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

const leadsQuerySchema = z.object({
  status: z.string().max(20).optional(),
})

teachersRoutes.get('/leads',
  requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('query', leadsQuerySchema),
  async (c) => {
    const user = c.get('user')
    const { status } = c.req.valid('query')

    try {
      const conditions = [sql`tenant_id = ${user.tenant_id}`]
      if (status) conditions.push(sql`status = ${status}`)
      const where = sql.join(conditions, sql` AND `)

      const leadRows = await db.execute(sql`
        SELECT * FROM leads WHERE ${where} ORDER BY created_at DESC
      `)
      return success(c, { leads: rows(leadRows) })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

teachersRoutes.get('/leads/overdue', requireRole(Role.ADMIN, Role.MANAGER), async (c) => {
  const user = c.get('user')

  try {
    const leadRows = await db.execute(sql`
      SELECT * FROM leads
      WHERE tenant_id = ${user.tenant_id}
        AND status IN ('inquiry', 'scheduled')
        AND (next_follow_up IS NULL OR next_follow_up <= CURRENT_DATE)
        AND created_at <= NOW() - INTERVAL '3 days'
      ORDER BY created_at ASC
    `)
    return success(c, { overdue: rows(leadRows), count: rows(leadRows).length })
  } catch (err) {
    return internalError(c, err)
  }
})

export { teachersRoutes }
