import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db/index.js'
import { manageStudents, manageCourses, manageEnrollments } from '@94cram/shared/db'
import { and, eq, sql } from 'drizzle-orm'
import type { Variables } from '../middleware/auth.js'

const studentsRouter = new Hono<{ Variables: Variables }>()

const studentSchema = z.object({
  name: z.string().trim().min(1).max(100),
  classId: z.string().uuid().optional(),
  schoolName: z.string().trim().max(255).optional(),
  grade: z.string().trim().max(20).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().email().optional(),
  guardianName: z.string().trim().max(100).optional(),
  guardianPhone: z.string().trim().max(20).optional(),
}).strict()

const studentUpdateSchema = studentSchema.partial().refine((data) => Object.keys(data).length > 0, 'At least one field is required')
const studentIdParamSchema = z.object({ id: z.string().uuid('Invalid student ID format') })
const listStudentsQuerySchema = z.object({ page: z.coerce.number().int().min(1).max(1000).default(1), limit: z.coerce.number().int().min(1).max(100).default(50) })
const schoolIdSchema = z.string().uuid('Invalid school ID format')
const requireSchoolId = (schoolId: string | undefined): string | null => {
  if (typeof schoolId !== 'string') return null
  const parsed = schoolIdSchema.safeParse(schoolId.trim())
  return parsed.success ? parsed.data : null
}

studentsRouter.get('/', zValidator('query', listStudentsQuerySchema), async (c) => {
  try {
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ error: 'Unauthorized' }, 401)
    const { page, limit } = c.req.valid('query')
    const offset = (page - 1) * limit
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(manageStudents).where(eq(manageStudents.tenantId, schoolId))
    const total = countResult?.count || 0
    const allStudents = await db.select().from(manageStudents).where(eq(manageStudents.tenantId, schoolId)).limit(limit).offset(offset)
    return c.json({ students: allStudents, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching students:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch students' }, 500)
  }
})

studentsRouter.post('/', zValidator('json', studentSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ error: 'Unauthorized' }, 401)
    if (body.classId) {
      const [course] = await db.select().from(manageCourses).where(and(eq(manageCourses.id, body.classId), eq(manageCourses.tenantId, schoolId)))
      if (!course) return c.json({ error: 'Invalid class ID' }, 400)
    }

    const [newStudent] = await db.insert(manageStudents).values({
      tenantId: schoolId,
      name: body.name,
      school: body.schoolName,
      grade: body.grade,
      phone: body.phone,
      email: body.email,
      guardianName: body.guardianName,
      guardianPhone: body.guardianPhone,
    }).returning()

    if (body.classId) {
      await db.insert(manageEnrollments).values({ tenantId: schoolId, studentId: newStudent.id, courseId: body.classId })
    }
    return c.json({ success: true, student: newStudent }, 201)
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error creating student:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to create student' }, 500)
  }
})

studentsRouter.get('/:id', zValidator('param', studentIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ error: 'Unauthorized' }, 401)
    const [student] = await db.select().from(manageStudents).where(and(eq(manageStudents.id, id), eq(manageStudents.tenantId, schoolId)))
    if (!student) return c.json({ error: 'Student not found' }, 404)
    return c.json({ student })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching student:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch student' }, 500)
  }
})

studentsRouter.put('/:id', zValidator('param', studentIdParamSchema), zValidator('json', studentUpdateSchema), async (c) => {
  try {
    const { id } = c.req.valid('param')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ error: 'Unauthorized' }, 401)
    const body = c.req.valid('json')

    const [existing] = await db.select().from(manageStudents).where(and(eq(manageStudents.id, id), eq(manageStudents.tenantId, schoolId)))
    if (!existing) return c.json({ error: 'Student not found' }, 404)
    if (body.classId) {
      const [course] = await db.select().from(manageCourses).where(and(eq(manageCourses.id, body.classId), eq(manageCourses.tenantId, schoolId)))
      if (!course) return c.json({ error: 'Invalid class ID' }, 400)
    }

    const [updated] = await db.update(manageStudents).set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.schoolName !== undefined ? { school: body.schoolName } : {}),
      ...(body.grade !== undefined ? { grade: body.grade } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.email !== undefined ? { email: body.email } : {}),
      ...(body.guardianName !== undefined ? { guardianName: body.guardianName } : {}),
      ...(body.guardianPhone !== undefined ? { guardianPhone: body.guardianPhone } : {}),
    }).where(and(eq(manageStudents.id, id), eq(manageStudents.tenantId, schoolId))).returning()

    return c.json({ success: true, student: updated })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error updating student:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to update student' }, 500)
  }
})

studentsRouter.delete('/:id', zValidator('param', studentIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ error: 'Unauthorized' }, 401)
    const [existing] = await db.select().from(manageStudents).where(and(eq(manageStudents.id, id), eq(manageStudents.tenantId, schoolId)))
    if (!existing) return c.json({ error: 'Student not found' }, 404)
    await db.delete(manageStudents).where(and(eq(manageStudents.id, id), eq(manageStudents.tenantId, schoolId)))
    return c.json({ success: true })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error deleting student:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to delete student' }, 500)
  }
})

export default studentsRouter
