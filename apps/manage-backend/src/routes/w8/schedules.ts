import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requirePermission, Permission, type RBACVariables } from '../../middleware/rbac'
import {
  createScheduleSchema,
  updateScheduleSchema,
  scheduleChangeSchema,
  uuidSchema,
  sanitizeString,
} from '../../utils/validation'
import { sendScheduleChangeNotifications } from '../../services/notification-scenarios'
import { db, sql, logger, success, notFound, badRequest, internalError, rows, first } from './_helpers'

export const scheduleRoutes = new Hono<{ Variables: RBACVariables }>()

const scheduleQuerySchema = z.object({
  teacher_id: uuidSchema.optional(),
  course_id: uuidSchema.optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']).optional(),
})

scheduleRoutes.get('/schedules', requirePermission(Permission.SCHEDULE_READ), zValidator('query', scheduleQuerySchema), async (c) => {
  try {
    const query = c.req.valid('query')
    const user = c.get('user')
    if (!user?.tenant_id) {
      return badRequest(c, 'Missing tenant context')
    }

    const conditions = [sql`1=1`]
    conditions.push(sql`c.tenant_id = ${user.tenant_id}`)
    if (query.teacher_id) conditions.push(sql`s.teacher_id = ${query.teacher_id}`)
    if (query.course_id) conditions.push(sql`s.course_id = ${query.course_id}`)
    if (query.start_date) conditions.push(sql`s.scheduled_date >= ${query.start_date}::date`)
    if (query.end_date) conditions.push(sql`s.scheduled_date <= ${query.end_date}::date`)
    if (query.status) conditions.push(sql`s.status = ${query.status}`)

    const where = sql.join(conditions, sql` AND `)

    const result = await db.execute(sql`
      SELECT s.*,
        c.name as course_name, c.subject, c.course_type,
        t.name as teacher_name, t.title as teacher_title, t.rate_per_class,
        ms.full_name as student_name
      FROM schedules s
      JOIN courses c ON s.course_id = c.id
      LEFT JOIN teachers t ON s.teacher_id = t.id
      LEFT JOIN manage_enrollments me ON me.course_id = s.course_id AND me.status = 'active' AND me.deleted_at IS NULL
      LEFT JOIN manage_students ms ON ms.id = me.student_id
      WHERE ${where}
      ORDER BY s.scheduled_date, s.start_time
    `)

    return success(c, { schedules: rows(result) })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching schedules:')
    return internalError(c, error)
  }
})

scheduleRoutes.get('/schedules/:id', requirePermission(Permission.SCHEDULE_READ), zValidator('param', z.object({ id: uuidSchema })), async (c) => {
  try {
    const { id } = c.req.valid('param')

    const user = c.get('user')
    const scheduleResult = await db.execute(sql`
      SELECT s.*,
        c.name as course_name, c.subject, c.duration_minutes,
        t.name as teacher_name, t.title as teacher_title, t.rate_per_class
      FROM schedules s
      JOIN courses c ON s.course_id = c.id
      LEFT JOIN teachers t ON s.teacher_id = t.id
      WHERE s.id = ${id} AND s.tenant_id = ${user?.tenant_id}
    `)

    const schedule = first(scheduleResult)
    if (!schedule) {
      return notFound(c, 'Schedule')
    }

    const studentsResult = await db.execute(sql`
      SELECT st.id, st.full_name, st.grade_level
      FROM course_enrollments ce
      JOIN students st ON ce.student_id = st.id
      WHERE ce.course_id = ${schedule.course_id} AND ce.status = 'active'
      ORDER BY st.full_name
    `)

    return success(c, {
      schedule: {
        ...schedule,
        // Only include safe fields to reduce XSS risk
        students: rows(studentsResult).map((s) => ({ id: s.id, full_name: s.full_name, grade_level: s.grade_level })),
      },
    })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching schedule:')
    return internalError(c, error)
  }
})

scheduleRoutes.post('/schedules', requirePermission(Permission.SCHEDULE_WRITE), zValidator('json', createScheduleSchema), async (c) => {
  try {
    const body = c.req.valid('json')

    const result = await db.execute(sql`
      INSERT INTO schedules (course_id, teacher_id, scheduled_date, start_time, end_time, notes)
      VALUES (${body.courseId}, ${body.teacherId || null}, ${body.scheduledDate}::date,
              ${body.startTime}::time, ${body.endTime}::time, ${body.notes ? sanitizeString(body.notes) : null})
      RETURNING *
    `)

    return success(c, { schedule: first(result) }, 201)
  } catch (error) {
    logger.error({ err: error }, 'Error creating schedule:')
    if (error instanceof Error && (error as Error & { code?: string }).code === '23503') {
      return badRequest(c, 'Course or Teacher not found')
    }
    return internalError(c, error)
  }
})

scheduleRoutes.put('/schedules/:id', requirePermission(Permission.SCHEDULE_WRITE),
  zValidator('param', z.object({ id: uuidSchema })),
  zValidator('json', updateScheduleSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param')
      const body = c.req.valid('json')

      const result = await db.execute(sql`
        UPDATE schedules
        SET teacher_id = COALESCE(${body.teacherId ?? null}, teacher_id),
            scheduled_date = COALESCE(${body.scheduledDate ?? null}::date, scheduled_date),
            start_time = COALESCE(${body.startTime ?? null}::time, start_time),
            end_time = COALESCE(${body.endTime ?? null}::time, end_time),
            status = COALESCE(${body.status ?? null}, status),
            notes = COALESCE(${body.notes != null ? sanitizeString(body.notes) : null}, notes),
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `)

      const schedule = first(result)
      if (!schedule) {
        return notFound(c, 'Schedule')
      }

      return success(c, { schedule })
    } catch (error) {
      logger.error({ err: error }, 'Error updating schedule:')
      return internalError(c, error)
    }
  }
)

// POST /api/w8/schedules/:id/change - 調課 (取消或改期)
scheduleRoutes.post('/schedules/:id/change', requirePermission(Permission.SCHEDULE_WRITE),
  zValidator('param', z.object({ id: uuidSchema })),
  zValidator('json', scheduleChangeSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param')
      const body = c.req.valid('json')
      const user = c.get('user')

      // Get original schedule
      const scheduleResult = await db.execute(sql`
        SELECT s.*, c.name as course_name, t.name as teacher_name
        FROM schedules s
        JOIN courses c ON s.course_id = c.id
        LEFT JOIN teachers t ON s.teacher_id = t.id
        WHERE s.id = ${id}
      `)

      const schedule = first(scheduleResult)
      if (!schedule) {
        return notFound(c, 'Schedule')
      }

      // Record change
      await db.execute(sql`
        INSERT INTO schedule_changes
          (schedule_id, change_type, original_date, original_time, new_date, new_time, reason, changed_by)
        VALUES (${id}, ${body.changeType}, ${schedule.scheduled_date}, ${schedule.start_time},
          ${body.newDate || null}, ${body.newTime || null}, ${body.reason ? sanitizeString(body.reason) : null}, ${body.changedBy || user.id})
      `)

      // Update schedule
      if (body.changeType === 'cancel') {
        await db.execute(sql`
          UPDATE schedules SET status = 'cancelled', updated_at = NOW() WHERE id = ${id}
        `)
      } else {
        const match = body.newTime?.match(/^(\d{2}:\d{2})(?:-(\d{2}:\d{2}))?$/)
        if (!match) {
          return badRequest(c, 'Invalid newTime format')
        }
        const startTime = match[1]
        const endTime = match[2] || null
        await db.execute(sql`
          UPDATE schedules
          SET scheduled_date = ${body.newDate}::date,
              start_time = ${startTime}::time,
              end_time = COALESCE(${endTime}::time, end_time),
              status = 'rescheduled',
              updated_at = NOW()
          WHERE id = ${id}
        `)
      }

      // Get affected students/parents with telegram_id
      const affectedResult = await db.execute(sql`
        SELECT DISTINCT
          st.id as student_id,
          st.full_name as student_name,
          u.id as parent_id,
          u.email as parent_email,
          u.telegram_id as parent_telegram_id
        FROM course_enrollments ce
        JOIN students st ON ce.student_id = st.id
        LEFT JOIN parent_students ps ON st.id = ps.student_id
        LEFT JOIN users u ON ps.parent_id = u.id
        WHERE ce.course_id = ${schedule.course_id} AND ce.status = 'active'
      `)

      const affected = rows(affectedResult)

      // 發送 Telegram 通知
      let notificationResult = null
      if (affected.length > 0) {
        const payload = {
          change_type: body.changeType as 'cancel' | 'reschedule',
          course_name: String(schedule.course_name),
          teacher_name: String(schedule.teacher_name),
          original_date: String(schedule.scheduled_date),
          original_time: `${schedule.start_time}-${schedule.end_time ?? ''}`,
          new_date: body.newDate,
          new_time: body.newTime,
          reason: body.reason,
        }

        const recipients = affected.map((a) => ({
          student_name: String(a.student_name),
          parent_telegram_id: a.parent_telegram_id != null ? String(a.parent_telegram_id) : undefined,
          parent_email: a.parent_email != null ? String(a.parent_email) : undefined,
        }))

        notificationResult = await sendScheduleChangeNotifications(payload, recipients)

        // 更新 schedule_changes 的 notified_at
        if (notificationResult.sent > 0) {
          await db.execute(sql`
            UPDATE schedule_changes
            SET notified_at = NOW()
            WHERE id = (
              SELECT id FROM schedule_changes
              WHERE schedule_id = ${id}
              ORDER BY created_at DESC
              LIMIT 1
            )
          `)
        }
      }

      return success(c, {
        message: body.changeType === 'cancel' ? '課程已取消' : '課程已改期',
        scheduleId: id,
        changeType: body.changeType,
        courseName: schedule.course_name,
        teacherName: schedule.teacher_name,
        original: {
          date: schedule.scheduled_date,
          time: `${schedule.start_time}-${schedule.end_time}`,
        },
        new: body.changeType === 'reschedule' ? { date: body.newDate, time: body.newTime } : null,
        affectedStudents: affected,
        notification: notificationResult,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error changing schedule:')
      return internalError(c, error)
    }
  }
)
