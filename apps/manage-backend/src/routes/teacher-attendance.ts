/**
 * Teacher Attendance Routes: 師資出缺勤管理
 *
 * Endpoints:
 * GET    /             — 查詢出缺勤列表（支援 month, teacherId 篩選）
 * POST   /             — 新增出缺勤記錄（簽到、請假）
 * PUT    /:id/approve  — 審核請假（管理者）
 * GET    /stats        — 師資出缺勤統計
 * POST   /:id/substitute — 設定代課老師
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db'
import { sql } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import { requireRole, Role, type RBACVariables } from '../middleware/rbac'
import { success, badRequest, notFound, internalError } from '../utils/response'
import { logger } from '../utils/logger'
import { rows, first } from '../db/helpers'

export const teacherAttendanceRoutes = new Hono<{ Variables: RBACVariables }>()

// Apply auth middleware to all routes
teacherAttendanceRoutes.use('*', authMiddleware)

// ============================================================
// Schemas
// ============================================================

const listQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date 格式應為 YYYY-MM-DD').optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'month 格式應為 YYYY-MM').optional(),
  teacherId: z.string().uuid('teacherId 必須是 UUID').optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const createSchema = z.object({
  teacherId: z.string().uuid('teacherId 必須是 UUID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date 格式應為 YYYY-MM-DD'),
  type: z.enum(['checkin', 'absent', 'sick_leave', 'personal_leave', 'annual_leave', 'family_leave', 'other_leave']),
  checkInTime: z.string().optional(),   // HH:MM
  reason: z.string().max(500).optional(),
  branchId: z.string().uuid().optional(),
})

const approveSchema = z.object({
  approved: z.boolean(),
  note: z.string().max(500).optional(),
})

const substituteSchema = z.object({
  substituteTeacherId: z.string().uuid('substituteTeacherId 必須是 UUID'),
  note: z.string().max(500).optional(),
})

const statsQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'month 格式應為 YYYY-MM').optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate 格式應為 YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate 格式應為 YYYY-MM-DD').optional(),
  teacherId: z.string().uuid().optional(),
})

// ============================================================
// GET /stats — 出缺勤統計（必須在 /:id 路由之前宣告）
// ============================================================
teacherAttendanceRoutes.get(
  '/stats',
  zValidator('query', statsQuerySchema),
  async (c) => {
    try {
      const query = c.req.valid('query')
      const user = c.get('user')

      if (!user?.tenant_id) {
        return badRequest(c, '缺少租戶資訊')
      }

      const tenantId = user.tenant_id
      const month = query.month ?? new Date().toISOString().slice(0, 7)
      const conditions = [sql`ta.tenant_id = ${tenantId}`]

      if (query.startDate && query.endDate) {
        conditions.push(sql`ta.date >= ${query.startDate}::date`)
        conditions.push(sql`ta.date <= ${query.endDate}::date`)
      } else {
        const [year, mon] = month.split('-')
        conditions.push(sql`EXTRACT(YEAR FROM ta.date) = ${parseInt(year)}`)
        conditions.push(sql`EXTRACT(MONTH FROM ta.date) = ${parseInt(mon)}`)
      }
      if (query.teacherId) {
        conditions.push(sql`ta.teacher_id = ${query.teacherId}`)
      }

      const where = sql.join(conditions, sql` AND `)

      const result = await db.execute(sql`
        SELECT
          t.id AS teacher_id,
          t.full_name AS teacher_name,
          COUNT(*) FILTER (WHERE ta.type = 'checkin' AND ta.status = 'approved') AS attendance_days,
          COUNT(*) FILTER (WHERE ta.type = 'checkin' AND ta.status = 'approved' AND ta.check_in_time > (ta.date::text || ' 09:15')::timestamp) AS late_count,
          COUNT(*) FILTER (WHERE ta.type = 'absent' AND ta.status = 'approved') AS absent_days,
          COUNT(*) FILTER (WHERE ta.type = 'sick_leave' AND ta.status = 'approved') AS sick_leave_days,
          COUNT(*) FILTER (WHERE ta.type = 'personal_leave' AND ta.status = 'approved') AS personal_leave_days,
          COUNT(*) FILTER (WHERE ta.type = 'annual_leave' AND ta.status = 'approved') AS annual_leave_days,
          COUNT(*) FILTER (WHERE ta.type = 'family_leave' AND ta.status = 'approved') AS family_leave_days,
          COUNT(*) FILTER (WHERE ta.type = 'other_leave' AND ta.status = 'approved') AS other_leave_days,
          COUNT(*) FILTER (WHERE ta.type IN ('sick_leave','personal_leave','annual_leave','family_leave','other_leave') AND ta.status = 'approved') AS total_leave_days,
          COUNT(*) FILTER (WHERE ta.substitute_teacher_id IS NOT NULL) AS substitute_count,
          ROUND(
            100.0 * COUNT(*) FILTER (WHERE ta.type = 'checkin' AND ta.status = 'approved') /
            NULLIF(COUNT(*) FILTER (WHERE ta.type IN ('checkin','absent')), 0),
            1
          ) AS attendance_rate
        FROM manage_teacher_attendance ta
        JOIN manage_teachers t ON t.id = ta.teacher_id
        WHERE ${where}
        GROUP BY t.id, t.full_name
        ORDER BY t.full_name
      `)

      return success(c, { month, stats: rows(result) })
    } catch (err) {
      logger.error({ err }, 'teacher-attendance stats error')
      return internalError(c, '統計查詢失敗')
    }
  }
)

// ============================================================
// GET / — 查詢出缺勤列表
// ============================================================
teacherAttendanceRoutes.get(
  '/',
  zValidator('query', listQuerySchema),
  async (c) => {
    try {
      const query = c.req.valid('query')
      const user = c.get('user')

      if (!user?.tenant_id) {
        return badRequest(c, '缺少租戶資訊')
      }

      const tenantId = user.tenant_id
      const offset = (query.page - 1) * query.limit

      const conditions = [sql`ta.tenant_id = ${tenantId}`]

      if (query.date) {
        conditions.push(sql`ta.date = ${query.date}::date`)
      } else if (query.month) {
        const [year, mon] = query.month.split('-')
        conditions.push(sql`EXTRACT(YEAR FROM ta.date) = ${parseInt(year)}`)
        conditions.push(sql`EXTRACT(MONTH FROM ta.date) = ${parseInt(mon)}`)
      }

      if (query.teacherId) {
        conditions.push(sql`ta.teacher_id = ${query.teacherId}`)
      }

      const where = sql.join(conditions, sql` AND `)

      const [dataResult, countResult] = await Promise.all([
        db.execute(sql`
          SELECT
            ta.id,
            ta.teacher_id,
            t.full_name AS teacher_name,
            ta.date,
            ta.type,
            ta.status,
            ta.check_in_time,
            ta.reason,
            ta.approved_by,
            ta.approved_at,
            ta.approve_note,
            ta.substitute_teacher_id,
            st.full_name AS substitute_teacher_name,
            ta.substitute_note,
            ta.branch_id,
            ta.created_at,
            ta.updated_at
          FROM manage_teacher_attendance ta
          JOIN manage_teachers t ON t.id = ta.teacher_id
          LEFT JOIN manage_teachers st ON st.id = ta.substitute_teacher_id
          WHERE ${where}
          ORDER BY ta.date DESC, t.full_name
          LIMIT ${query.limit} OFFSET ${offset}
        `),
        db.execute(sql`
          SELECT COUNT(*) AS total
          FROM manage_teacher_attendance ta
          WHERE ${where}
        `),
      ])

      const total = parseInt(String((first(countResult) as Record<string, unknown>)?.total ?? '0'))

      return success(c, {
        records: rows(dataResult),
        pagination: {
          total,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(total / query.limit),
        },
      })
    } catch (err) {
      logger.error({ err }, 'teacher-attendance list error')
      return internalError(c, '查詢出缺勤記錄失敗')
    }
  }
)

// ============================================================
// POST / — 新增出缺勤記錄
// ============================================================
teacherAttendanceRoutes.post(
  '/',
  zValidator('json', createSchema),
  async (c) => {
    try {
      const body = c.req.valid('json')
      const user = c.get('user')

      if (!user?.tenant_id) {
        return badRequest(c, '缺少租戶資訊')
      }

      const tenantId = user.tenant_id

      // 檢查同一老師同一天是否已有相同類型記錄
      const existing = await db.execute(sql`
        SELECT id FROM manage_teacher_attendance
        WHERE tenant_id = ${tenantId}
          AND teacher_id = ${body.teacherId}
          AND date = ${body.date}
          AND type = ${body.type}
        LIMIT 1
      `)

      // checkin / absent 自動核准；請假預設待審核
      const status = body.type === 'checkin' || body.type === 'absent' ? 'approved' : 'pending'

      const checkInTime = body.checkInTime
        ? sql`${body.date + ' ' + body.checkInTime}::timestamp`
        : sql`NULL`

      const existingRecord = first(existing)

      if (existingRecord) {
        const updated = await db.execute(sql`
          UPDATE manage_teacher_attendance
          SET
            status = ${status},
            check_in_time = ${checkInTime},
            reason = ${body.reason ?? null},
            branch_id = ${body.branchId ?? null},
            updated_at = NOW()
          WHERE id = ${existingRecord.id}
          RETURNING *
        `)

        const record = first(updated)
        logger.info({ teacherId: body.teacherId, date: body.date, type: body.type }, 'teacher attendance updated')
        return success(c, { record })
      }

      const result = await db.execute(sql`
        INSERT INTO manage_teacher_attendance
          (tenant_id, teacher_id, date, type, status, check_in_time, reason, branch_id)
        VALUES
          (${tenantId}, ${body.teacherId}, ${body.date}::date, ${body.type}, ${status},
           ${checkInTime}, ${body.reason ?? null}, ${body.branchId ?? null})
        RETURNING *
      `)

      const record = first(result)
      logger.info({ teacherId: body.teacherId, date: body.date, type: body.type }, 'teacher attendance created')

      return success(c, { record }, 201)
    } catch (err) {
      logger.error({ err }, 'teacher-attendance create error')
      return internalError(c, '新增出缺勤記錄失敗')
    }
  }
)

// ============================================================
// PUT /:id/approve — 審核請假（管理者）
// ============================================================
teacherAttendanceRoutes.put(
  '/:id/approve',
  requireRole(Role.ADMIN),
  zValidator('json', approveSchema),
  async (c) => {
    try {
      const id = c.req.param('id')
      const body = c.req.valid('json')
      const user = c.get('user')

      if (!user?.tenant_id) {
        return badRequest(c, '缺少租戶資訊')
      }

      const tenantId = user.tenant_id
      const newStatus = body.approved ? 'approved' : 'rejected'

      const result = await db.execute(sql`
        UPDATE manage_teacher_attendance
        SET
          status = ${newStatus},
          approved_by = ${user.id ?? null},
          approved_at = NOW(),
          approve_note = ${body.note ?? null},
          updated_at = NOW()
        WHERE id = ${id}
          AND tenant_id = ${tenantId}
          AND type != 'checkin'
        RETURNING *
      `)

      const record = first(result)
      if (!record) {
        return notFound(c, '找不到該請假記錄或無法審核簽到記錄')
      }

      logger.info({ id, status: newStatus, approvedBy: user.id }, 'teacher leave reviewed')

      return success(c, { record })
    } catch (err) {
      logger.error({ err }, 'teacher-attendance approve error')
      return internalError(c, '審核請假失敗')
    }
  }
)

// ============================================================
// POST /:id/substitute — 設定代課老師
// ============================================================
teacherAttendanceRoutes.post(
  '/:id/substitute',
  requireRole(Role.ADMIN),
  zValidator('json', substituteSchema),
  async (c) => {
    try {
      const id = c.req.param('id')
      const body = c.req.valid('json')
      const user = c.get('user')

      if (!user?.tenant_id) {
        return badRequest(c, '缺少租戶資訊')
      }

      const tenantId = user.tenant_id

      // 確認代課老師屬於同一租戶
      const teacherCheck = await db.execute(sql`
        SELECT id FROM manage_teachers
        WHERE id = ${body.substituteTeacherId}
          AND tenant_id = ${tenantId}
        LIMIT 1
      `)

      if (rows(teacherCheck).length === 0) {
        return notFound(c, '找不到指定的代課老師')
      }

      const result = await db.execute(sql`
        UPDATE manage_teacher_attendance
        SET
          substitute_teacher_id = ${body.substituteTeacherId},
          substitute_note = ${body.note ?? null},
          updated_at = NOW()
        WHERE id = ${id}
          AND tenant_id = ${tenantId}
        RETURNING *
      `)

      const record = first(result)
      if (!record) {
        return notFound(c, '找不到該出缺勤記錄')
      }

      logger.info({ id, substituteTeacherId: body.substituteTeacherId }, 'substitute teacher assigned')

      return success(c, { record })
    } catch (err) {
      logger.error({ err }, 'teacher-attendance substitute error')
      return internalError(c, '設定代課老師失敗')
    }
  }
)
