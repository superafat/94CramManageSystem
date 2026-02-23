/**
 * W8 Routes: 講師排課 + 薪資系統
 * 
 * 修復項目：
 * 1. ✅ 增加 Input Validation (Zod)
 * 2. ✅ 增加 Authentication Middleware
 * 3. ✅ 統一 API Response Format
 * 4. ✅ 增加 RBAC 權限檢查
 * 5. ✅ 防止 SQL Injection (已使用 parameterized queries)
 * 6. ✅ 改善 Error Handling
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db'
import { sql } from 'drizzle-orm'
import { sendScheduleChangeNotifications } from '../services/notification-scenarios'
import { authMiddleware } from '../middleware/auth'
import { requirePermission, requireRole, Permission, Role, type RBACVariables } from '../middleware/rbac'
import {
  createTeacherSchema,
  updateTeacherSchema,
  createCourseSchema,
  createScheduleSchema,
  updateScheduleSchema,
  scheduleChangeSchema,
  salaryCalculateSchema,
  createSalaryRecordSchema,
  uuidSchema,
  paginationSchema,
  sanitizeString,
} from '../utils/validation'
import {
  success,
  successWithPagination,
  badRequest,
  notFound,
  conflict,
  internalError,
} from '../utils/response'

export const w8Routes = new Hono<{ Variables: RBACVariables }>()

// ===== Apply auth middleware to all routes =====
w8Routes.use('*', authMiddleware)

// Helper to convert result
const rows = <T = any>(result: any): T[] => Array.isArray(result) ? result : (result?.rows ?? [])
const first = <T = any>(result: any): T | undefined => rows<T>(result)[0]

// ========================================================================
// TEACHERS
// ========================================================================

// Query params schema for teachers list
const teacherQuerySchema = z.object({
  tenant_id: uuidSchema.optional(),
  branch_id: uuidSchema.optional(),
  status: z.enum(['active', 'inactive', 'resigned']).optional(),
})

w8Routes.get('/teachers', requirePermission(Permission.SCHEDULE_READ), zValidator('query', teacherQuerySchema), async (c) => {
  try {
    const query = c.req.valid('query')
    const user = c.get('user')
    if (!user?.tenant_id && !query.tenant_id) {
      return badRequest(c, 'Missing tenant context')
    }
    const conditions = [sql`1=1`]
    // 優先使用 user 的 tenant_id，避免 query 覆寫造成跨租戶讀取
    conditions.push(sql`t.tenant_id = ${user?.tenant_id ?? query.tenant_id}`)
    if (query.branch_id) conditions.push(sql`t.branch_id = ${query.branch_id}`)
    if (query.status) conditions.push(sql`t.status = ${query.status}`)
    
    const where = sql.join(conditions, sql` AND `)
    
    const result = await db.execute(sql`
      SELECT t.*, u.username, u.email
      FROM teachers t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE ${where}
      ORDER BY t.name
    `)
    
    return success(c, { teachers: rows(result) })
  } catch (error: any) {
    console.error('Error fetching teachers:', error)
    return internalError(c, error)
  }
})

w8Routes.get('/teachers/:id', requirePermission(Permission.SCHEDULE_READ), zValidator('param', z.object({ id: uuidSchema })), async (c) => {
  try {
    const { id } = c.req.valid('param')
    const result = await db.execute(sql`
      SELECT t.*, u.username, u.email
      FROM teachers t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = ${id}
    `)
    
    const teacher = first(result)
    if (!teacher) {
      return notFound(c, 'Teacher')
    }
    
    return success(c, { teacher })
  } catch (error: any) {
    console.error('Error fetching teacher:', error)
    return internalError(c, error)
  }
})

w8Routes.post('/teachers', requireRole(Role.ADMIN, Role.MANAGER), zValidator('json', createTeacherSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const user = c.get('user')
    
    const result = await db.execute(sql`
      INSERT INTO teachers (user_id, tenant_id, branch_id, name, title, phone, rate_per_class)
      VALUES (${body.userId || null}, ${user?.tenant_id ?? body.tenantId}, ${body.branchId}, 
              ${sanitizeString(body.name)}, ${sanitizeString(body.title)}, ${body.phone || null}, ${body.ratePerClass})
      RETURNING *
    `)
    
    return success(c, { teacher: first(result) }, 201)
  } catch (error: any) {
    console.error('Error creating teacher:', error)
    if (error.code === '23505') {
      return conflict(c, 'Teacher already exists')
    }
    return internalError(c, error)
  }
})

w8Routes.put('/teachers/:id', requireRole(Role.ADMIN, Role.MANAGER), 
  zValidator('param', z.object({ id: uuidSchema })),
  zValidator('json', updateTeacherSchema), 
  async (c) => {
    try {
      const { id } = c.req.valid('param')
      const body = c.req.valid('json')
      
      const result = await db.execute(sql`
        UPDATE teachers
        SET name = COALESCE(${body.name != null ? sanitizeString(body.name) : null}, name),
            title = COALESCE(${body.title != null ? sanitizeString(body.title) : null}, title),
            phone = COALESCE(${body.phone ?? null}, phone),
            rate_per_class = COALESCE(${body.ratePerClass ?? null}, rate_per_class),
            status = COALESCE(${body.status ?? null}, status),
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `)
      
      const teacher = first(result)
      if (!teacher) {
        return notFound(c, 'Teacher')
      }
      
      return success(c, { teacher })
    } catch (error: any) {
      console.error('Error updating teacher:', error)
      return internalError(c, error)
    }
  }
)

w8Routes.delete('/teachers/:id', requireRole(Role.ADMIN), zValidator('param', z.object({ id: uuidSchema })), async (c) => {
  try {
    const { id } = c.req.valid('param')
    
    // Soft delete
    const result = await db.execute(sql`
      UPDATE teachers SET deleted_at = NOW(), status = 'resigned' 
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING *
    `)
    
    const teacher = first(result)
    if (!teacher) {
      return notFound(c, 'Teacher')
    }
    
    return success(c, { message: 'Teacher deleted', teacher })
  } catch (error: any) {
    console.error('Error deleting teacher:', error)
    return internalError(c, error)
  }
})

// ========================================================================
// COURSES
// ========================================================================

const courseQuerySchema = z.object({
  tenant_id: uuidSchema.optional(),
  branch_id: uuidSchema.optional(),
  subject: z.string().max(30).optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
})

w8Routes.get('/courses', requirePermission(Permission.SCHEDULE_READ), zValidator('query', courseQuerySchema), async (c) => {
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
  } catch (error: any) {
    console.error('Error fetching courses:', error)
    return internalError(c, error)
  }
})

w8Routes.get('/courses/:id', requirePermission(Permission.SCHEDULE_READ), zValidator('param', z.object({ id: uuidSchema })), async (c) => {
  try {
    const { id } = c.req.valid('param')
    
    const courseResult = await db.execute(sql`SELECT * FROM courses WHERE id = ${id}`)
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
  } catch (error: any) {
    console.error('Error fetching course:', error)
    return internalError(c, error)
  }
})

w8Routes.post('/courses', requirePermission(Permission.SCHEDULE_WRITE), zValidator('json', createCourseSchema), async (c) => {
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
  } catch (error: any) {
    console.error('Error creating course:', error)
    return internalError(c, error)
  }
})

// ========================================================================
// SCHEDULES
// ========================================================================

const scheduleQuerySchema = z.object({
  teacher_id: uuidSchema.optional(),
  course_id: uuidSchema.optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']).optional(),
})

w8Routes.get('/schedules', requirePermission(Permission.SCHEDULE_READ), zValidator('query', scheduleQuerySchema), async (c) => {
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
        c.name as course_name, c.subject,
        t.name as teacher_name, t.title as teacher_title, t.rate_per_class
      FROM schedules s
      JOIN courses c ON s.course_id = c.id
      LEFT JOIN teachers t ON s.teacher_id = t.id
      WHERE ${where}
      ORDER BY s.scheduled_date, s.start_time
    `)
    
    return success(c, { schedules: rows(result) })
  } catch (error: any) {
    console.error('Error fetching schedules:', error)
    return internalError(c, error)
  }
})

w8Routes.get('/schedules/:id', requirePermission(Permission.SCHEDULE_READ), zValidator('param', z.object({ id: uuidSchema })), async (c) => {
  try {
    const { id } = c.req.valid('param')
    
    const scheduleResult = await db.execute(sql`
      SELECT s.*,
        c.name as course_name, c.subject, c.duration_minutes,
        t.name as teacher_name, t.title as teacher_title, t.rate_per_class
      FROM schedules s
      JOIN courses c ON s.course_id = c.id
      LEFT JOIN teachers t ON s.teacher_id = t.id
      WHERE s.id = ${id}
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
        students: rows(studentsResult).map((s: any) => ({ id: s.id, full_name: s.full_name, grade_level: s.grade_level })),
      },
    })
  } catch (error: any) {
    console.error('Error fetching schedule:', error)
    return internalError(c, error)
  }
})

w8Routes.post('/schedules', requirePermission(Permission.SCHEDULE_WRITE), zValidator('json', createScheduleSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    
    const result = await db.execute(sql`
      INSERT INTO schedules (course_id, teacher_id, scheduled_date, start_time, end_time, notes)
      VALUES (${body.courseId}, ${body.teacherId || null}, ${body.scheduledDate}::date, 
              ${body.startTime}::time, ${body.endTime}::time, ${body.notes ? sanitizeString(body.notes) : null})
      RETURNING *
    `)
    
    return success(c, { schedule: first(result) }, 201)
  } catch (error: any) {
    console.error('Error creating schedule:', error)
    if (error.code === '23503') {
      return badRequest(c, 'Course or Teacher not found')
    }
    return internalError(c, error)
  }
})

w8Routes.put('/schedules/:id', requirePermission(Permission.SCHEDULE_WRITE),
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
    } catch (error: any) {
      console.error('Error updating schedule:', error)
      return internalError(c, error)
    }
  }
)

// POST /api/w8/schedules/:id/change - 調課 (取消或改期)
w8Routes.post('/schedules/:id/change', requirePermission(Permission.SCHEDULE_WRITE),
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
          course_name: schedule.course_name,
          teacher_name: schedule.teacher_name,
          original_date: schedule.scheduled_date,
          original_time: `${schedule.start_time}-${schedule.end_time ?? ''}`,
          new_date: body.newDate,
          new_time: body.newTime,
          reason: body.reason,
        }
        
        const recipients = affected.map((a: any) => ({
          student_name: a.student_name,
          parent_telegram_id: a.parent_telegram_id,
          parent_email: a.parent_email,
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
    } catch (error: any) {
      console.error('Error changing schedule:', error)
      return internalError(c, error)
    }
  }
)

// ========================================================================
// SALARY
// ========================================================================

// GET /api/w8/salary/calculate - 計算薪資預覽
w8Routes.get('/salary/calculate', requireRole(Role.ADMIN, Role.MANAGER), 
  zValidator('query', salaryCalculateSchema),
  async (c) => {
    try {
      const query = c.req.valid('query')
      
      const conditions = [
        sql`s.scheduled_date >= ${query.startDate}::date`,
        sql`s.scheduled_date <= ${query.endDate}::date`,
        sql`s.status IN ('scheduled', 'completed')`,
      ]
      if (query.teacherId) {
        conditions.push(sql`t.id = ${query.teacherId}`)
      }
      
      const where = sql.join(conditions, sql` AND `)
      
      const result = await db.execute(sql`
        SELECT 
          t.id as teacher_id,
          t.name as teacher_name,
          t.title,
          t.rate_per_class,
          COUNT(s.id)::int as total_classes,
          (COUNT(s.id) * t.rate_per_class)::numeric as total_amount
        FROM teachers t
        LEFT JOIN schedules s ON t.id = s.teacher_id AND ${where}
        LEFT JOIN courses c ON s.course_id = c.id
        WHERE t.deleted_at IS NULL
        GROUP BY t.id, t.name, t.title, t.rate_per_class
        ORDER BY t.name
      `)
      
      const teachers = rows(result)
      
      return success(c, {
        period: { start: query.startDate, end: query.endDate },
        teachers,
        grandTotalClasses: teachers.reduce((sum: number, r: any) => sum + (r.total_classes || 0), 0),
        grandTotalAmount: teachers.reduce((sum: number, r: any) => sum + parseFloat(r.total_amount || 0), 0),
      })
    } catch (error: any) {
      console.error('Error calculating salary:', error)
      return internalError(c, error)
    }
  }
)

// POST /api/w8/salary/records - 建立薪資結算紀錄
w8Routes.post('/salary/records', requireRole(Role.ADMIN), zValidator('json', createSalaryRecordSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    
    // Check existing
    const existingResult = await db.execute(sql`
      SELECT id FROM salary_records
      WHERE teacher_id = ${body.teacherId} 
        AND period_start = ${body.periodStart}::date 
        AND period_end = ${body.periodEnd}::date
    `)
    
    if (rows(existingResult).length > 0) {
      return conflict(c, 'Salary record already exists for this period')
    }
    
    // Calculate
    const calcResult = await db.execute(sql`
      SELECT 
        t.rate_per_class,
        COUNT(s.id)::int as total_classes
      FROM teachers t
      LEFT JOIN schedules s ON t.id = s.teacher_id
        AND s.scheduled_date >= ${body.periodStart}::date
        AND s.scheduled_date <= ${body.periodEnd}::date
        AND s.status IN ('scheduled', 'completed')
      WHERE t.id = ${body.teacherId}
      GROUP BY t.id, t.rate_per_class
    `)
    
    const calc = first(calcResult)
    if (!calc) {
      return notFound(c, 'Teacher')
    }
    
    const totalAmount = parseFloat(calc.rate_per_class) * calc.total_classes
    
    const insertResult = await db.execute(sql`
      INSERT INTO salary_records (teacher_id, period_start, period_end, total_classes, rate_per_class, total_amount)
      VALUES (${body.teacherId}, ${body.periodStart}::date, ${body.periodEnd}::date, 
              ${calc.total_classes}, ${calc.rate_per_class}, ${totalAmount})
      RETURNING *
    `)
    
    return success(c, { record: first(insertResult) }, 201)
  } catch (error: any) {
    console.error('Error creating salary record:', error)
    return internalError(c, error)
  }
})

// GET /api/w8/salary/records - 列出薪資紀錄
const salaryRecordsQuerySchema = z.object({
  teacher_id: uuidSchema.optional(),
  status: z.enum(['pending', 'confirmed', 'paid']).optional(),
})

w8Routes.get('/salary/records', requireRole(Role.ADMIN, Role.MANAGER), 
  zValidator('query', salaryRecordsQuerySchema),
  async (c) => {
    try {
      const query = c.req.valid('query')
      
      const conditions = [sql`1=1`]
      if (query.teacher_id) conditions.push(sql`sr.teacher_id = ${query.teacher_id}`)
      if (query.status) conditions.push(sql`sr.status = ${query.status}`)
      
      const where = sql.join(conditions, sql` AND `)
      
      const result = await db.execute(sql`
        SELECT sr.*, t.name as teacher_name, t.title
        FROM salary_records sr
        JOIN teachers t ON sr.teacher_id = t.id
        WHERE ${where}
        ORDER BY sr.period_start DESC, t.name
      `)
      
      return success(c, { records: rows(result) })
    } catch (error: any) {
      console.error('Error fetching salary records:', error)
      return internalError(c, error)
    }
  }
)

// PUT /api/w8/salary/records/:id/confirm
w8Routes.put('/salary/records/:id/confirm', requireRole(Role.ADMIN), 
  zValidator('param', z.object({ id: uuidSchema })),
  async (c) => {
    try {
      const { id } = c.req.valid('param')
      
      const result = await db.execute(sql`
        UPDATE salary_records
        SET status = 'confirmed', confirmed_at = NOW()
        WHERE id = ${id} AND status = 'pending'
        RETURNING *
      `)
      
      const record = first(result)
      if (!record) {
        return badRequest(c, 'Record not found or already confirmed')
      }
      
      return success(c, { record })
    } catch (error: any) {
      console.error('Error confirming salary:', error)
      return internalError(c, error)
    }
  }
)

// PUT /api/w8/salary/records/:id/pay
w8Routes.put('/salary/records/:id/pay', requireRole(Role.ADMIN),
  zValidator('param', z.object({ id: uuidSchema })),
  async (c) => {
    try {
      const { id } = c.req.valid('param')
      
      const result = await db.execute(sql`
        UPDATE salary_records
        SET status = 'paid', paid_at = NOW()
        WHERE id = ${id} AND status = 'confirmed'
        RETURNING *
      `)
      
      const record = first(result)
      if (!record) {
        return badRequest(c, 'Record not found or not confirmed yet')
      }
      
      return success(c, { record })
    } catch (error: any) {
      console.error('Error marking salary as paid:', error)
      return internalError(c, error)
    }
  }
)
