import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { RBACVariables } from '../../middleware/rbac'
import { requirePermission, Permission } from '../../middleware/rbac'
import { uuidSchema } from '../../utils/validation'
import { checkConflicts, createTimeSlot, getWeeklySchedule } from '../../ai/scheduling'
import { scheduleToMd } from '../../utils/markdown'
import { success, badRequest, internalError, wantsMd, mdResponse, getUserBranchId, rows } from './_helpers'

const schedulingRoutes = new Hono<{ Variables: RBACVariables }>()

const scheduleQuerySchema = z.object({
  branchId: uuidSchema.optional(),
})

schedulingRoutes.get('/scheduling/week',
  requirePermission(Permission.SCHEDULE_READ),
  zValidator('query', scheduleQuerySchema),
  async (c) => {
    const user = c.get('user')
    const query = c.req.valid('query')
    const branchId = query.branchId ?? getUserBranchId(user)

    if (!branchId) {
      return badRequest(c, 'branchId required')
    }

    try {
      const schedule = await getWeeklySchedule(user.tenant_id, branchId)
      if (wantsMd(c)) return mdResponse(c, scheduleToMd(rows(schedule)))
      return success(c, { schedule })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

schedulingRoutes.get('/schedule/:branchId',
  requirePermission(Permission.SCHEDULE_READ),
  zValidator('param', z.object({ branchId: uuidSchema })),
  async (c) => {
    const user = c.get('user')
    const { branchId } = c.req.valid('param')

    try {
      const schedule = await getWeeklySchedule(user.tenant_id, branchId)
      if (wantsMd(c)) return mdResponse(c, scheduleToMd(rows(schedule)))
      return success(c, { schedule })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

const checkConflictsSchema = z.object({
  branchId: uuidSchema,
  studentId: uuidSchema,
  teacherId: uuidSchema,
  classroomId: uuidSchema.optional(),
  subject: z.string().min(1).max(50),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  dayOfWeek: z.number().int().min(0).max(6),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

schedulingRoutes.post('/schedule/check',
  requirePermission(Permission.SCHEDULE_WRITE),
  zValidator('json', checkConflictsSchema),
  async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')

    try {
      const conflicts = await checkConflicts({
        tenantId: user.tenant_id,
        branchId: body.branchId,
        studentId: body.studentId,
        teacherId: body.teacherId,
        classroomId: body.classroomId,
        subject: body.subject,
        dayOfWeek: body.dayOfWeek,
        startTime: body.startTime,
        endTime: body.endTime,
        effectiveFrom: body.effectiveFrom,
      })
      return success(c, { conflicts, hasConflicts: conflicts.length > 0 })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

const createSlotSchema = z.object({
  branchId: uuidSchema,
  studentId: uuidSchema,
  teacherId: uuidSchema,
  classroomId: uuidSchema.optional(),
  subject: z.string().min(1).max(50),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  dayOfWeek: z.number().int().min(0).max(6),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

schedulingRoutes.post('/schedule/create',
  requirePermission(Permission.SCHEDULE_WRITE),
  zValidator('json', createSlotSchema),
  async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')

    try {
      const result = await createTimeSlot({
        tenantId: user.tenant_id,
        branchId: body.branchId,
        studentId: body.studentId,
        teacherId: body.teacherId,
        classroomId: body.classroomId,
        subject: body.subject,
        dayOfWeek: body.dayOfWeek,
        startTime: body.startTime,
        endTime: body.endTime,
        effectiveFrom: body.effectiveFrom,
      })
      return success(c, result, 201)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

export { schedulingRoutes }
