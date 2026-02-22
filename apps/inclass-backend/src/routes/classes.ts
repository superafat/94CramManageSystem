/**
 * Classes Routes - 班級管理
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db/index.js'
import { classes, students } from '../db/schema.js'
import { eq, sql, and } from 'drizzle-orm'
import { isValidUUID } from '../utils/date.js'
import type { Variables } from '../middleware/auth.js'

const classesRouter = new Hono<{ Variables: Variables }>()

const classSchema = z.object({
  name: z.string().min(1).max(100),
  grade: z.string().max(50).optional(),
  room: z.string().max(50).optional(),
  capacity: z.number().int().min(1).max(1000).optional(),
  feeMonthly: z.number().int().min(0).optional(),
  feeQuarterly: z.number().int().min(0).optional(),
  feeSemester: z.number().int().min(0).optional(),
  feeYearly: z.number().int().min(0).optional(),
})

classesRouter.get('/', async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const allClasses = await db.select().from(classes).where(eq(classes.schoolId, schoolId))
    return c.json({ classes: allClasses })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching classes:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch classes' }, 500)
  }
})

classesRouter.post('/', zValidator('json', classSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const schoolId = c.get('schoolId')

    const [existingClass] = await db.select().from(classes)
      .where(and(eq(classes.schoolId, schoolId), eq(classes.name, body.name)))

    if (existingClass) {
      return c.json({ error: 'Class name already exists' }, 400)
    }

    const [newClass] = await db.insert(classes).values({ ...body, schoolId }).returning()
    return c.json({ success: true, class: newClass }, 201)
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error creating class:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to create class' }, 500)
  }
})

classesRouter.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const schoolId = c.get('schoolId')

    if (!isValidUUID(id)) return c.json({ error: 'Invalid class ID format' }, 400)

    const [classData] = await db.select().from(classes).where(eq(classes.id, id))
    if (!classData || classData.schoolId !== schoolId) {
      return c.json({ error: 'Class not found' }, 404)
    }

    return c.json({ class: classData })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching class:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch class' }, 500)
  }
})

classesRouter.put('/:id', zValidator('json', classSchema.partial()), async (c) => {
  try {
    const id = c.req.param('id')
    const schoolId = c.get('schoolId')
    const body = c.req.valid('json')

    if (!isValidUUID(id)) return c.json({ error: 'Invalid class ID format' }, 400)

    const [existing] = await db.select().from(classes).where(eq(classes.id, id))
    if (!existing || existing.schoolId !== schoolId) {
      return c.json({ error: 'Class not found' }, 404)
    }

    if (body.name && body.name !== existing.name) {
      const [dup] = await db.select().from(classes)
        .where(and(eq(classes.schoolId, schoolId), eq(classes.name, body.name)))
      if (dup) return c.json({ error: 'Class name already exists' }, 400)
    }

    const [updated] = await db.update(classes).set(body).where(eq(classes.id, id)).returning()
    return c.json({ success: true, class: updated })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error updating class:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to update class' }, 500)
  }
})

classesRouter.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const schoolId = c.get('schoolId')

    if (!isValidUUID(id)) return c.json({ error: 'Invalid class ID format' }, 400)

    const [existing] = await db.select().from(classes).where(eq(classes.id, id))
    if (!existing || existing.schoolId !== schoolId) {
      return c.json({ error: 'Class not found' }, 404)
    }

    const [studentCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(students)
      .where(eq(students.classId, id))

    if (studentCount && studentCount.count > 0) {
      return c.json({ error: 'Cannot delete class with enrolled students', studentCount: studentCount.count }, 400)
    }

    await db.delete(classes).where(eq(classes.id, id))
    return c.json({ success: true })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error deleting class:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to delete class' }, 500)
  }
})

export default classesRouter
