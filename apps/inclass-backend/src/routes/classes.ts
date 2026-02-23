/**
 * Classes Routes - 班級管理
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db/index.js'
import { classes, students } from '../db/schema.js'
import { eq, sql, and } from 'drizzle-orm'
import type { Variables } from '../middleware/auth.js'

const classesRouter = new Hono<{ Variables: Variables }>()

const classSchema = z.object({
  name: z.string().trim().min(1).max(100),
  grade: z.string().trim().min(1).max(50).optional(),
  room: z.string().trim().min(1).max(50).optional(),
  capacity: z.number().int().min(1).max(1000).optional(),
  feeMonthly: z.number().int().min(0).optional(),
  feeQuarterly: z.number().int().min(0).optional(),
  feeSemester: z.number().int().min(0).optional(),
  feeYearly: z.number().int().min(0).optional(),
}).strict()

const classUpdateSchema = classSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' })

const classIdParamSchema = z.object({
  id: z.string().uuid('Invalid class ID format'),
})

const requireSchoolId = (schoolId: string | undefined) => {
  return typeof schoolId === 'string' && schoolId.trim().length > 0 ? schoolId : null
}

classesRouter.get('/', async (c) => {
  try {
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ success: false, data: null, error: 'Unauthorized' }, 401)
    const allClasses = await db.select().from(classes).where(eq(classes.schoolId, schoolId))
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

    const [existingClass] = await db.select().from(classes)
      .where(and(eq(classes.schoolId, schoolId), eq(classes.name, body.name)))

    if (existingClass) {
      return c.json({ success: false, data: null, error: 'Class name already exists' }, 400)
    }

    const [newClass] = await db.insert(classes).values({ ...body, schoolId }).returning()
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

    const [classData] = await db.select().from(classes).where(
      and(eq(classes.id, id), eq(classes.schoolId, schoolId))
    )
    if (!classData) {
      return c.json({ success: false, data: null, error: 'Class not found' }, 404)
    }

    return c.json({ success: true, data: { class: classData }, error: null })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching class:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ success: false, data: null, error: 'Failed to fetch class' }, 500)
  }
})

classesRouter.put(
  '/:id',
  zValidator('param', classIdParamSchema),
  zValidator('json', classUpdateSchema),
  async (c) => {
  try {
    const { id } = c.req.valid('param')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ success: false, data: null, error: 'Unauthorized' }, 401)
    const body = c.req.valid('json')

    const [existing] = await db.select().from(classes).where(
      and(eq(classes.id, id), eq(classes.schoolId, schoolId))
    )
    if (!existing) {
      return c.json({ success: false, data: null, error: 'Class not found' }, 404)
    }

    if (body.name && body.name !== existing.name) {
      const [dup] = await db.select().from(classes)
        .where(and(eq(classes.schoolId, schoolId), eq(classes.name, body.name)))
      if (dup) return c.json({ success: false, data: null, error: 'Class name already exists' }, 400)
    }

    const [updated] = await db.update(classes).set(body).where(
      and(eq(classes.id, id), eq(classes.schoolId, schoolId))
    ).returning()
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

    const [existing] = await db.select().from(classes).where(
      and(eq(classes.id, id), eq(classes.schoolId, schoolId))
    )
    if (!existing) {
      return c.json({ success: false, data: null, error: 'Class not found' }, 404)
    }

    const [studentCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(students)
      .where(and(eq(students.classId, id), eq(students.schoolId, schoolId)))

    if (studentCount && studentCount.count > 0) {
      return c.json({
        success: false,
        data: { studentCount: studentCount.count },
        error: 'Cannot delete class with enrolled students'
      }, 400)
    }

    await db.delete(classes).where(and(eq(classes.id, id), eq(classes.schoolId, schoolId)))
    return c.json({ success: true, data: { deleted: true }, error: null })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error deleting class:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ success: false, data: null, error: 'Failed to delete class' }, 500)
  }
})

export default classesRouter
