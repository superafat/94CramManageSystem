/**
 * LINE 事件處理器
 * 處理 LINE 渠道的通知事件
 */

import { eq, and } from 'drizzle-orm'
import { db } from '../../db'
import { notifications, notificationPreferences, users } from '../../db/schema'
import type { NotificationStatus } from '../../db/schema'
import type { NotificationEvent, EventHandler, EventHandlerResult } from '../types'
import { lineAdapter } from '../../adapters/line'

/**
 * LINE 事件處理器類
 */
class LineEventHandler implements EventHandler {
  name = 'LineEventHandler'
  supportedChannel = 'line' as const

  /**
   * 處理通知事件
   */
  async handle(event: NotificationEvent): Promise<EventHandlerResult> {
    const { tenantId, payload } = event
    const { recipientIds, studentId, title, body, metadata, notificationType } = payload

    const results = {
      success: true,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
      errors: [] as Array<{ recipientId: string; error: string }>
    }

    // 批次處理每個接收者
    for (const recipientId of recipientIds) {
      try {
        // 1. 檢查用戶通知偏好
        const preference = await db.query.notificationPreferences.findFirst({
          where: and(
            eq(notificationPreferences.userId, recipientId),
            eq(notificationPreferences.type, notificationType),
            eq(notificationPreferences.channel, 'line')
          )
        })

        // 2. 建立通知記錄
        let status: NotificationStatus = 'pending'
        let skipReason: string | undefined

        // 如果用戶明確關閉此類通知，則跳過
        if (preference && !preference.enabled) {
          status = 'skipped'
          skipReason = 'user_disabled'
          results.skippedCount++
        }

        const [notification] = await db.insert(notifications).values({
          tenantId,
          type: notificationType,
          recipientId,
          studentId,
          title,
          body,
          channel: 'line',
          status,
          metadata: { ...metadata, skipped_reason: skipReason }
        }).returning()

        // 3. 如果跳過，繼續下一個
        if (status === 'skipped') {
          continue
        }

        // 4. 查詢用戶的 line_user_id
        const user = await db.query.users.findFirst({
          where: and(
            eq(users.id, recipientId),
            eq(users.tenantId, tenantId)
          )
        })

        if (!user?.lineUserId) {
          await this.updateNotificationStatus(notification.id, tenantId, 'failed', 'User has no line_user_id')
          results.failedCount++
          results.errors.push({
            recipientId,
            error: 'User has no line_user_id'
          })
          continue
        }

        // 5. 發送訊息
        const lineMessage = lineAdapter.createTextMessage(title, body)
        const sendResult = await lineAdapter.sendPushMessage(
          user.lineUserId,
          [lineMessage]
        )

        // 6. 更新狀態
        if (sendResult.success) {
          await this.updateNotificationStatus(notification.id, tenantId, 'sent')
          results.sentCount++
        } else {
          await this.updateNotificationStatus(notification.id, tenantId, 'failed', sendResult.error)
          results.failedCount++
          results.errors.push({
            recipientId,
            error: sendResult.error || 'Unknown error'
          })
        }
      } catch (error) {
        console.error(`[LineHandler] Error processing recipient ${recipientId}:`, error)
        results.failedCount++
        results.errors.push({
          recipientId,
          error: error instanceof Error ? error.message : String(error)
        })
      }

      // Rate limiting: 保守一點每 100ms 發一條
      await new Promise(resolve => setTimeout(resolve, event.options?.batchIntervalMs || 100))
    }

    results.success = results.failedCount === 0

    return results
  }

  /**
   * 更新通知狀態
   */
  private async updateNotificationStatus(
    notificationId: string,
    tenantId: string,
    status: NotificationStatus,
    errorMessage?: string
  ): Promise<void> {
    const updateData: Partial<typeof notifications.$inferInsert> = { status }

    if (status === 'sent') {
      updateData.sentAt = new Date()
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage
    }

    await db.update(notifications)
      .set(updateData)
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.tenantId, tenantId)
        )
      )
  }
}

/**
 * 單例實例
 */
export const lineEventHandler = new LineEventHandler()
