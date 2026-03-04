import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requirePermission, Permission, type RBACVariables } from '../../middleware/rbac'
import {
  createCourseSchema,
  uuidSchema,
  sanitizeString,
} from '../../utils/validation'
import { db, sql, logger, success, notFound, badRequest, internalError, rows, first } from './_helpers'

export const courseRoutes = new Hono<{ Variables: RBACVariables }>()

const courseQuerySchema = z.object({
  tenant_id: uuidSchema.optional(),
  branch_id: uuidSchema.optional(),
  subject: z.string().max(30).optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
})

courseRoutes.get('/courses', requirePermission(Permission.SCHEDULE_READ), zValidator('query', courseQuerySchema), async (c) => {
  try {
    const query = c.req.valid('query')
    const user = c.get('user')
    if (!user?.tenant_id && !query.tenant_id) {
      return badRequest(c, 'Missing tenant context')
    }
    const conditions = [sql`1=1`]
    conditions.push(sql`c.tenant_id = ${user?.tenant_id ?? query.tenant_id}`)
    if (query.branch_id) conditions.push(sql`c.branch_id = ${query.branch_id}`)
    if (query.subject) conditions.push(sql`c.subject = ${query.subject}`)
    if (query.status) conditions.push(sql`c.status = ${query.status}`)

    const where = sql.join(conditions, sql` AND `)

    const result = await db.execute(sql`
      SELECT c.*,
        (SELECT COUNT(*)::int FROM course_enrollments ce WHERE ce.course_id = c.id AND ce.status = 'active') as student_count
      FROM courses c
      WHERE ${where}
      ORDER BY c.name
    `)

    return success(c, { courses: rows(result) })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching courses:')
    return internalError(c, error)
  }
})

courseRoutes.get('/courses/:id', requirePermission(Permission.SCHEDULE_READ), zValidator('param', z.object({ id: uuidSchema })), async (c) => {
  try {
    const { id } = c.req.valid('param')

    const user = c.get('user')
    const courseResult = await db.execute(sql`SELECT * FROM courses WHERE id = ${id} AND tenant_id = ${user?.tenant_id}`)
    const course = first(courseResult)
    if (!course) {
      return notFound(c, 'Course')
    }

    const studentsResult = await db.execute(sql`
      SELECT s.id, s.full_name, s.grade_level
      FROM course_enrollments ce
      JOIN students s ON ce.student_id = s.id
      WHERE ce.course_id = ${id} AND ce.status = 'active'
      ORDER BY s.full_name
    `)

    return success(c, {
      course: {
        ...course,
        students: rows(studentsResult),
      },
    })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching course:')
    return internalError(c, error)
  }
})

courseRoutes.post('/courses', requirePermission(Permission.SCHEDULE_WRITE), zValidator('json', createCourseSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const user = c.get('user')

    const result = await db.execute(sql`
      INSERT INTO courses (tenant_id, branch_id, name, subject, duration_minutes, max_students)
      VALUES (${user?.tenant_id ?? body.tenantId}, ${body.branchId}, ${sanitizeString(body.name)},
              ${body.subject ? sanitizeString(body.subject) : null}, ${body.durationMinutes}, ${body.maxStudents})
      RETURNING *
    `)

    return success(c, { course: first(result) }, 201)
  } catch (error) {
    logger.error({ err: error }, 'Error creating course:')
    return internalError(c, error)
  }
})
