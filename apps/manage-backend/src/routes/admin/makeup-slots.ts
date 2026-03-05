import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { RBACVariables } from '../../middleware/rbac'
import { requirePermission, Permission } from '../../middleware/rbac'
import { db, sql, success, badRequest, notFound, internalError, rows, first } from './_helpers'

const makeupSlotsRoutes = new Hono<{ Variables: RBACVariables }>()

// ── Zod schemas ──

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

// ── GET /makeup-slots ──

makeupSlotsRoutes.get('/makeup-slots',
  requirePermission(Permission.ATTENDANCE_READ),
  zValidator('query', slotQuerySchema),
  async (c) => {
    const tenantId = c.get('user').tenant_id
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
          t.full_name as teacher_name,
          COALESCE(sc.current_students, 0)::int as current_students
        FROM manage_makeup_slots ms
        LEFT JOIN manage_teachers t ON ms.teacher_id = t.id
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int as current_students
          FROM manage_makeup_classes mc
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

// ── POST /makeup-slots ──

makeupSlotsRoutes.post('/makeup-slots',
  requirePermission(Permission.ATTENDANCE_WRITE),
  zValidator('json', createSlotSchema),
  async (c) => {
    const tenantId = c.get('user').tenant_id
    const body = c.req.valid('json')

    try {
      const result = await db.execute(sql`
        INSERT INTO manage_makeup_slots
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

// ── PUT /makeup-slots/:id ──

makeupSlotsRoutes.put('/makeup-slots/:id',
  requirePermission(Permission.ATTENDANCE_WRITE),
  zValidator('json', updateSlotSchema),
  async (c) => {
    const tenantId = c.get('user').tenant_id
    const id = c.req.param('id')
    const body = c.req.valid('json')

    try {
      // Build SET clauses dynamically
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
        UPDATE manage_makeup_slots
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

// ── DELETE /makeup-slots/:id ──

makeupSlotsRoutes.delete('/makeup-slots/:id',
  requirePermission(Permission.ATTENDANCE_WRITE),
  async (c) => {
    const tenantId = c.get('user').tenant_id
    const id = c.req.param('id')

    try {
      // Check for active makeup classes linked to this slot
      const cnt = first(await db.execute(sql`
        SELECT COUNT(*)::int as total
        FROM manage_makeup_classes
        WHERE slot_id = ${id} AND status != 'cancelled'
      `))

      if (Number(cnt?.total) > 0) {
        return badRequest(c, '此時段尚有學生，無法刪除')
      }

      const result = await db.execute(sql`
        DELETE FROM manage_makeup_slots
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

// ── GET /makeup-slots/:slotId/students ──

makeupSlotsRoutes.get('/makeup-slots/:slotId/students',
  requirePermission(Permission.ATTENDANCE_READ),
  async (c) => {
    const tenantId = c.get('user').tenant_id
    const slotId = c.req.param('slotId')

    try {
      // Verify slot belongs to tenant
      const slot = first(await db.execute(sql`
        SELECT id FROM manage_makeup_slots
        WHERE id = ${slotId} AND tenant_id = ${tenantId}
        LIMIT 1
      `))

      if (!slot) {
        return notFound(c, '找不到此補課時段')
      }

      const studentRows = await db.execute(sql`
        SELECT mc.id, s.full_name as student_name,
          mc.original_course_name, mc.status
        FROM manage_makeup_classes mc
        JOIN manage_students s ON mc.student_id = s.id
        WHERE mc.slot_id = ${slotId} AND mc.status != 'cancelled'
        ORDER BY s.full_name ASC
      `)

      return success(c, { students: rows(studentRows) })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

export { makeupSlotsRoutes }
