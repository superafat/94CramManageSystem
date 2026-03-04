import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requirePermission, requireRole, Permission, Role, type RBACVariables } from '../../middleware/rbac'
import { uuidSchema } from '../../utils/validation'
import { sendGradeNotification, sendBillingReminder } from '../../services/notification-scenarios'
import { db, sql, logger, success, notFound, badRequest, internalError, rows, first } from './_helpers'

export const notificationRoutes = new Hono<{ Variables: RBACVariables }>()

// ========================================================================
// AI 課程推薦
// ========================================================================

const recommendationsQuerySchema = z.object({
  studentId: uuidSchema.optional(),
})

notificationRoutes.get('/recommendations', requirePermission(Permission.SCHEDULE_READ),
  zValidator('query', recommendationsQuerySchema),
  async (c) => {
    try {
      const query = c.req.valid('query')
      const user = c.get('user')
      if (!user?.tenant_id) {
        return badRequest(c, 'Missing tenant context')
      }

      // 1. 查詢學生名單（依 tenant，可選過濾單一學生）
      const studentConditions = [sql`s.tenant_id = ${user.tenant_id}`, sql`s.deleted_at IS NULL`]
      if (query.studentId) studentConditions.push(sql`s.id = ${query.studentId}`)
      const studentWhere = sql.join(studentConditions, sql` AND `)

      const studentsResult = await db.execute(sql`
        SELECT s.id, s.full_name
        FROM students s
        WHERE ${studentWhere}
        ORDER BY s.full_name
      `)
      const students = rows<{ id: string; full_name: string }>(studentsResult)

      if (students.length === 0) {
        return success(c, { recommendations: [] })
      }

      // 2. 查詢所有相關學生的各科平均成績
      const studentIds = students.map((s) => s.id)
      const gradesResult = await db.execute(sql`
        SELECT g.student_id, g.subject, AVG(g.score)::numeric as avg_score
        FROM grades g
        WHERE g.student_id = ANY(${studentIds}::uuid[])
        GROUP BY g.student_id, g.subject
      `)
      const gradeRows = rows<{ student_id: string; subject: string; avg_score: string }>(gradesResult)

      // 3. 找出弱科（平均 < 70）
      type WeakSubject = { subject: string; avg_score: number }
      const weakByStudent: Record<string, WeakSubject[]> = {}
      for (const g of gradeRows) {
        const avg = parseFloat(String(g.avg_score))
        if (avg < 70) {
          if (!weakByStudent[g.student_id]) weakByStudent[g.student_id] = []
          weakByStudent[g.student_id].push({ subject: g.subject, avg_score: Math.round(avg) })
        }
      }

      // 4. 查詢弱科對應的可用課程
      const allWeakSubjects = [...new Set(
        Object.values(weakByStudent).flat().map((w) => w.subject)
      )]

      type CourseRow = { id: string; name: string; subject: string }
      let availableCourses: CourseRow[] = []
      if (allWeakSubjects.length > 0) {
        const coursesResult = await db.execute(sql`
          SELECT c.id, c.name, c.subject
          FROM courses c
          WHERE c.tenant_id = ${user.tenant_id}
            AND c.status = 'active'
            AND c.subject = ANY(${allWeakSubjects}::text[])
          ORDER BY c.name
        `)
        availableCourses = rows<CourseRow>(coursesResult)
      }

      // 5. 組合推薦結果
      const recommendations = students
        .filter((s) => (weakByStudent[s.id] ?? []).length > 0)
        .map((s) => {
          const weakSubjects = weakByStudent[s.id] ?? []
          const recommendedCourses = weakSubjects.flatMap((w) => {
            const matchingCourses = availableCourses.filter((c) => c.subject === w.subject)
            return matchingCourses.map((c) => ({
              course_id: c.id,
              course_name: c.name,
              subject: w.subject,
              reason: `${w.subject}平均 ${w.avg_score} 分，建議加強`,
              priority: w.avg_score < 60 ? 'high' : w.avg_score < 65 ? 'medium' : 'low',
            }))
          })
          return {
            student_id: s.id,
            student_name: s.full_name,
            weak_subjects: weakSubjects,
            recommended_courses: recommendedCourses,
          }
        })
        .filter((r) => r.recommended_courses.length > 0)

      return success(c, { recommendations })
    } catch (error) {
      logger.error({ err: error }, 'Error fetching course recommendations:')
      return internalError(c, error)
    }
  }
)

// ========================================================================
// NOTIFY — 主動通知觸發端點
// ========================================================================

const gradePostedSchema = z.object({
  studentId: uuidSchema,
  gradeInfo: z.object({
    gradeId: uuidSchema.optional(),
    subject: z.string().max(50).optional(),
    examName: z.string().max(100).optional(),
    score: z.number().min(0).max(100).optional(),
  }),
})

// POST /api/w8/notify/grade-posted — 成績登錄後通知家長
notificationRoutes.post('/notify/grade-posted', requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('json', gradePostedSchema),
  async (c) => {
    try {
      const body = c.req.valid('json')

      // 如果提供了 gradeId，直接使用現有的 sendGradeNotification
      if (body.gradeInfo.gradeId) {
        const result = await sendGradeNotification(body.gradeInfo.gradeId)
        return success(c, {
          message: result.sentCount > 0 ? '成績通知已發送' : '無家長綁定，未發送通知',
          sentCount: result.sentCount,
          error: result.error,
        })
      }

      // 沒有 gradeId：查詢學生最新成績後發送
      const user = c.get('user')
      if (!user?.tenant_id) {
        return badRequest(c, 'Missing tenant context')
      }

      const latestGradeResult = await db.execute(sql`
        SELECT g.id FROM grades g
        JOIN students s ON g.student_id = s.id
        WHERE g.student_id = ${body.studentId}
          AND s.tenant_id = ${user.tenant_id}
        ORDER BY g.created_at DESC
        LIMIT 1
      `)

      const latestGrade = first(latestGradeResult)
      if (!latestGrade) {
        return notFound(c, '該學生的成績記錄')
      }

      const result = await sendGradeNotification(String(latestGrade.id))
      return success(c, {
        message: result.sentCount > 0 ? '成績通知已發送' : '無家長綁定，未發送通知',
        sentCount: result.sentCount,
        gradeId: latestGrade.id,
        error: result.error,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error sending grade notification:')
      return internalError(c, error)
    }
  }
)

const billingReminderSchema = z.object({
  dueDays: z.number().int().min(0).max(90).default(7),
  includeOverdue: z.boolean().default(true),
})

// POST /api/w8/notify/billing-reminder — 批次發送繳費提醒給逾期或即將到期的家長
notificationRoutes.post('/notify/billing-reminder', requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('json', billingReminderSchema),
  async (c) => {
    try {
      const body = c.req.valid('json')
      const user = c.get('user')
      if (!user?.tenant_id) {
        return badRequest(c, 'Missing tenant context')
      }

      // 查詢符合條件的帳單（未繳且到期日在 dueDays 天內，或已逾期）
      const invoicesResult = await db.execute(sql`
        SELECT i.id, i.student_id, s.full_name as student_name, i.amount, i.due_date, i.status
        FROM invoices i
        JOIN students s ON i.student_id = s.id
        WHERE s.tenant_id = ${user.tenant_id}
          AND i.status IN ('pending', ${body.includeOverdue ? sql`'overdue'` : sql`'pending'`})
          AND i.due_date <= (NOW() + INTERVAL '1 day' * ${body.dueDays})
          AND i.deleted_at IS NULL
        ORDER BY i.due_date ASC
      `)

      const invoices = rows<{ id: string; student_id: string; student_name: string; amount: number; due_date: string; status: string }>(invoicesResult)

      if (invoices.length === 0) {
        return success(c, {
          message: '沒有需要提醒的帳單',
          sentCount: 0,
          failedCount: 0,
          invoiceCount: 0,
        })
      }

      let sentCount = 0
      let failedCount = 0
      const details: Array<{ invoiceId: string; studentName: string; result: string }> = []

      for (const invoice of invoices) {
        const result = await sendBillingReminder(invoice.id)
        if (result.success) {
          sentCount += result.sentCount
          details.push({ invoiceId: invoice.id, studentName: invoice.student_name, result: result.sentCount > 0 ? '已發送' : '無家長綁定' })
        } else {
          failedCount++
          details.push({ invoiceId: invoice.id, studentName: invoice.student_name, result: `失敗：${result.error ?? '未知錯誤'}` })
        }
      }

      return success(c, {
        message: `繳費提醒完成，共發送 ${sentCount} 則通知`,
        invoiceCount: invoices.length,
        sentCount,
        failedCount,
        details,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error sending billing reminders:')
      return internalError(c, error)
    }
  }
)

// ========================================================================
// NOTIFICATIONS (電子聯絡簿)
// ========================================================================

const notificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  studentId: uuidSchema.optional(),
  type: z.enum(['grade_notification', 'attendance_alert', 'billing_reminder', 'schedule_change', 'all']).optional(),
})

// GET /api/w8/notifications - 查詢家長通知（聯絡簿）
notificationRoutes.get('/notifications', zValidator('query', notificationsQuerySchema), async (c) => {
  try {
    const query = c.req.valid('query')
    const user = c.get('user')
    if (!user?.tenant_id) {
      return badRequest(c, 'Missing tenant context')
    }

    const tenantId = user.tenant_id
    const limit = query.limit ?? 20

    type NotificationRow = {
      id: string
      type: string
      title: string
      message: string
      student_name: string
      created_at: unknown
      read: boolean
    }

    const notifications: NotificationRow[] = []

    // 1. 成績通知 — from grades table
    if (!query.type || query.type === 'all' || query.type === 'grade_notification') {
      const gradeConditions = [sql`g.tenant_id = ${tenantId}`]
      if (query.studentId) gradeConditions.push(sql`g.student_id = ${query.studentId}`)

      const gradeResult = await db.execute(sql`
        SELECT
          CONCAT('grade-', g.id::text) as id,
          'grade_notification' as type,
          CONCAT('新成績公布：', COALESCE(g.subject, ''), ' ', COALESCE(g.exam_type, g.exam_name, '測驗')) as title,
          CONCAT(s.full_name, ' ', COALESCE(g.exam_type, g.exam_name, '測驗'), '成績已公布，得分 ', g.score::text, ' / ', g.max_score::text) as message,
          s.full_name as student_name,
          g.created_at,
          false as read
        FROM manage_grades g
        JOIN students s ON g.student_id = s.id
        WHERE ${sql.join(gradeConditions, sql` AND `)}
        ORDER BY g.created_at DESC
        LIMIT ${Math.min(limit, 20)}
      `)
      notifications.push(...rows<NotificationRow>(gradeResult))
    }

    // 2. 出勤通知 — from attendance table
    if (!query.type || query.type === 'all' || query.type === 'attendance_alert') {
      const attConditions = [
        sql`a.tenant_id = ${tenantId}`,
        sql`a.date >= NOW() - INTERVAL '30 days'`,
      ]
      if (query.studentId) attConditions.push(sql`a.student_id = ${query.studentId}`)

      const attResult = await db.execute(sql`
        SELECT
          CONCAT('att-', a.id::text) as id,
          'attendance_alert' as type,
          CASE
            WHEN a.status = 'absent' THEN '出勤提醒：今日缺席'
            WHEN a.status = 'late' THEN '出勤提醒：今日遲到'
            ELSE '出勤提醒：今日已到校'
          END as title,
          CONCAT(s.full_name, ' ', TO_CHAR(a.date, 'MM/DD'), ' 出勤狀態：',
            CASE WHEN a.status = 'absent' THEN '缺席' WHEN a.status = 'late' THEN '遲到' ELSE '出席' END
          ) as message,
          s.full_name as student_name,
          a.created_at,
          false as read
        FROM manage_attendance a
        JOIN students s ON a.student_id = s.id
        WHERE ${sql.join(attConditions, sql` AND `)}
        ORDER BY a.created_at DESC
        LIMIT ${Math.min(limit, 20)}
      `)
      notifications.push(...rows<NotificationRow>(attResult))
    }

    // 3. 繳費通知 — from payment_records table
    if (!query.type || query.type === 'all' || query.type === 'billing_reminder') {
      const billConditions = [
        sql`pr.tenant_id = ${tenantId}`,
        sql`pr.created_at >= NOW() - INTERVAL '90 days'`,
      ]
      if (query.studentId) billConditions.push(sql`pr.student_id = ${query.studentId}`)

      const billResult = await db.execute(sql`
        SELECT
          CONCAT('bill-', pr.id::text) as id,
          'billing_reminder' as type,
          CASE
            WHEN pr.status = 'paid' THEN CONCAT('繳費通知：', COALESCE(c.name, '課程'), '學費已繳清')
            ELSE CONCAT('繳費提醒：', COALESCE(c.name, '課程'), '學費待繳')
          END as title,
          CONCAT(s.full_name, ' ', COALESCE(c.name, ''), ' ',
            COALESCE(pr.period_month::text, ''),
            CASE WHEN pr.status = 'paid' THEN CONCAT(' NT$', pr.amount::text, ' 已完成繳費') ELSE CONCAT(' NT$', pr.amount::text, ' 尚未繳費') END
          ) as message,
          s.full_name as student_name,
          pr.created_at,
          CASE WHEN pr.status = 'paid' THEN true ELSE false END as read
        FROM manage_payment_records pr
        JOIN students s ON pr.student_id = s.id
        LEFT JOIN courses c ON pr.course_id = c.id
        WHERE ${sql.join(billConditions, sql` AND `)}
        ORDER BY pr.created_at DESC
        LIMIT ${Math.min(limit, 20)}
      `)
      notifications.push(...rows<NotificationRow>(billResult))
    }

    // Sort all notifications by created_at desc, apply limit
    notifications.sort((a, b) => {
      const ta = a.created_at ? new Date(String(a.created_at)).getTime() : 0
      const tb = b.created_at ? new Date(String(b.created_at)).getTime() : 0
      return tb - ta
    })

    const result = notifications.slice(0, limit)
    const unread = result.filter((n) => !n.read).length

    return success(c, { notifications: result, unread })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching notifications:')
    return internalError(c, error)
  }
})
