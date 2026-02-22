/**
 * Students Routes - 學生管理
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db/index.js'
import { students, classes } from '../db/schema.js'
import { eq, sql, and } from 'drizzle-orm'
import { isValidUUID } from '../utils/date.js'
import type { Variables } from '../middleware/auth.js'

const studentsRouter = new Hono<{ Variables: Variables }>()

const studentSchema = z.object({
  name: z.string().min(1).max(100),
  classId: z.string().uuid().optional(),
  nfcId: z.string().min(1).max(50).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  schoolName: z.string().max(100).optional(),
  grade: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
})

// 學生列表
studentsRouter.get('/', async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const page = Math.max(1, Math.min(1000, parseInt(c.req.query('page') || '1')))
    const limit = Math.max(1, Math.min(100, parseInt(c.req.query('limit') || '50')))
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
    const schoolId = c.get('schoolId')

    if (body.classId) {
      const [classExists] = await db.select().from(classes).where(eq(classes.id, body.classId))
      if (!classExists || classExists.schoolId !== schoolId) {
        return c.json({ error: 'Invalid class ID' }, 400)
      }
    }

    if (body.nfcId) {
      const [existingNfc] = await db.select().from(students).where(eq(students.nfcId, body.nfcId))
      if (existingNfc && existingNfc.schoolId === schoolId) {
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
studentsRouter.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const schoolId = c.get('schoolId')

    if (!isValidUUID(id)) {
      return c.json({ error: 'Invalid student ID format' }, 400)
    }

    const [student] = await db.select().from(students).where(eq(students.id, id))
    if (!student || student.schoolId !== schoolId) {
      return c.json({ error: 'Student not found' }, 404)
    }

    return c.json({ student })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching student:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch student' }, 500)
  }
})

// 更新學生
studentsRouter.put('/:id', zValidator('json', studentSchema.partial()), async (c) => {
  try {
    const id = c.req.param('id')
    const schoolId = c.get('schoolId')
    const body = c.req.valid('json')

    if (!isValidUUID(id)) {
      return c.json({ error: 'Invalid student ID format' }, 400)
    }

    const [existing] = await db.select().from(students).where(eq(students.id, id))
    if (!existing || existing.schoolId !== schoolId) {
      return c.json({ error: 'Student not found' }, 404)
    }

    if (body.classId) {
      const [classExists] = await db.select().from(classes).where(eq(classes.id, body.classId))
      if (!classExists || classExists.schoolId !== schoolId) {
        return c.json({ error: 'Invalid class ID' }, 400)
      }
    }

    if (body.nfcId && body.nfcId !== existing.nfcId) {
      const [existingNfc] = await db.select().from(students).where(eq(students.nfcId, body.nfcId))
      if (existingNfc && existingNfc.schoolId === schoolId && existingNfc.id !== id) {
        return c.json({ error: 'NFC ID already in use' }, 400)
      }
    }

    const [updated] = await db.update(students).set(body).where(eq(students.id, id)).returning()
    return c.json({ success: true, student: updated })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error updating student:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to update student' }, 500)
  }
})

// 刪除學生
studentsRouter.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const schoolId = c.get('schoolId')

    if (!isValidUUID(id)) {
      return c.json({ error: 'Invalid student ID format' }, 400)
    }

    const [existing] = await db.select().from(students).where(eq(students.id, id))
    if (!existing || existing.schoolId !== schoolId) {
      return c.json({ error: 'Student not found' }, 404)
    }

    await db.delete(students).where(eq(students.id, id))
    return c.json({ success: true })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error deleting student:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to delete student' }, 500)
  }
})

export default studentsRouter
