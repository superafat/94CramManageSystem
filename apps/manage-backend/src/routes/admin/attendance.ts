import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { RBACVariables } from '../../middleware/rbac'
import { requirePermission, Role, Permission } from '../../middleware/rbac'
import {
  uuidSchema,
  createAttendanceSchema,
  bulkAttendanceSchema,
} from '../../utils/validation'
import { db, sql, success, successWithPagination, internalError, rows, first, isUUID, getUserBranchId } from './_helpers'

const attendanceRoutes = new Hono<{ Variables: RBACVariables }>()

const attendanceQuerySchema = z.object({
  studentId: uuidSchema.optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

attendanceRoutes.get('/attendance',
  requirePermission(Permission.ATTENDANCE_READ),
  zValidator('query', attendanceQuerySchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const query = c.req.valid('query')
    const offset = (query.page - 1) * query.limit

    try {
      const conditions = [sql`a.tenant_id = ${tenantId}`]

      if (query.studentId) conditions.push(sql`a.student_id = ${query.studentId}`)
      if (query.from) conditions.push(sql`a.date >= ${query.from}::date`)
      if (query.to) conditions.push(sql`a.date <= ${query.to}::date`)

      const branchId = getUserBranchId(user)
      if (user.role === Role.TEACHER && branchId) {
        conditions.push(sql`s.branch_id = ${branchId}`)
      } else if (user.role === Role.PARENT && isUUID(user.id)) {
        conditions.push(sql`s.id IN (SELECT student_id FROM parent_students WHERE parent_id = ${user.id})`)
      }

      const where = sql.join(conditions, sql` AND `)

      const cnt = first(await db.execute(sql`
        SELECT COUNT(*)::int as total
        FROM attendance a JOIN students s ON a.student_id = s.id
        WHERE ${where}
      `))

      const attendanceRows = await db.execute(sql`
        SELECT a.id, a.student_id, a.enrollment_id, a.date, a.status, a.note, a.created_at,
          s.name as student_name, s.grade,
          e.course_name
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        LEFT JOIN enrollments e ON a.enrollment_id = e.id
        WHERE ${where}
        ORDER BY a.date DESC, s.name
        LIMIT ${query.limit} OFFSET ${offset}
      `)

      const normalized = rows(attendanceRows).map((record) => {
        const status = String(record.status ?? 'absent')
        const date = String(record.date ?? '').slice(0, 10)

        return {
          id: record.id,
          studentId: record.student_id,
          student_id: record.student_id,
          enrollmentId: record.enrollment_id ?? null,
          enrollment_id: record.enrollment_id ?? null,
          date,
          status,
          present: status === 'present' || status === 'late',
          notes: record.note ?? null,
          note: record.note ?? null,
          studentName: record.student_name,
          student_name: record.student_name,
          grade: record.grade ?? null,
          grade_level: record.grade ?? null,
          course: record.course_name ?? null,
          course_name: record.course_name ?? null,
          created_at: record.created_at,
        }
      })

      return successWithPagination(c, { attendance: normalized, records: normalized }, {
        page: query.page,
        limit: query.limit,
        total: Number(cnt?.total) || 0,
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

attendanceRoutes.post('/attendance',
  requirePermission(Permission.ATTENDANCE_WRITE),
  zValidator('json', z.union([createAttendanceSchema, bulkAttendanceSchema])),
  async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')

    try {
      const records = 'records' in body ? body.records : [body]
      let inserted = 0

      for (const rec of records) {
        const status = rec.present ? 'present' : 'absent'
        await db.execute(sql`
          INSERT INTO attendance (tenant_id, student_id, enrollment_id, date, status, note)
          VALUES (${user.tenant_id}, ${rec.studentId}, ${rec.lessonId ?? null},
            ${rec.date ?? new Date().toISOString().slice(0, 10)}::date,
            ${status}, ${rec.notes ?? null})
        `)
        inserted++
      }

      return success(c, { inserted }, 201)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

export { attendanceRoutes }
