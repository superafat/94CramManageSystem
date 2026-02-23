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

const isValidISODate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

const studentSchema = z.object({
  name: z.string().trim().min(1).max(100),
  classId: z.string().uuid().optional(),
  nfcId: z.string().trim().min(1).max(50).optional(),
  birthDate: z.string().trim().refine(isValidISODate, 'Invalid date format (YYYY-MM-DD)').optional(),
  schoolName: z.string().trim().max(100).optional(),
  grade: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(500).optional(),
}).strict()

const studentUpdateSchema = studentSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  'At least one field is required'
)

const studentIdParamSchema = z.object({
  id: z.string().uuid('Invalid student ID format'),
})

type StudentUpdatePayload = Partial<
  Pick<
    typeof students.$inferInsert,
    'name' | 'classId' | 'nfcId' | 'birthDate' | 'schoolName' | 'grade' | 'notes'
  >
>

const listStudentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

const requireSchoolId = (schoolId: string | undefined) => {
  return typeof schoolId === 'string' && schoolId.trim().length > 0 ? schoolId : null
}

// 學生列表
studentsRouter.get('/', zValidator('query', listStudentsQuerySchema), async (c) => {
  try {
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ error: 'Unauthorized' }, 401)
    const { page, limit } = c.req.valid('query')
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
  zValidator('json', studentUpdateSchema),
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

    const updateData: StudentUpdatePayload = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.classId !== undefined) updateData.classId = body.classId
    if (body.nfcId !== undefined) updateData.nfcId = body.nfcId
    if (body.birthDate !== undefined) updateData.birthDate = body.birthDate
    if (body.schoolName !== undefined) updateData.schoolName = body.schoolName
    if (body.grade !== undefined) updateData.grade = body.grade
    if (body.notes !== undefined) updateData.notes = body.notes

    const [updated] = await db
      .update(students)
      .set(updateData)
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
