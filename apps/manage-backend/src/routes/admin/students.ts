import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { RBACVariables } from '../../middleware/rbac'
import { requirePermission, Role, Permission } from '../../middleware/rbac'
import {
  uuidSchema,
  createStudentSchema,
  updateStudentSchema,
  sanitizeSearchTerm,
} from '../../utils/validation'
import { computeGrade } from '@94cram/shared/utils'
import {
  db, sql, success, successWithPagination, badRequest, notFound, forbidden, internalError,
  rows, first, isUUID, getUserBranchId, isBranchInTenant,
} from './_helpers'

const studentsRoutes = new Hono<{ Variables: RBACVariables }>()

const studentQuerySchema = z.object({
  branchId: uuidSchema.optional(),
  search: z.string().max(100).optional(),
  grade: z.string().max(10).optional(),
  status: z.enum(['active', 'inactive', 'dropped', 'graduated', 'suspended', 'all']).default('active'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

studentsRoutes.get('/students', requirePermission(Permission.STUDENTS_READ), zValidator('query', studentQuerySchema), async (c) => {
  const user = c.get('user')
  const tenantId = user.tenant_id
  const query = c.req.valid('query')
  const offset = (query.page - 1) * query.limit

  try {
    const conditions = [sql`s.tenant_id = ${tenantId}`, sql`s.deleted_at IS NULL`]

    if (query.status !== 'all') {
      conditions.push(sql`s.status = ${query.status}`)
    }
    if (query.branchId) {
      conditions.push(sql`s.branch_id = ${query.branchId}`)
    }
    if (query.grade) {
      conditions.push(sql`s.grade_level = ${query.grade}`)
    }
    if (query.search) {
      const searchTerm = sanitizeSearchTerm(query.search)
      conditions.push(sql`(
        s.full_name ILIKE ${'%' + searchTerm + '%'}
        OR s.phone ILIKE ${'%' + searchTerm + '%'}
        OR s.student_code ILIKE ${'%' + searchTerm + '%'}
      )`)
    }

    // Role-based filtering
    const teacherBranchId = getUserBranchId(user)
    if (user.role === Role.TEACHER && teacherBranchId) {
      conditions.push(sql`s.branch_id = ${teacherBranchId}`)
    } else if (user.role === Role.PARENT && isUUID(user.id)) {
      conditions.push(sql`s.id IN (SELECT student_id FROM parent_students WHERE parent_id = ${user.id})`)
    }

    const where = sql.join(conditions, sql` AND `)

    const countResult = first(await db.execute(sql`SELECT COUNT(*)::int as total FROM manage_students s WHERE ${where}`))
    const total = Number(countResult?.total) || 0

    const studentRows = await db.execute(sql`
      SELECT s.id, s.student_code, s.full_name, s.nickname, s.gender,
        s.date_of_birth, s.school_name, s.grade_level, s.grade_override, s.branch_id,
        s.phone, s.email, s.status, s.enrollment_date, s.notes, s.created_at,
        (SELECT json_agg(json_build_object(
          'id', e.id, 'course_id', e.course_id, 'status', e.status,
          'tuition', e.tuition_amount, 'start_date', e.start_date))
         FROM manage_enrollments e WHERE e.student_id = s.id AND e.status = 'active') as enrollments
      FROM manage_students s
      WHERE ${where}
      ORDER BY s.full_name
      LIMIT ${query.limit} OFFSET ${offset}
    `)

    const studentsWithGrade = rows(studentRows).map((s: any) => ({
      ...s,
      computed_grade: s.date_of_birth ? computeGrade(s.date_of_birth) : null,
    }))

    return successWithPagination(c, { students: studentsWithGrade }, {
      page: query.page,
      limit: query.limit,
      total,
    })
  } catch (err) {
    return internalError(c, err)
  }
})

studentsRoutes.get('/students/:id',
  requirePermission(Permission.STUDENTS_READ),
  zValidator('param', z.object({ id: uuidSchema })),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const { id: studentId } = c.req.valid('param')

    try {
      const student = first(await db.execute(sql`
        SELECT s.* FROM manage_students s
        WHERE s.id = ${studentId} AND s.tenant_id = ${tenantId} AND s.deleted_at IS NULL
      `))

      if (!student) {
        return notFound(c, 'Student')
      }

      // Role check
      const teacherBranchId = getUserBranchId(user)
      if (user.role === Role.TEACHER && teacherBranchId && student.branch_id !== teacherBranchId) {
        return forbidden(c, 'Access denied')
      }
      if (user.role === Role.PARENT && isUUID(user.id)) {
        const link = first(await db.execute(sql`
          SELECT 1
          FROM parent_students ps
          JOIN manage_students s ON s.id = ps.student_id
          WHERE ps.student_id = ${studentId}
            AND ps.parent_id = ${user.id}
            AND s.tenant_id = ${tenantId}
            AND s.deleted_at IS NULL
          LIMIT 1
        `))
        if (!link) {
          return forbidden(c, 'Access denied')
        }
      }

      const enrollments = await db.execute(sql`
        SELECT e.*
        FROM manage_enrollments e
        JOIN manage_students s ON s.id = e.student_id
        WHERE e.student_id = ${studentId}
          AND s.tenant_id = ${tenantId}
          AND s.deleted_at IS NULL
        ORDER BY e.status, e.start_date DESC
      `)
      // NOTE: attendance table migrated to inClass system — returning empty array.
      // To retrieve attendance data, call inclass-backend API instead.
      const attendance = { rows: [] }
      // NOTE: grades table migrated to inClass system — returning empty array.
      // To retrieve grades data, call inclass-backend API instead.
      const grades = { rows: [] }

      const studentWithGrade = {
        ...student,
        computed_grade: student.date_of_birth ? computeGrade(student.date_of_birth as string) : null,
      }

      return success(c, { student: studentWithGrade, enrollments: rows(enrollments), attendance: rows(attendance), grades: rows(grades) })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

studentsRoutes.post('/students',
  requirePermission(Permission.STUDENTS_WRITE),
  zValidator('json', createStudentSchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const body = c.req.valid('json')

    try {
      if (body.branchId && !(await isBranchInTenant(body.branchId, tenantId))) {
        return badRequest(c, 'Invalid branchId for current tenant')
      }

      const studentCode = body.studentCode || ('S' + Date.now().toString(36).toUpperCase())

      // Auto-compute grade_level from dateOfBirth if not explicitly provided
      const gradeLevel = body.gradeLevel
        ?? (body.dateOfBirth ? computeGrade(body.dateOfBirth) : null)
        ?? null

      const result = first(await db.execute(sql`
        INSERT INTO manage_students (tenant_id, branch_id, student_code, full_name, nickname, gender,
          date_of_birth, school_name, grade_level, phone, email, address, notes)
        VALUES (${tenantId}, ${body.branchId ?? null}, ${studentCode},
          ${body.fullName}, ${body.nickname ?? null}, ${body.gender ?? null},
          ${body.dateOfBirth ?? null}::date, ${body.schoolName ?? null}, ${gradeLevel},
          ${body.phone ?? null}, ${body.email ?? null}, ${body.address ?? null}, ${body.notes ?? null})
        RETURNING id
      `))

      return success(c, { id: result?.id }, 201)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

studentsRoutes.put('/students/:id',
  requirePermission(Permission.STUDENTS_WRITE),
  zValidator('param', z.object({ id: uuidSchema })),
  zValidator('json', updateStudentSchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const { id: studentId } = c.req.valid('param')
    const body = c.req.valid('json')

    try {
      if (body.branchId && !(await isBranchInTenant(body.branchId, tenantId))) {
        return badRequest(c, 'Invalid branchId for current tenant')
      }

      // If dateOfBirth is provided, auto-compute grade_level
      const gradeLevel = body.dateOfBirth
        ? (computeGrade(body.dateOfBirth) ?? body.gradeLevel ?? null)
        : (body.gradeLevel ?? null)

      const result = await db.execute(sql`
        UPDATE manage_students SET
          full_name = COALESCE(${body.fullName ?? null}, full_name),
          nickname = COALESCE(${body.nickname ?? null}, nickname),
          branch_id = COALESCE(${body.branchId ?? null}, branch_id),
          grade_level = COALESCE(${gradeLevel}, grade_level),
          school_name = COALESCE(${body.schoolName ?? null}, school_name),
          phone = COALESCE(${body.phone ?? null}, phone),
          email = COALESCE(${body.email ?? null}, email),
          date_of_birth = COALESCE(${body.dateOfBirth ?? null}::date, date_of_birth),
          status = COALESCE(${body.status ?? null}, status),
          notes = COALESCE(${body.notes ?? null}, notes),
          grade_override = ${body.gradeOverride ?? null},
          updated_at = NOW()
        WHERE id = ${studentId} AND tenant_id = ${tenantId} AND deleted_at IS NULL
        RETURNING id
      `)

      if (!first(result)) {
        return notFound(c, 'Student')
      }

      return success(c, { updated: true })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

studentsRoutes.delete('/students/:id',
  requirePermission(Permission.STUDENTS_WRITE),
  zValidator('param', z.object({ id: uuidSchema })),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const { id: studentId } = c.req.valid('param')

    try {
      // Soft delete
      const result = await db.execute(sql`
        UPDATE manage_students
        SET deleted_at = NOW(), status = 'dropped'
        WHERE id = ${studentId} AND tenant_id = ${tenantId} AND deleted_at IS NULL
        RETURNING id
      `)

      if (!first(result)) {
        return notFound(c, 'Student')
      }

      return success(c, { deleted: true })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

export { studentsRoutes }
