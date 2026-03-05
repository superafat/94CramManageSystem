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
      const conditions = [sql`s.tenant_id = ${tenantId}`]

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
        SELECT a.id, a.student_id, a.lesson_id, a.date, a.present, a.notes, a.created_at,
          s.full_name as student_name, s.grade_level
        FROM attendance a JOIN students s ON a.student_id = s.id
        WHERE ${where}
        ORDER BY a.date DESC, s.full_name
        LIMIT ${query.limit} OFFSET ${offset}
      `)

      return successWithPagination(c, { attendance: rows(attendanceRows) }, {
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
    const body = c.req.valid('json')

    try {
      const records = 'records' in body ? body.records : [body]
      let inserted = 0

      for (const rec of records) {
        await db.execute(sql`
          INSERT INTO attendance (student_id, lesson_id, date, present, notes)
          VALUES (${rec.studentId}, ${rec.lessonId ?? null},
            ${rec.date ?? new Date().toISOString().slice(0, 10)}::date,
            ${rec.present ?? true}, ${rec.notes ?? null})
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
