/**
 * 補課管理 Routes (inclass-backend)
 * Migrated from manage-backend with inclass_ table references
 *
 * Endpoints:
 *   GET    /                — list with status/student/month filtering + pagination
 *   POST   /                — create new makeup record
 *   PUT    /:id             — schedule makeup (slot or manual)
 *   PUT    /:id/complete    — mark complete
 *   POST   /batch-assign    — batch assign students to slot
 *   DELETE /:id             — cancel (soft delete)
 *   POST   /:id/notify      — send parent notification
 *   GET    /:id/notice-pdf  — generate notice HTML
 *   GET    /slots           — list slots
 *   POST   /slots           — create slot
 *   PUT    /slots/:id       — update slot
 *   DELETE /slots/:id       — delete slot
 *   GET    /slots/:slotId/students — list students in a slot
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { generateMakeupNoticeHTML } from '../templates/makeup-notice.js'
import { notifyParent } from '../services/notify-helper.js'
import { logger } from '../utils/logger.js'
import type { Variables } from '../middleware/auth.js'
import { rows, first } from '../db/helpers.js'

const makeupClassRoutes = new Hono<{ Variables: Variables }>()

// ── Helpers ──

function success(c: any, data: any, status: number = 200) {
  return c.json({ success: true, data }, status)
}

function successWithPagination(c: any, data: any, pagination: { page: number; limit: number; total: number }) {
  return c.json({ success: true, data, pagination }, 200)
}

function notFound(c: any, message: string) {
  return c.json({ success: false, error: 'not_found', message }, 404)
}

function badRequest(c: any, message: string) {
  return c.json({ success: false, error: 'bad_request', message }, 400)
}

function internalError(c: any, err: unknown) {
  logger.error({ err }, '[MakeupClasses] Internal error')
  return c.json({ success: false, error: 'internal_error', message: 'Internal server error' }, 500)
}

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

const slotQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  teacherId: z.string().uuid().optional(),
  subject: z.string().optional(),
})

const createSlotSchema = z.object({
  subject: z.string().max(100),
  makeupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  teacherId: z.string().uuid().optional(),
  room: z.string().max(50).optional(),
  maxStudents: z.number().int().positive().optional(),
  notes: z.string().optional(),
})

const updateSlotSchema = z.object({
  subject: z.string().max(100).optional(),
  makeupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  teacherId: z.string().uuid().nullable().optional(),
  room: z.string().max(50).nullable().optional(),
  maxStudents: z.number().int().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
})

// ══════════════════════════════════════════════════════════════
// ── MAKEUP CLASSES ENDPOINTS
// ══════════════════════════════════════════════════════════════

// ── GET / ── list with status/student/month filtering + pagination

makeupClassRoutes.get('/',
  zValidator('query', makeupQuerySchema),
  async (c) => {
    const tenantId = c.get('schoolId')
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

      const cnt = first<{ total: number }>(await db.execute(sql`
        SELECT COUNT(*)::int as total
        FROM inclass_makeup_classes mc
        WHERE ${where}
      `))

      const makeupRows = await db.execute(sql`
        SELECT mc.id, mc.student_id, mc.original_date, mc.original_course_id,
          mc.original_course_name, mc.status, mc.makeup_date, mc.makeup_time,
          mc.makeup_end_time, mc.makeup_teacher_id, mc.makeup_room, mc.notes,
          mc.created_at,
          s.name as student_name
        FROM inclass_makeup_classes mc
        JOIN manage_students s ON mc.student_id = s.id
        WHERE ${where}
        ORDER BY mc.created_at DESC
        LIMIT ${query.limit} OFFSET ${offset}
      `)

      return successWithPagination(c, { makeupClasses: rows(makeupRows) }, {
        page: query.page,
        limit: query.limit,
        total: cnt?.total ?? 0,
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ── POST / ── create new makeup record

makeupClassRoutes.post('/',
  zValidator('json', createMakeupSchema),
  async (c) => {
    const tenantId = c.get('schoolId')
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
        INSERT INTO inclass_makeup_classes
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

// ── PUT /:id ── schedule makeup (slot or manual)

makeupClassRoutes.put('/:id',
  zValidator('json', scheduleMakeupSchema),
  async (c) => {
    const tenantId = c.get('schoolId')
    const id = c.req.param('id')
    const body = c.req.valid('json')

    try {
      if (body.slotId) {
        // 使用補課時段排課
        const slot = first(await db.execute(sql`
          SELECT id, makeup_date, start_time, end_time, teacher_id, room
          FROM inclass_makeup_slots
          WHERE id = ${body.slotId} AND tenant_id = ${tenantId}
          LIMIT 1
        `))

        if (!slot) {
          return badRequest(c, '補課時段不存在')
        }

        const result = await db.execute(sql`
          UPDATE inclass_makeup_classes
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
        // 手動排課
        if (!body.makeupDate || !body.makeupTime) {
          return badRequest(c, '手動排課需提供 makeupDate 和 makeupTime')
        }

        const result = await db.execute(sql`
          UPDATE inclass_makeup_classes
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

// ── PUT /:id/complete ── mark complete

makeupClassRoutes.put('/:id/complete',
  async (c) => {
    const tenantId = c.get('schoolId')
    const id = c.req.param('id')

    try {
      const result = await db.execute(sql`
        UPDATE inclass_makeup_classes
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

// ── POST /batch-assign ── batch assign students to slot

makeupClassRoutes.post('/batch-assign',
  zValidator('json', batchAssignSchema),
  async (c) => {
    const tenantId = c.get('schoolId')
    const body = c.req.valid('json')

    try {
      // 1. 驗證 slot 存在且屬於同 tenant
      const slot = first<{ id: string; makeup_date: string; start_time: string; end_time: string; teacher_id: string | null; room: string | null; max_students: number | null }>(await db.execute(sql`
        SELECT id, makeup_date, start_time, end_time, teacher_id, room, max_students
        FROM inclass_makeup_slots
        WHERE id = ${body.slotId} AND tenant_id = ${tenantId}
        LIMIT 1
      `))

      if (!slot) {
        return badRequest(c, '補課時段不存在')
      }

      // 2. 查詢目前已安排的學生數
      const countResult = first<{ current_students: number }>(await db.execute(sql`
        SELECT COUNT(*)::int as current_students
        FROM inclass_makeup_classes
        WHERE slot_id = ${body.slotId} AND status != 'cancelled'
      `))

      const currentStudents = countResult?.current_students ?? 0

      // 3. 檢查是否超過最大人數
      if (currentStudents + body.makeupClassIds.length > (slot.max_students ?? 10)) {
        return badRequest(c, '超過時段最大人數')
      }

      // 4. 批量 UPDATE
      const ids = body.makeupClassIds
      const result = await db.execute(sql`
        UPDATE inclass_makeup_classes
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

// ── DELETE /:id ── cancel (soft delete)

makeupClassRoutes.delete('/:id',
  async (c) => {
    const tenantId = c.get('schoolId')
    const id = c.req.param('id')

    try {
      const result = await db.execute(sql`
        UPDATE inclass_makeup_classes
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

// ── POST /:id/notify ── send parent notification

makeupClassRoutes.post('/:id/notify',
  async (c) => {
    const tenantId = c.get('schoolId')
    const id = c.req.param('id')

    try {
      const mc = first(await db.execute(sql`
        SELECT mc.id, mc.student_id, mc.status, mc.makeup_date, mc.makeup_time,
          mc.makeup_end_time, mc.makeup_room, mc.makeup_teacher_id,
          mc.original_course_name,
          s.name as student_name,
          t.name as teacher_name
        FROM inclass_makeup_classes mc
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

      // 使用 notify-helper 發送 LINE + Telegram 通知
      void notifyParent(
        tenantId,
        mc.student_id as string,
        '補課通知',
        `${studentName} 同學的補課已安排：${makeupDate} ${makeupTime}，${teacherName ? teacherName + '老師，' : ''}教室 ${room}`,
      )

      return success(c, { message: '通知已發送' })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ── GET /:id/notice-pdf ── generate notice HTML

makeupClassRoutes.get('/:id/notice-pdf',
  async (c) => {
    const tenantId = c.get('schoolId')
    const id = c.req.param('id')

    try {
      const mc = first(await db.execute(sql`
        SELECT mc.id, mc.original_date, mc.original_course_name,
          mc.makeup_date, mc.makeup_time, mc.makeup_end_time,
          mc.makeup_room, mc.notes,
          s.name as student_name,
          t.name as teacher_name
        FROM inclass_makeup_classes mc
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

// ══════════════════════════════════════════════════════════════
// ── MAKEUP SLOTS ENDPOINTS
// ══════════════════════════════════════════════════════════════

// ── GET /slots ── list slots

makeupClassRoutes.get('/slots',
  zValidator('query', slotQuerySchema),
  async (c) => {
    const tenantId = c.get('schoolId')
    const query = c.req.valid('query')

    try {
      const conditions = [sql`ms.tenant_id = ${tenantId}`]

      if (query.date) {
        conditions.push(sql`ms.makeup_date = ${query.date}::date`)
      }
      if (query.dateFrom) {
        conditions.push(sql`ms.makeup_date >= ${query.dateFrom}::date`)
      }
      if (query.dateTo) {
        conditions.push(sql`ms.makeup_date <= ${query.dateTo}::date`)
      }
      if (query.teacherId) {
        conditions.push(sql`ms.teacher_id = ${query.teacherId}`)
      }
      if (query.subject) {
        conditions.push(sql`ms.subject = ${query.subject}`)
      }

      const where = sql.join(conditions, sql` AND `)

      const slotRows = await db.execute(sql`
        SELECT ms.id, ms.tenant_id, ms.subject, ms.makeup_date, ms.start_time,
          ms.end_time, ms.teacher_id, ms.room, ms.max_students, ms.notes,
          ms.created_at,
          t.name as teacher_name,
          COALESCE(sc.current_students, 0)::int as current_students
        FROM inclass_makeup_slots ms
        LEFT JOIN manage_teachers t ON ms.teacher_id = t.id
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int as current_students
          FROM inclass_makeup_classes mc
          WHERE mc.slot_id = ms.id AND mc.status != 'cancelled'
        ) sc ON true
        WHERE ${where}
        ORDER BY ms.makeup_date ASC, ms.start_time ASC
      `)

      return success(c, { slots: rows(slotRows) })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ── POST /slots ── create slot

makeupClassRoutes.post('/slots',
  zValidator('json', createSlotSchema),
  async (c) => {
    const tenantId = c.get('schoolId')
    const body = c.req.valid('json')

    try {
      const result = await db.execute(sql`
        INSERT INTO inclass_makeup_slots
          (tenant_id, subject, makeup_date, start_time, end_time, teacher_id, room, max_students, notes)
        VALUES
          (${tenantId}, ${body.subject}, ${body.makeupDate}::date,
           ${body.startTime}, ${body.endTime},
           ${body.teacherId ?? null}, ${body.room ?? null},
           ${body.maxStudents ?? 10}, ${body.notes ?? null})
        RETURNING *
      `)

      return success(c, { slot: first(result) }, 201)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ── PUT /slots/:id ── update slot

makeupClassRoutes.put('/slots/:id',
  zValidator('json', updateSlotSchema),
  async (c) => {
    const tenantId = c.get('schoolId')
    const id = c.req.param('id')
    const body = c.req.valid('json')

    try {
      const setClauses = []
      if (body.subject !== undefined) setClauses.push(sql`subject = ${body.subject}`)
      if (body.makeupDate !== undefined) setClauses.push(sql`makeup_date = ${body.makeupDate}::date`)
      if (body.startTime !== undefined) setClauses.push(sql`start_time = ${body.startTime}`)
      if (body.endTime !== undefined) setClauses.push(sql`end_time = ${body.endTime}`)
      if (body.teacherId !== undefined) setClauses.push(sql`teacher_id = ${body.teacherId}`)
      if (body.room !== undefined) setClauses.push(sql`room = ${body.room}`)
      if (body.maxStudents !== undefined) setClauses.push(sql`max_students = ${body.maxStudents}`)
      if (body.notes !== undefined) setClauses.push(sql`notes = ${body.notes}`)

      if (setClauses.length === 0) {
        return badRequest(c, '未提供任何更新欄位')
      }

      const setSQL = sql.join(setClauses, sql`, `)

      const result = await db.execute(sql`
        UPDATE inclass_makeup_slots
        SET ${setSQL}
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `)

      const row = first(result)
      if (!row) {
        return notFound(c, '找不到此補課時段')
      }

      return success(c, { slot: row })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ── DELETE /slots/:id ── delete slot

makeupClassRoutes.delete('/slots/:id',
  async (c) => {
    const tenantId = c.get('schoolId')
    const id = c.req.param('id')

    try {
      // Check for active makeup classes linked to this slot
      const cnt = first<{ total: number }>(await db.execute(sql`
        SELECT COUNT(*)::int as total
        FROM inclass_makeup_classes
        WHERE slot_id = ${id} AND status != 'cancelled'
      `))

      if ((cnt?.total ?? 0) > 0) {
        return badRequest(c, '此時段尚有學生，無法刪除')
      }

      const result = await db.execute(sql`
        DELETE FROM inclass_makeup_slots
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `)

      const row = first(result)
      if (!row) {
        return notFound(c, '找不到此補課時段')
      }

      return success(c, { message: '已刪除' })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ── GET /slots/:slotId/students ── list students in a slot

makeupClassRoutes.get('/slots/:slotId/students',
  async (c) => {
    const tenantId = c.get('schoolId')
    const slotId = c.req.param('slotId')

    try {
      // Verify slot belongs to tenant
      const slot = first(await db.execute(sql`
        SELECT id FROM inclass_makeup_slots
        WHERE id = ${slotId} AND tenant_id = ${tenantId}
        LIMIT 1
      `))

      if (!slot) {
        return notFound(c, '找不到此補課時段')
      }

      const studentRows = await db.execute(sql`
        SELECT mc.id, s.name as student_name,
          mc.original_course_name, mc.status
        FROM inclass_makeup_classes mc
        JOIN manage_students s ON mc.student_id = s.id
        WHERE mc.slot_id = ${slotId} AND mc.status != 'cancelled'
        ORDER BY s.name ASC
      `)

      return success(c, { students: rows(studentRows) })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

export { makeupClassRoutes }
