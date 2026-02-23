/**
 * Parents Routes - 家長管理
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db/index.js'
import { parents, students } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import type { Variables } from '../middleware/auth.js'

const parentsRouter = new Hono<{ Variables: Variables }>()

const parentSchema = z.object({
  studentId: z.string().uuid(),
  name: z.string().min(1).max(100),
  phone: z.string().regex(/^[0-9+\-() ]{8,20}$/, 'Invalid phone number format'),
  lineUserId: z.string().max(100).optional(),
  relationship: z.string().max(50).optional(),
})

const parentIdParamSchema = z.object({
  id: z.string().uuid('Invalid parent ID format'),
})

const requireSchoolId = (schoolId: string | undefined) => {
  return typeof schoolId === 'string' && schoolId.trim().length > 0 ? schoolId : null
}

parentsRouter.get('/', async (c) => {
  try {
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ error: 'Unauthorized' }, 401)
    const filteredParents = await db
      .select({
        id: parents.id,
        studentId: parents.studentId,
        name: parents.name,
        phone: parents.phone,
        lineUserId: parents.lineUserId,
        relationship: parents.relation,
        notifyEnabled: parents.notifyEnabled,
        createdAt: parents.createdAt,
      })
      .from(parents)
      .innerJoin(students, eq(parents.studentId, students.id))
      .where(eq(students.schoolId, schoolId))

    return c.json({ parents: filteredParents })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching parents:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch parents' }, 500)
  }
})

parentsRouter.post('/', zValidator('json', parentSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ error: 'Unauthorized' }, 401)

    const [student] = await db.select().from(students).where(eq(students.id, body.studentId))
    if (!student || student.schoolId !== schoolId) {
      return c.json({ error: 'Student not found' }, 404)
    }

    const [existingParent] = await db.select().from(parents)
      .where(and(eq(parents.studentId, body.studentId), eq(parents.phone, body.phone)))

    if (existingParent) {
      return c.json({ error: 'Parent with this phone number already exists for this student' }, 400)
    }

    const [newParent] = await db.insert(parents).values(body).returning()
    return c.json({ success: true, parent: newParent }, 201)
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error creating parent:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to create parent' }, 500)
  }
})

// LINE 綁定
const lineBindSchema = z.object({
  studentId: z.string().uuid(),
  lineUserId: z.string().min(1).max(100),
  phone: z.string().regex(/^[0-9+\-() ]{8,20}$/, 'Invalid phone number format'),
})

parentsRouter.post('/line-bind', zValidator('json', lineBindSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ error: 'Unauthorized' }, 401)

    const [student] = await db.select().from(students).where(eq(students.id, body.studentId))
    if (!student || student.schoolId !== schoolId) {
      return c.json({ error: 'Student not found' }, 404)
    }

    const [parent] = await db.select().from(parents)
      .where(and(eq(parents.studentId, body.studentId), eq(parents.phone, body.phone)))

    if (!parent) {
      return c.json({ error: 'Parent not found with this phone number' }, 404)
    }

    if (body.lineUserId !== parent.lineUserId) {
      const [existingLine] = await db.select().from(parents)
        .where(eq(parents.lineUserId, body.lineUserId))
      if (existingLine && existingLine.id !== parent.id) {
        return c.json({ error: 'LINE account already bound to another parent' }, 400)
      }
    }

    const [updated] = await db.update(parents)
      .set({ lineUserId: body.lineUserId })
      .where(eq(parents.id, parent.id))
      .returning()

    return c.json({ success: true, parent: updated })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error binding LINE:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to bind LINE' }, 500)
  }
})

parentsRouter.get('/:id', zValidator('param', parentIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ error: 'Unauthorized' }, 401)

    const [parent] = await db.select().from(parents).where(eq(parents.id, id))
    if (!parent) return c.json({ error: 'Parent not found' }, 404)

    const [student] = await db.select().from(students).where(eq(students.id, parent.studentId))
    if (!student || student.schoolId !== schoolId) return c.json({ error: 'Parent not found' }, 404)

    return c.json({ parent })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching parent:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch parent' }, 500)
  }
})

parentsRouter.put(
  '/:id',
  zValidator('param', parentIdParamSchema),
  zValidator('json', parentSchema.partial()),
  async (c) => {
  try {
    const { id } = c.req.valid('param')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ error: 'Unauthorized' }, 401)
    const body = c.req.valid('json')

    const [parent] = await db.select().from(parents).where(eq(parents.id, id))
    if (!parent) return c.json({ error: 'Parent not found' }, 404)

    const [student] = await db.select().from(students).where(eq(students.id, parent.studentId))
    if (!student || student.schoolId !== schoolId) return c.json({ error: 'Parent not found' }, 404)

    if (body.studentId && body.studentId !== parent.studentId) {
      const [newStudent] = await db.select().from(students).where(eq(students.id, body.studentId))
      if (!newStudent || newStudent.schoolId !== schoolId) return c.json({ error: 'Invalid student ID' }, 400)
    }

    if (body.phone && body.phone !== parent.phone) {
      const targetStudentId = body.studentId || parent.studentId
      const [dup] = await db.select().from(parents)
        .where(and(eq(parents.studentId, targetStudentId), eq(parents.phone, body.phone)))
      if (dup && dup.id !== id) {
        return c.json({ error: 'Parent with this phone number already exists for this student' }, 400)
      }
    }

    const [updated] = await db.update(parents).set(body).where(eq(parents.id, id)).returning()
    return c.json({ success: true, parent: updated })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error updating parent:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to update parent' }, 500)
  }
})

parentsRouter.delete('/:id', zValidator('param', parentIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ error: 'Unauthorized' }, 401)

    const [parent] = await db.select().from(parents).where(eq(parents.id, id))
    if (!parent) return c.json({ error: 'Parent not found' }, 404)

    const [student] = await db.select().from(students).where(eq(students.id, parent.studentId))
    if (!student || student.schoolId !== schoolId) return c.json({ error: 'Parent not found' }, 404)

    await db.delete(parents).where(eq(parents.id, id))
    return c.json({ success: true })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error deleting parent:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to delete parent' }, 500)
  }
})

export default parentsRouter
