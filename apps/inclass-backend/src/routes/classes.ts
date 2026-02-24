import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db/index.js'
import { manageCourses } from '@94cram/shared/db'
import { and, eq } from 'drizzle-orm'
import type { Variables } from '../middleware/auth.js'

const classesRouter = new Hono<{ Variables: Variables }>()

const classSchema = z.object({
  name: z.string().trim().min(1).max(100),
  grade: z.string().trim().min(1).max(50).optional(),
  subject: z.string().trim().min(1).max(100).optional(),
}).strict()

const classUpdateSchema = classSchema.partial().refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' })
const classIdParamSchema = z.object({ id: z.string().uuid('Invalid class ID format') })
const requireSchoolId = (schoolId: string | undefined) => (typeof schoolId === 'string' && schoolId.trim() ? schoolId : null)

classesRouter.get('/', async (c) => {
  try {
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ success: false, data: null, error: 'Unauthorized' }, 401)
    const allClasses = await db.select().from(manageCourses).where(eq(manageCourses.tenantId, schoolId))
    return c.json({ success: true, data: { classes: allClasses }, error: null })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching classes:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ success: false, data: null, error: 'Failed to fetch classes' }, 500)
  }
})

classesRouter.post('/', zValidator('json', classSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ success: false, data: null, error: 'Unauthorized' }, 401)
    const [existingClass] = await db.select().from(manageCourses).where(and(eq(manageCourses.tenantId, schoolId), eq(manageCourses.name, body.name)))
    if (existingClass) return c.json({ success: false, data: null, error: 'Class name already exists' }, 400)

    const [newClass] = await db.insert(manageCourses).values({
      tenantId: schoolId,
      name: body.name,
      grade: body.grade,
      subject: body.subject,
    }).returning()
    return c.json({ success: true, data: { class: newClass }, error: null }, 201)
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error creating class:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ success: false, data: null, error: 'Failed to create class' }, 500)
  }
})

classesRouter.get('/:id', zValidator('param', classIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ success: false, data: null, error: 'Unauthorized' }, 401)
    const [classData] = await db.select().from(manageCourses).where(and(eq(manageCourses.id, id), eq(manageCourses.tenantId, schoolId)))
    if (!classData) return c.json({ success: false, data: null, error: 'Class not found' }, 404)
    return c.json({ success: true, data: { class: classData }, error: null })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching class:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ success: false, data: null, error: 'Failed to fetch class' }, 500)
  }
})

classesRouter.put('/:id', zValidator('param', classIdParamSchema), zValidator('json', classUpdateSchema), async (c) => {
  try {
    const { id } = c.req.valid('param')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ success: false, data: null, error: 'Unauthorized' }, 401)
    const body = c.req.valid('json')

    const [existing] = await db.select().from(manageCourses).where(and(eq(manageCourses.id, id), eq(manageCourses.tenantId, schoolId)))
    if (!existing) return c.json({ success: false, data: null, error: 'Class not found' }, 404)
    if (body.name && body.name !== existing.name) {
      const [dup] = await db.select().from(manageCourses).where(and(eq(manageCourses.tenantId, schoolId), eq(manageCourses.name, body.name)))
      if (dup) return c.json({ success: false, data: null, error: 'Class name already exists' }, 400)
    }

    const [updated] = await db.update(manageCourses).set(body).where(and(eq(manageCourses.id, id), eq(manageCourses.tenantId, schoolId))).returning()
    return c.json({ success: true, data: { class: updated }, error: null })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error updating class:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ success: false, data: null, error: 'Failed to update class' }, 500)
  }
})

classesRouter.delete('/:id', zValidator('param', classIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ success: false, data: null, error: 'Unauthorized' }, 401)
    const [existing] = await db.select().from(manageCourses).where(and(eq(manageCourses.id, id), eq(manageCourses.tenantId, schoolId)))
    if (!existing) return c.json({ success: false, data: null, error: 'Class not found' }, 404)
    await db.delete(manageCourses).where(and(eq(manageCourses.id, id), eq(manageCourses.tenantId, schoolId)))
    return c.json({ success: true, data: { deleted: true }, error: null })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error deleting class:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ success: false, data: null, error: 'Failed to delete class' }, 500)
  }
})

export default classesRouter
