import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db/index.js'
import { inclassParents, manageStudents } from '@94cram/shared/db'
import { and, eq } from 'drizzle-orm'
import type { Variables } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

const parentsRouter = new Hono<{ Variables: Variables }>()

const parentSchema = z.object({
  studentId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(20).optional(),
  lineUserId: z.string().trim().max(255).optional(),
  relation: z.string().trim().max(50).optional(),
}).strict()

parentsRouter.get('/', async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const parents = await db.select().from(inclassParents).where(eq(inclassParents.tenantId, schoolId))
    return c.json({ parents })
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Error fetching parents`)
    return c.json({ error: 'Failed to fetch parents' }, 500)
  }
})

parentsRouter.post('/', zValidator('json', parentSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const schoolId = c.get('schoolId')

    const [student] = await db.select().from(manageStudents).where(
      and(eq(manageStudents.id, body.studentId), eq(manageStudents.tenantId, schoolId))
    )
    if (!student) return c.json({ error: 'Student not found' }, 404)

    const [parent] = await db.insert(inclassParents).values({
      tenantId: schoolId,
      studentId: body.studentId,
      name: body.name,
      phone: body.phone,
      lineUserId: body.lineUserId,
      relation: body.relation,
    }).returning()

    return c.json({ success: true, parent }, 201)
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Error creating parent`)
    return c.json({ error: 'Failed to create parent' }, 500)
  }
})

export default parentsRouter
