/**
 * Students Routes - 學生管理
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db/index.js'
import { students, classes } from '../db/schema.js'
import { eq, sql, and } from 'drizzle-orm'
import type { Variables } from '../middleware/auth.js'

const studentsRouter = new Hono<{ Variables: Variables }>()

const parseBoundedIntQuery = (
  rawValue: string | undefined,
  fallback: number,
  min: number,
  max: number
) => {
  const parsed = Number.parseInt(rawValue ?? '', 10)
  if (Number.isNaN(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

const studentSchema = z.object({
  name: z.string().min(1).max(100),
  classId: z.string().uuid().optional(),
  nfcId: z.string().min(1).max(50).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  schoolName: z.string().max(100).optional(),
  grade: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
})

const studentIdParamSchema = z.object({
  id: z.string().uuid('Invalid student ID format'),
})

const listStudentsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
})

const requireSchoolId = (schoolId: string | undefined) => {
  return typeof schoolId === 'string' && schoolId.trim().length > 0 ? schoolId : null
}

// 學生列表
studentsRouter.get('/', zValidator('query', listStudentsQuerySchema), async (c) => {
  try {
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ error: 'Unauthorized' }, 401)
    const query = c.req.valid('query')
    const page = parseBoundedIntQuery(query.page, 1, 1, 1000)
    const limit = parseBoundedIntQuery(query.limit, 50, 1, 100)
    const offset = (page - 1) * limit

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(students)
      .where(eq(students.schoolId, schoolId))

    const total = countResult?.count || 0

    const allStudents = await db.select().from(students)
      .where(eq(students.schoolId, schoolId))
      .limit(limit)
      .offset(offset)

    return c.json({
      students: allStudents,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching students:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch students' }, 500)
  }
})

// 新增學生
studentsRouter.post('/', zValidator('json', studentSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ error: 'Unauthorized' }, 401)

    if (body.classId) {
      const [classExists] = await db.select().from(classes).where(
        and(eq(classes.id, body.classId), eq(classes.schoolId, schoolId))
      )
      if (!classExists) {
        return c.json({ error: 'Invalid class ID' }, 400)
      }
    }

    if (body.nfcId) {
      const [existingNfc] = await db.select().from(students).where(
        and(eq(students.nfcId, body.nfcId), eq(students.schoolId, schoolId))
      )
      if (existingNfc) {
        return c.json({ error: 'NFC ID already in use' }, 400)
      }
    }

    const [newStudent] = await db.insert(students).values({
      name: body.name,
      schoolId,
      classId: body.classId,
      nfcId: body.nfcId,
      birthDate: body.birthDate,
      schoolName: body.schoolName,
      grade: body.grade,
      notes: body.notes,
    }).returning()

    return c.json({ success: true, student: newStudent }, 201)
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error creating student:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to create student' }, 500)
  }
})

// 學生詳情
studentsRouter.get('/:id', zValidator('param', studentIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ error: 'Unauthorized' }, 401)

    const [student] = await db.select().from(students).where(
      and(eq(students.id, id), eq(students.schoolId, schoolId))
    )
    if (!student) {
      return c.json({ error: 'Student not found' }, 404)
    }

    return c.json({ student })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching student:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch student' }, 500)
  }
})

// 更新學生
studentsRouter.put(
  '/:id',
  zValidator('param', studentIdParamSchema),
  zValidator('json', studentSchema.partial()),
  async (c) => {
  try {
    const { id } = c.req.valid('param')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ error: 'Unauthorized' }, 401)
    const body = c.req.valid('json')

    const [existing] = await db.select().from(students).where(
      and(eq(students.id, id), eq(students.schoolId, schoolId))
    )
    if (!existing) {
      return c.json({ error: 'Student not found' }, 404)
    }

    if (body.classId) {
      const [classExists] = await db.select().from(classes).where(
        and(eq(classes.id, body.classId), eq(classes.schoolId, schoolId))
      )
      if (!classExists) {
        return c.json({ error: 'Invalid class ID' }, 400)
      }
    }

    if (body.nfcId && body.nfcId !== existing.nfcId) {
      const [existingNfc] = await db.select().from(students).where(
        and(eq(students.nfcId, body.nfcId), eq(students.schoolId, schoolId))
      )
      if (existingNfc && existingNfc.id !== id) {
        return c.json({ error: 'NFC ID already in use' }, 400)
      }
    }

    const [updated] = await db
      .update(students)
      .set(body)
      .where(and(eq(students.id, id), eq(students.schoolId, schoolId)))
      .returning()
    return c.json({ success: true, student: updated })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error updating student:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to update student' }, 500)
  }
})

// 刪除學生
studentsRouter.delete('/:id', zValidator('param', studentIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ error: 'Unauthorized' }, 401)

    const [existing] = await db.select().from(students).where(
      and(eq(students.id, id), eq(students.schoolId, schoolId))
    )
    if (!existing) {
      return c.json({ error: 'Student not found' }, 404)
    }

    await db.delete(students).where(and(eq(students.id, id), eq(students.schoolId, schoolId)))
    return c.json({ success: true })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error deleting student:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to delete student' }, 500)
  }
})

export default studentsRouter
