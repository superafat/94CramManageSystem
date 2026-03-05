import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { RBACVariables } from '../../middleware/rbac'
import { requirePermission, Permission } from '../../middleware/rbac'
import { db, sql, success, successWithPagination, notFound, badRequest, internalError, rows, first } from './_helpers'
import { generateMakeupNoticeHTML } from '../../templates/makeup-notice'
import { notifyScheduleChange } from '../../services/notify-helper'

const makeupClassesRoutes = new Hono<{ Variables: RBACVariables }>()

// ── Zod schemas ──

const createMakeupSchema = z.object({
  studentId: z.string().uuid(),
  originalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  originalCourseId: z.string().uuid().optional(),
  originalCourseName: z.string().max(100).optional(),
  notes: z.string().optional(),
})

const scheduleMakeupSchema = z.object({
  makeupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  makeupTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  makeupEndTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  makeupTeacherId: z.string().uuid().optional(),
  makeupRoom: z.string().max(50).optional(),
  notes: z.string().optional(),
  slotId: z.string().uuid().optional(),
})

const batchAssignSchema = z.object({
  slotId: z.string().uuid(),
  makeupClassIds: z.array(z.string().uuid()).min(1),
})

const makeupQuerySchema = z.object({
  status: z.enum(['pending', 'scheduled', 'completed', 'cancelled']).optional(),
  studentId: z.string().uuid().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

// ── GET /makeup-classes ──

makeupClassesRoutes.get('/makeup-classes',
  requirePermission(Permission.ATTENDANCE_READ),
  zValidator('query', makeupQuerySchema),
  async (c) => {
    const tenantId = c.get('user').tenant_id
    const query = c.req.valid('query')
    const offset = (query.page - 1) * query.limit

    try {
      const conditions = [sql`mc.tenant_id = ${tenantId}`]

      if (query.status) conditions.push(sql`mc.status = ${query.status}`)
      if (query.studentId) conditions.push(sql`mc.student_id = ${query.studentId}`)
      if (query.month) {
        conditions.push(sql`to_char(mc.original_date, 'YYYY-MM') = ${query.month}`)
      }

      const where = sql.join(conditions, sql` AND `)

      const cnt = first(await db.execute(sql`
        SELECT COUNT(*)::int as total
        FROM manage_makeup_classes mc
        WHERE ${where}
      `))

      const makeupRows = await db.execute(sql`
        SELECT mc.id, mc.student_id, mc.original_date, mc.original_course_id,
          mc.original_course_name, mc.status, mc.makeup_date, mc.makeup_time,
          mc.makeup_end_time, mc.makeup_teacher_id, mc.makeup_room, mc.notes,
          mc.created_at,
          s.full_name as student_name
        FROM manage_makeup_classes mc
        JOIN manage_students s ON mc.student_id = s.id
        WHERE ${where}
        ORDER BY mc.created_at DESC
        LIMIT ${query.limit} OFFSET ${offset}
      `)

      return successWithPagination(c, { makeupClasses: rows(makeupRows) }, {
        page: query.page,
        limit: query.limit,
        total: Number(cnt?.total) || 0,
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ── POST /makeup-classes ──

makeupClassesRoutes.post('/makeup-classes',
  requirePermission(Permission.ATTENDANCE_WRITE),
  zValidator('json', createMakeupSchema),
  async (c) => {
    const tenantId = c.get('user').tenant_id
    const body = c.req.valid('json')

    try {
      // Verify student belongs to tenant
      const student = first(await db.execute(sql`
        SELECT id FROM manage_students
        WHERE id = ${body.studentId} AND tenant_id = ${tenantId}
        LIMIT 1
      `))

      if (!student) {
        return badRequest(c, 'Student not found in this tenant')
      }

      const result = await db.execute(sql`
        INSERT INTO manage_makeup_classes
          (tenant_id, student_id, original_date, original_course_id, original_course_name, notes)
        VALUES
          (${tenantId}, ${body.studentId}, ${body.originalDate}::date,
           ${body.originalCourseId ?? null}, ${body.originalCourseName ?? null},
           ${body.notes ?? null})
        RETURNING *
      `)

      return success(c, { makeupClass: first(result) }, 201)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ── PUT /makeup-classes/:id ──

makeupClassesRoutes.put('/makeup-classes/:id',
  requirePermission(Permission.ATTENDANCE_WRITE),
  zValidator('json', scheduleMakeupSchema),
  async (c) => {
    const tenantId = c.get('user').tenant_id
    const id = c.req.param('id')
    const body = c.req.valid('json')

    try {
      if (body.slotId) {
        // 使用補課時段排課
        const slot = first(await db.execute(sql`
          SELECT id, makeup_date, start_time, end_time, teacher_id, room
          FROM manage_makeup_slots
          WHERE id = ${body.slotId} AND tenant_id = ${tenantId}
          LIMIT 1
        `))

        if (!slot) {
          return badRequest(c, '補課時段不存在')
        }

        const result = await db.execute(sql`
          UPDATE manage_makeup_classes
          SET makeup_date = ${slot.makeup_date}::date,
              makeup_time = ${slot.start_time},
              makeup_end_time = ${slot.end_time},
              makeup_teacher_id = ${slot.teacher_id},
              makeup_room = ${slot.room},
              slot_id = ${body.slotId},
              notes = COALESCE(${body.notes ?? null}, notes),
              status = 'scheduled'
          WHERE id = ${id} AND tenant_id = ${tenantId}
            AND status IN ('pending', 'scheduled')
          RETURNING *
        `)

        const row = first(result)
        if (!row) {
          return notFound(c, 'Makeup class not found or not in schedulable state')
        }

        return success(c, { makeupClass: row })
      } else {
        // 手動排課（原有邏輯）
        if (!body.makeupDate || !body.makeupTime) {
          return badRequest(c, '手動排課需提供 makeupDate 和 makeupTime')
        }

        const result = await db.execute(sql`
          UPDATE manage_makeup_classes
          SET makeup_date = ${body.makeupDate}::date,
              makeup_time = ${body.makeupTime},
              makeup_end_time = ${body.makeupEndTime ?? null},
              makeup_teacher_id = ${body.makeupTeacherId ?? null},
              makeup_room = ${body.makeupRoom ?? null},
              notes = COALESCE(${body.notes ?? null}, notes),
              status = 'scheduled'
          WHERE id = ${id} AND tenant_id = ${tenantId}
            AND status IN ('pending', 'scheduled')
          RETURNING *
        `)

        const row = first(result)
        if (!row) {
          return notFound(c, 'Makeup class not found or not in schedulable state')
        }

        return success(c, { makeupClass: row })
      }
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ── PUT /makeup-classes/:id/complete ──

makeupClassesRoutes.put('/makeup-classes/:id/complete',
  requirePermission(Permission.ATTENDANCE_WRITE),
  async (c) => {
    const tenantId = c.get('user').tenant_id
    const id = c.req.param('id')

    try {
      const result = await db.execute(sql`
        UPDATE manage_makeup_classes
        SET status = 'completed'
        WHERE id = ${id} AND tenant_id = ${tenantId}
          AND status = 'scheduled'
        RETURNING *
      `)

      const row = first(result)
      if (!row) {
        return notFound(c, 'Makeup class not found or not in scheduled state')
      }

      return success(c, { makeupClass: row })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ── POST /makeup-classes/batch-assign ──

makeupClassesRoutes.post('/makeup-classes/batch-assign',
  requirePermission(Permission.ATTENDANCE_WRITE),
  zValidator('json', batchAssignSchema),
  async (c) => {
    const tenantId = c.get('user').tenant_id
    const body = c.req.valid('json')

    try {
      // 1. 驗證 slot 存在且屬於同 tenant
      const slot = first(await db.execute(sql`
        SELECT id, makeup_date, start_time, end_time, teacher_id, room, max_students
        FROM manage_makeup_slots
        WHERE id = ${body.slotId} AND tenant_id = ${tenantId}
        LIMIT 1
      `))

      if (!slot) {
        return badRequest(c, '補課時段不存在')
      }

      // 2. 查詢目前已安排的學生數
      const countResult = first(await db.execute(sql`
        SELECT COUNT(*)::int as current_students
        FROM manage_makeup_classes
        WHERE slot_id = ${body.slotId} AND status != 'cancelled'
      `))

      const currentStudents = Number(countResult?.current_students) || 0

      // 3. 檢查是否超過最大人數
      if (currentStudents + body.makeupClassIds.length > (Number(slot.max_students) || 10)) {
        return badRequest(c, '超過時段最大人數')
      }

      // 4. 批量 UPDATE
      const ids = body.makeupClassIds
      const result = await db.execute(sql`
        UPDATE manage_makeup_classes
        SET slot_id = ${body.slotId},
            makeup_date = ${slot.makeup_date}::date,
            makeup_time = ${slot.start_time},
            makeup_end_time = ${slot.end_time},
            makeup_teacher_id = ${slot.teacher_id},
            makeup_room = ${slot.room},
            status = 'scheduled'
        WHERE id = ANY(${ids})
          AND tenant_id = ${tenantId}
          AND status = 'pending'
      `)

      return success(c, { updated: (result as { rowCount?: number }).rowCount || body.makeupClassIds.length })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ── DELETE /makeup-classes/:id ──

makeupClassesRoutes.delete('/makeup-classes/:id',
  requirePermission(Permission.ATTENDANCE_WRITE),
  async (c) => {
    const tenantId = c.get('user').tenant_id
    const id = c.req.param('id')

    try {
      const result = await db.execute(sql`
        UPDATE manage_makeup_classes
        SET status = 'cancelled'
        WHERE id = ${id} AND tenant_id = ${tenantId}
          AND status IN ('pending', 'scheduled')
        RETURNING *
      `)

      const row = first(result)
      if (!row) {
        return notFound(c, 'Makeup class not found or already completed/cancelled')
      }

      return success(c, { makeupClass: row })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ── POST /makeup-classes/:id/notify ──

makeupClassesRoutes.post('/makeup-classes/:id/notify',
  requirePermission(Permission.ATTENDANCE_WRITE),
  async (c) => {
    const tenantId = c.get('user').tenant_id
    const id = c.req.param('id')

    try {
      const mc = first(await db.execute(sql`
        SELECT mc.id, mc.student_id, mc.status, mc.makeup_date, mc.makeup_time,
          mc.makeup_end_time, mc.makeup_room, mc.makeup_teacher_id,
          s.full_name as student_name,
          t.full_name as teacher_name
        FROM manage_makeup_classes mc
        JOIN manage_students s ON mc.student_id = s.id
        LEFT JOIN manage_teachers t ON mc.makeup_teacher_id = t.id
        WHERE mc.id = ${id} AND mc.tenant_id = ${tenantId}
        LIMIT 1
      `))

      if (!mc) {
        return notFound(c, '找不到此補課紀錄')
      }

      if (mc.status !== 'scheduled') {
        return badRequest(c, '只能通知已排定的補課')
      }

      const studentName = mc.student_name as string
      const makeupDate = String(mc.makeup_date)
      const makeupTime = mc.makeup_time as string
      const teacherName = (mc.teacher_name as string) || ''
      const room = (mc.makeup_room as string) || ''

      // Fire-and-forget notification
      fetch(`${process.env.API_BASE_URL || 'http://localhost:3100'}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'makeup_scheduled',
          studentId: mc.student_id,
          message: `${studentName} 同學的補課已安排：${makeupDate} ${makeupTime}，${teacherName}老師，教室 ${room}`,
        }),
      }).catch(() => {}) // fire-and-forget

      // Notify parent via LINE + Telegram
      void notifyScheduleChange(tenantId, mc.student_id as string, studentName, 'makeup', {
        courseName: (mc.original_course_name as string) || '',
        originalDate: makeupDate,
        newDate: makeupDate,
        newTime: makeupTime,
        teacherName: teacherName,
        room: room,
      })

      return success(c, { message: '通知已發送' })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ── GET /makeup-classes/:id/notice-pdf ──

makeupClassesRoutes.get('/makeup-classes/:id/notice-pdf',
  requirePermission(Permission.ATTENDANCE_READ),
  async (c) => {
    const tenantId = c.get('user').tenant_id
    const id = c.req.param('id')

    try {
      const mc = first(await db.execute(sql`
        SELECT mc.id, mc.original_date, mc.original_course_name,
          mc.makeup_date, mc.makeup_time, mc.makeup_end_time,
          mc.makeup_room, mc.notes,
          s.full_name as student_name,
          t.full_name as teacher_name
        FROM manage_makeup_classes mc
        JOIN manage_students s ON mc.student_id = s.id
        LEFT JOIN manage_teachers t ON mc.makeup_teacher_id = t.id
        WHERE mc.id = ${id} AND mc.tenant_id = ${tenantId}
        LIMIT 1
      `))

      if (!mc) {
        return notFound(c, '找不到此補課紀錄')
      }

      const htmlString = generateMakeupNoticeHTML({
        studentName: mc.student_name as string,
        originalDate: String(mc.original_date),
        originalCourseName: (mc.original_course_name as string) || '未指定',
        makeupDate: String(mc.makeup_date),
        makeupTime: mc.makeup_time as string,
        makeupEndTime: (mc.makeup_end_time as string) || undefined,
        teacherName: (mc.teacher_name as string) || undefined,
        room: (mc.makeup_room as string) || undefined,
        notes: (mc.notes as string) || undefined,
      })

      return c.html(htmlString)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

export { makeupClassesRoutes }
