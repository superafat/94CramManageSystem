import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { RBACVariables } from '../../middleware/rbac'
import { requirePermission, Role, Permission } from '../../middleware/rbac'
import {
  uuidSchema,
  createGradeSchema,
  bulkGradeSchema,
} from '../../utils/validation'
import { db, sql, success, successWithPagination, internalError, rows, isUUID } from './_helpers'

const gradesRoutes = new Hono<{ Variables: RBACVariables }>()

const gradeQuerySchema = z.object({
  studentId: uuidSchema.optional(),
  examType: z.string().max(20).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

gradesRoutes.get('/grades',
  requirePermission(Permission.GRADES_READ),
  zValidator('query', gradeQuerySchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const query = c.req.valid('query')
    const offset = (query.page - 1) * query.limit

    try {
      const conditions = [sql`g.tenant_id = ${tenantId}`]

      if (query.studentId) conditions.push(sql`g.student_id = ${query.studentId}`)
      if (query.examType) conditions.push(sql`g.exam_type = ${query.examType}`)
      if (query.from) conditions.push(sql`g.date >= ${query.from}::date`)
      if (query.to) conditions.push(sql`g.date <= ${query.to}::date`)

      if (user.role === Role.TEACHER && (user as any).branch_id) {
        conditions.push(sql`s.branch_id = ${(user as any).branch_id}`)
      } else if (user.role === Role.PARENT && isUUID(user.id)) {
        conditions.push(sql`s.id IN (SELECT student_id FROM parent_students WHERE parent_id = ${user.id})`)
      }

      const where = sql.join(conditions, sql` AND `)

      const [cnt] = await db.execute(sql`
        SELECT COUNT(*)::int as total
        FROM grades g JOIN students s ON g.student_id = s.id
        WHERE ${where}
      `) as any[]

      const gradeRows = await db.execute(sql`
        SELECT g.id, g.student_id, g.exam_type, g.exam_name, g.subject,
          g.score, COALESCE(g.max_score, g.full_score, 100) as max_score,
          COALESCE(g.date, g.exam_date) as date,
          g.note as notes, g.created_at,
          ROUND((g.score / COALESCE(g.max_score, g.full_score, 100) * 100)::numeric, 1) as percentage,
          CASE
            WHEN g.score >= 90 THEN 'A'
            WHEN g.score >= 80 THEN 'B'
            WHEN g.score >= 70 THEN 'C'
            WHEN g.score >= 60 THEN 'D'
            ELSE 'F'
          END as letter_grade,
          g.score >= 60 as passed,
          s.full_name as student_name, s.grade_level
        FROM grades g JOIN students s ON g.student_id = s.id
        WHERE ${where}
        ORDER BY COALESCE(g.date, g.exam_date) DESC, s.full_name
        LIMIT ${query.limit} OFFSET ${offset}
      `)

      return successWithPagination(c, { grades: rows(gradeRows) }, {
        page: query.page,
        limit: query.limit,
        total: cnt?.total ?? 0,
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

gradesRoutes.post('/grades',
  requirePermission(Permission.GRADES_WRITE),
  zValidator('json', z.union([createGradeSchema, bulkGradeSchema])),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const body = c.req.valid('json')

    try {
      const records = 'records' in body ? body.records : [body]
      let inserted = 0

      for (const rec of records) {
        await db.execute(sql`
          INSERT INTO grades (tenant_id, student_id, exam_type, exam_name, subject, score, max_score, date, note)
          VALUES (${tenantId}, ${rec.studentId}, ${rec.examType},
            ${rec.examName}, ${rec.subject ?? null},
            ${rec.score}, ${rec.maxScore},
            ${rec.date ?? new Date().toISOString().slice(0, 10)}::date,
            ${rec.notes ?? null})
        `)
        inserted++
      }

      return success(c, { inserted }, 201)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

export { gradesRoutes }
