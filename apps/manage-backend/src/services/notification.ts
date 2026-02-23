/**
 * Notification Service
 * 處理 Telegram / LINE 發送、通知記錄、偏好設定
 */

import { eq, and } from 'drizzle-orm'
import { db } from '../db'
import { notifications, notificationPreferences, users } from '../db/schema'
import type { NotificationType, NotificationChannel, NotificationStatus } from '../db/schema'
import { sendLinePushMessage } from './line'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

/**
 * 發送 Telegram 訊息
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return { success: false, error: 'TELEGRAM_BOT_TOKEN is not configured' }
    }

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'Markdown'
        })
      }
    )

    const result = await response.json()

    if (!result.ok) {
      return { success: false, error: result.description }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * 建立通知記錄並發送
 */
export async function createAndSendNotification(params: {
  tenantId: string
  type: NotificationType
  recipientId: string
  studentId?: string
  title: string
  body: string
  channel: NotificationChannel
  metadata?: Record<string, any>
}): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  try {
    // 0. 僅允許同 tenant 的收件人
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.id, params.recipientId),
        eq(users.tenantId, params.tenantId)
      )
    })

    if (!user) {
      return { success: false, error: 'Recipient not found in tenant' }
    }

    // 1. 檢查用戶通知偏好
    const preference = await db.query.notificationPreferences.findFirst({
      where: and(
        eq(notificationPreferences.userId, params.recipientId),
        eq(notificationPreferences.type, params.type),
        eq(notificationPreferences.channel, params.channel)
      )
    })

    // 如果用戶明確關閉此類通知，則跳過
    if (preference && !preference.enabled) {
      console.log(`User ${params.recipientId} has disabled ${params.type} notifications`)
      
      // 建立 skipped 記錄
      const [notification] = await db.insert(notifications).values({
        tenantId: params.tenantId,
        type: params.type,
        recipientId: params.recipientId,
        studentId: params.studentId,
        title: params.title,
        body: params.body,
        channel: params.channel,
        status: 'skipped' as NotificationStatus,
        metadata: { ...params.metadata, skipped_reason: 'user_disabled' }
      }).returning()

      return { success: true, notificationId: notification.id }
    }

    // 2. 建立通知記錄 (pending)
    const [notification] = await db.insert(notifications).values({
      tenantId: params.tenantId,
      type: params.type,
      recipientId: params.recipientId,
      studentId: params.studentId,
      title: params.title,
      body: params.body,
      channel: params.channel,
      status: 'pending' as NotificationStatus,
      metadata: params.metadata || {}
    }).returning()

    // 3. 根據 channel 發送訊息
    let result: { success: boolean; error?: string }

    if (params.channel === 'telegram') {
      if (!user?.telegramId) {
        await db.update(notifications)
          .set({
            status: 'failed' as NotificationStatus,
            errorMessage: 'User has no telegram_id'
          })
          .where(eq(notifications.id, notification.id))

        return { success: false, notificationId: notification.id, error: 'User has no telegram_id' }
      }

      result = await sendTelegramMessage(
        user.telegramId,
        `*${params.title}*\n\n${params.body}`,
        params.metadata
      )
    } else if (params.channel === 'line') {
      if (!user?.lineUserId) {
        await db.update(notifications)
          .set({
            status: 'failed' as NotificationStatus,
            errorMessage: 'User has no line_user_id'
          })
          .where(eq(notifications.id, notification.id))

        return { success: false, notificationId: notification.id, error: 'User has no line_user_id' }
      }

      result = await sendLinePushMessage(
        user.lineUserId,
        [
          {
            type: 'text',
            text: `${params.title}\n\n${params.body}`
          }
        ]
      )
    } else {
      // email or other channels not implemented yet
      await db.update(notifications)
        .set({
          status: 'failed' as NotificationStatus,
          errorMessage: `Channel ${params.channel} not implemented`
        })
        .where(eq(notifications.id, notification.id))

      return { success: false, notificationId: notification.id, error: `Channel ${params.channel} not implemented` }
    }

    // 5. 更新狀態
    if (result.success) {
      await db.update(notifications)
        .set({
          status: 'sent' as NotificationStatus,
          sentAt: new Date()
        })
        .where(eq(notifications.id, notification.id))

      return { success: true, notificationId: notification.id }
    } else {
      await db.update(notifications)
        .set({
          status: 'failed' as NotificationStatus,
          errorMessage: result.error
        })
        .where(eq(notifications.id, notification.id))

      return { success: false, notificationId: notification.id, error: result.error }
    }
  } catch (error: any) {
    console.error('createAndSendNotification error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 批次發送通知
 */
export async function sendBulkNotifications(params: {
  tenantId: string
  type: NotificationType
  recipientIds: string[]
  studentId?: string
  title: string
  body: string
  channel: NotificationChannel
  metadata?: Record<string, any>
}): Promise<{
  success: boolean
  sentCount: number
  failedCount: number
  skippedCount: number
  notificationIds: string[]
  errors: Array<{ recipientId: string; error: string }>
}> {
  const results = {
    sentCount: 0,
    failedCount: 0,
    skippedCount: 0,
    notificationIds: [] as string[],
    errors: [] as Array<{ recipientId: string; error: string }>
  }

  // 循序發送，避免觸發 Telegram rate limit
  for (const recipientId of params.recipientIds) {
    const result = await createAndSendNotification({
      tenantId: params.tenantId,
      type: params.type,
      recipientId,
      studentId: params.studentId,
      title: params.title,
      body: params.body,
      channel: params.channel,
      metadata: params.metadata
    })

    if (result.notificationId) {
      results.notificationIds.push(result.notificationId)
    }

    if (result.success) {
      // 檢查是否為 skipped
      const notif = await db.query.notifications.findFirst({
        where: eq(notifications.id, result.notificationId!)
      })
      if (notif?.status === 'skipped') {
        results.skippedCount++
      } else {
        results.sentCount++
      }
    } else {
      results.failedCount++
      results.errors.push({ recipientId, error: result.error || 'Unknown error' })
    }

    // Rate limiting: 每秒最多 30 條，這裡保守一點每 100ms 發一條
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return {
    success: results.failedCount === 0,
    ...results
  }
}

/**
 * 取得用戶通知偏好
 */
export async function getUserNotificationPreferences(userId: string) {
  const prefs = await db.query.notificationPreferences.findMany({
    where: eq(notificationPreferences.userId, userId)
  })

  return prefs
}

/**
 * 更新用戶通知偏好
 */
export async function updateUserNotificationPreferences(
  userId: string,
  preferences: Array<{
    type: NotificationType
    channel: NotificationChannel
    enabled: boolean
  }>
) {
  const results = []

  for (const pref of preferences) {
    // 使用 upsert
    const existing = await db.query.notificationPreferences.findFirst({
      where: and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.type, pref.type),
        eq(notificationPreferences.channel, pref.channel)
      )
    })

    if (existing) {
      const [updated] = await db.update(notificationPreferences)
        .set({ enabled: pref.enabled })
        .where(eq(notificationPreferences.id, existing.id))
        .returning()
      results.push(updated)
    } else {
      const [created] = await db.insert(notificationPreferences).values({
        userId,
        type: pref.type,
        channel: pref.channel,
        enabled: pref.enabled
      }).returning()
      results.push(created)
    }
  }

  return results
}
