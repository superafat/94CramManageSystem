/**
 * Notification API Routes
 * 通知系統 API 端點
 * 
 * 修復項目：
 * 1. ✅ 增加 authMiddleware（大部分 route 缺失）
 * 2. ✅ 改善 Input Validation Schema
 * 3. ✅ 統一 API Response Format
 * 4. ✅ 增加 RBAC 權限檢查
 * 5. ✅ 防止 XSS（sanitize title/body）
 * 6. ✅ 增加 Rate Limiting 註解
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { sql } from 'drizzle-orm'
import { db } from '../db'
import { notifications, notificationPreferences } from '../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import {
  createAndSendNotification,
  sendBulkNotifications,
  getUserNotificationPreferences,
  updateUserNotificationPreferences
} from '../services/notification'
import {
  sendScheduleChangeNotification,
  sendBillingReminder,
  checkAndSendAttendanceAlert,
  sendGradeNotification
} from '../services/notification-scenarios'
import { authMiddleware } from '../middleware/auth'
import { requireRole, requirePermission, Role, Permission, type RBACVariables } from '../middleware/rbac'
import {
  uuidSchema,
  paginationSchema,
  notificationTypeSchema,
  notificationChannelSchema,
  sendNotificationSchema,
  sanitizeString,
} from '../utils/validation'
import {
  success,
  successWithPagination,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  internalError,
} from '../utils/response'
import type { NotificationType, NotificationChannel } from '../db/schema'

const app = new Hono<{ Variables: RBACVariables }>()

// ===== Default tenant for unauthenticated BeeClass routes =====
const DEFAULT_TENANT_ID = '11111111-1111-1111-1111-111111111111'

type NotificationTriggerResource = 'schedule' | 'invoice' | 'student' | 'grade'

async function getTriggerResourceTenantId(
  resource: NotificationTriggerResource,
  id: string
): Promise<string | null> {
  let result: unknown

  switch (resource) {
    case 'schedule':
      result = await db.execute(sql`SELECT tenant_id FROM schedules WHERE id = ${id} LIMIT 1`)
      break
    case 'invoice':
      result = await db.execute(sql`SELECT tenant_id FROM invoices WHERE id = ${id} LIMIT 1`)
      break
    case 'student':
      result = await db.execute(sql`SELECT tenant_id FROM students WHERE id = ${id} LIMIT 1`)
      break
    case 'grade':
      result = await db.execute(sql`SELECT tenant_id FROM grades WHERE id = ${id} LIMIT 1`)
      break
  }

  return (result as Array<{ tenant_id: string | null }>)[0]?.tenant_id ?? null
}

// ========== Admin Routes (require auth) ==========

/**
 * POST /api/admin/notifications/send
 * 手動發送通知（僅 admin/manager）
 * 
 * TODO: Add rate limiting - max 100 notifications per minute
 */
const adminSendNotificationSchema = z.object({
  type: notificationTypeSchema,
  recipientIds: z.array(uuidSchema).min(1, 'At least one recipient required').max(100, 'Max 100 recipients'),
  studentId: uuidSchema.optional(),
  title: z.string().min(1).max(255).transform(sanitizeString),
  body: z.string().min(1).max(2000).transform(sanitizeString),
  channel: notificationChannelSchema.default('telegram'),
  metadata: z.record(z.string(), z.any()).optional(),
})

app.post('/admin/notifications/send', 
  authMiddleware,
  requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('json', adminSendNotificationSchema), 
  async (c) => {
    try {
      const data = c.req.valid('json')
      const user = c.get('user')
      const tenantId = user.tenant_id

      const result = await sendBulkNotifications({
        tenantId,
        type: data.type,
        recipientIds: data.recipientIds,
        studentId: data.studentId,
        title: data.title,
        body: data.body,
        channel: data.channel,
        metadata: data.metadata
      })

      return success(c, {
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        skippedCount: result.skippedCount,
        notificationIds: result.notificationIds,
        errors: result.errors,
      })
    } catch (error: any) {
      console.error('Send notification error:', error)
      return internalError(c, error)
    }
  }
)

/**
 * GET /api/admin/notifications
 * 查看通知歷史（僅 admin/manager）
 */
const listNotificationsSchema = z.object({
  type: notificationTypeSchema.optional(),
  status: z.enum(['pending', 'sent', 'failed', 'skipped']).optional(),
  recipientId: uuidSchema.optional(),
  studentId: uuidSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

app.get('/admin/notifications',
  authMiddleware,
  requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('query', listNotificationsSchema),
  async (c) => {
    try {
      const query = c.req.valid('query')
      const user = c.get('user')
      const tenantId = user.tenant_id

      const page = query.page
      const limit = query.limit
      const offset = (page - 1) * limit

      // Build where conditions
      const conditions = [eq(notifications.tenantId, tenantId)]

      if (query.type) {
        conditions.push(eq(notifications.type, query.type))
      }
      if (query.status) {
        conditions.push(eq(notifications.status, query.status))
      }
      if (query.recipientId) {
        conditions.push(eq(notifications.recipientId, query.recipientId))
      }
      if (query.studentId) {
        conditions.push(eq(notifications.studentId, query.studentId))
      }

      // Fetch notifications with pagination
      const notifs = await db.query.notifications.findMany({
        where: conditions.length > 1 ? and(...conditions) : conditions[0],
        orderBy: [desc(notifications.createdAt)],
        limit,
        offset
      })

      // Get total count
      const countResult = await db.select({ count: sql<number>`COUNT(*)::int` })
        .from(notifications)
        .where(conditions.length > 1 ? and(...conditions) : conditions[0])

      const total = Number(countResult[0]?.count || 0)

      return successWithPagination(c, { notifications: notifs }, { page, limit, total })
    } catch (error: any) {
      console.error('List notifications error:', error)
      return internalError(c, error)
    }
  }
)

// ========== User Routes (require auth) ==========

/**
 * GET /api/notifications/preferences
 * 查詢當前用戶通知偏好
 */
app.get('/notifications/preferences', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    if (!user) {
      return unauthorized(c, 'Unauthorized')
    }

    const preferences = await getUserNotificationPreferences(user.id)

    return success(c, { preferences })
  } catch (error: any) {
    console.error('Get preferences error:', error)
    return internalError(c, error)
  }
})

/**
 * POST /api/notifications/preferences
 * 更新通知偏好
 */
const updatePreferencesSchema = z.object({
  preferences: z.array(z.object({
    type: notificationTypeSchema,
    channel: notificationChannelSchema,
    enabled: z.boolean(),
  })).min(1).max(20),
})

app.post('/notifications/preferences',
  authMiddleware,
  zValidator('json', updatePreferencesSchema),
  async (c) => {
    try {
      const user = c.get('user')
      if (!user) {
        return unauthorized(c, 'Unauthorized')
      }

      const data = c.req.valid('json')

      const updated = await updateUserNotificationPreferences(
        user.id,
        data.preferences as Array<{
          type: NotificationType
          channel: NotificationChannel
          enabled: boolean
        }>
      )

      return success(c, {
        updatedCount: updated.length,
        preferences: updated,
      })
    } catch (error: any) {
      console.error('Update preferences error:', error)
      return internalError(c, error)
    }
  }
)

// ========== Scenario Triggers (Admin only) ==========

/**
 * POST /api/admin/notifications/trigger/schedule-change
 * 觸發調課通知
 */
const scheduleChangeSchema = z.object({
  scheduleId: uuidSchema,
  originalTime: z.string().datetime().optional(),
  newTime: z.string().datetime().optional(),
  reason: z.string().max(200).transform(sanitizeString).optional(),
})

app.post('/admin/notifications/trigger/schedule-change',
  authMiddleware,
  requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('json', scheduleChangeSchema),
  async (c) => {
    try {
      const user = c.get('user')
      const data = c.req.valid('json')
      const resourceTenantId = await getTriggerResourceTenantId('schedule', data.scheduleId)

      if (!resourceTenantId) {
        return notFound(c, 'Schedule')
      }
      if (resourceTenantId !== user.tenant_id) {
        return forbidden(c, 'Cross-tenant access denied')
      }

      const result = await sendScheduleChangeNotification(data.scheduleId, {
        originalTime: data.originalTime ? new Date(data.originalTime) : undefined,
        newTime: data.newTime ? new Date(data.newTime) : undefined,
        reason: data.reason
      })

      return success(c, {
        sentCount: result.sentCount,
        error: result.error,
      })
    } catch (error: any) {
      console.error('Schedule change notification error:', error)
      return internalError(c, error)
    }
  }
)

/**
 * POST /api/admin/notifications/trigger/billing-reminder
 * 觸發繳費提醒
 */
const billingReminderSchema = z.object({
  invoiceId: uuidSchema,
})

app.post('/admin/notifications/trigger/billing-reminder',
  authMiddleware,
  requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('json', billingReminderSchema),
  async (c) => {
    try {
      const user = c.get('user')
      const data = c.req.valid('json')
      const resourceTenantId = await getTriggerResourceTenantId('invoice', data.invoiceId)

      if (!resourceTenantId) {
        return notFound(c, 'Invoice')
      }
      if (resourceTenantId !== user.tenant_id) {
        return forbidden(c, 'Cross-tenant access denied')
      }

      const result = await sendBillingReminder(data.invoiceId)

      return success(c, {
        sentCount: result.sentCount,
        error: result.error,
      })
    } catch (error: any) {
      console.error('Billing reminder error:', error)
      return internalError(c, error)
    }
  }
)

/**
 * POST /api/admin/notifications/trigger/attendance-alert
 * 觸發出席異常檢查
 */
const attendanceAlertSchema = z.object({
  studentId: uuidSchema,
})

app.post('/admin/notifications/trigger/attendance-alert',
  authMiddleware,
  requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('json', attendanceAlertSchema),
  async (c) => {
    try {
      const user = c.get('user')
      const data = c.req.valid('json')
      const resourceTenantId = await getTriggerResourceTenantId('student', data.studentId)

      if (!resourceTenantId) {
        return notFound(c, 'Student')
      }
      if (resourceTenantId !== user.tenant_id) {
        return forbidden(c, 'Cross-tenant access denied')
      }

      const result = await checkAndSendAttendanceAlert(data.studentId)

      return success(c, {
        sentCount: result.sentCount,
        alertSent: result.alertSent,
        error: result.error,
      })
    } catch (error: any) {
      console.error('Attendance alert error:', error)
      return internalError(c, error)
    }
  }
)

/**
 * POST /api/admin/notifications/trigger/grade
 * 觸發成績通知
 */
const gradeNotificationSchema = z.object({
  gradeId: uuidSchema,
})

app.post('/admin/notifications/trigger/grade',
  authMiddleware,
  requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('json', gradeNotificationSchema),
  async (c) => {
    try {
      const user = c.get('user')
      const data = c.req.valid('json')
      const resourceTenantId = await getTriggerResourceTenantId('grade', data.gradeId)

      if (!resourceTenantId) {
        return notFound(c, 'Grade')
      }
      if (resourceTenantId !== user.tenant_id) {
        return forbidden(c, 'Cross-tenant access denied')
      }

      const result = await sendGradeNotification(data.gradeId)

      return success(c, {
        sentCount: result.sentCount,
        error: result.error,
      })
    } catch (error: any) {
      console.error('Grade notification error:', error)
      return internalError(c, error)
    }
  }
)

// ========== BeeClass Integration (No auth required) ==========

/**
 * POST /api/notifications/beeclass
 * BeeClass 專用：直接發送通知
 * 
 * 安全措施：
 * - 應該在生產環境增加 API Key 驗證或 IP 白名單
 * - 目前使用固定的 tenantId
 */
const beeClassSchema = z.object({
  schoolId: uuidSchema,
  type: z.enum(['attendance', 'grade', 'payment', 'schedule']),
  studentName: z.string().max(50).optional(),
  parentLineId: z.string().max(100).optional(),
  parentTelegramId: z.string().max(100).optional(),
  title: z.string().min(1).max(255).transform(sanitizeString),
  body: z.string().min(1).max(2000).transform(sanitizeString),
  channel: z.enum(['line', 'telegram']).default('line'),
})

app.post('/notifications/beeclass', zValidator('json', beeClassSchema), async (c) => {
  try {
    const data = c.req.valid('json')
    
    // TODO: 驗證 schoolId 對應的 API Key
    // const apiKey = c.req.header('X-API-Key')
    // if (!validateApiKey(data.schoolId, apiKey)) {
    //   return forbidden(c, 'Invalid API key')
    // }
    
    const message = `【${data.title}】\n\n${data.body}`
    const recipientId = data.parentLineId || data.parentTelegramId
    
    if (!recipientId) {
      return badRequest(c, 'Either parentLineId or parentTelegramId is required')
    }
    
    let sendResult: { success: boolean; error?: string } = { success: false }
    
    // 發送 LINE
    if (data.channel === 'line' && data.parentLineId) {
      const lineAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
      if (!lineAccessToken) {
        console.error('[BeeClass Notify] LINE_CHANNEL_ACCESS_TOKEN not configured')
        return internalError(c, new Error('LINE channel not configured'))
      }
      
      const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lineAccessToken}`,
        },
        body: JSON.stringify({
          to: data.parentLineId,
          messages: [{ type: 'text', text: message }],
        }),
      })
      
      if (response.ok) {
        sendResult.success = true
      } else {
        sendResult.error = await response.text()
        console.error('[BeeClass Notify] LINE API error:', sendResult.error)
      }
    }
    
    // 發送 Telegram
    if (data.channel === 'telegram' && data.parentTelegramId) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      if (!botToken) {
        console.error('[BeeClass Notify] TELEGRAM_BOT_TOKEN not configured')
        return internalError(c, new Error('Telegram bot not configured'))
      }
      
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: data.parentTelegramId,
          text: message,
          parse_mode: 'HTML',
        }),
      })
      
      if (response.ok) {
        sendResult.success = true
      } else {
        sendResult.error = await response.text()
        console.error('[BeeClass Notify] Telegram API error:', sendResult.error)
      }
    }
    
    if (!sendResult.success) {
      return internalError(c, new Error(`Failed to send notification: ${sendResult.error || 'Unknown error'}`))
    }
    
    return success(c, {
      message: `Notification sent to ${recipientId}`,
      channel: data.channel,
    })
    
  } catch (error: any) {
    console.error('[BeeClass Notify] Unexpected error:', error)
    return internalError(c, error)
  }
})

export default app
