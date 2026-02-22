/**
 * 事件工具函數
 * 提供便捷的事件構建和發送函數
 */

import type {
  NotificationEvent,
  NotificationEventType,
  NotificationEventPayload,
  EventPriority
} from './types'
import type { NotificationChannel, NotificationType } from '../db/schema'
import { emitNotification } from './event-bus'

/**
 * 創建通知事件參數
 */
export interface CreateNotificationEventParams {
  /** 事件類型 */
  eventType: NotificationEventType
  
  /** 租戶 ID */
  tenantId: string
  
  /** 接收者 ID 列表 */
  recipientIds: string[]
  
  /** 學生 ID（可選） */
  studentId?: string
  
  /** 通知標題 */
  title: string
  
  /** 通知內容 */
  body: string
  
  /** 發送渠道 */
  channels: NotificationChannel[]
  
  /** 通知類型（用於記錄） */
  notificationType: NotificationType
  
  /** 額外元數據 */
  metadata?: Record<string, any>
  
  /** 優先級 */
  priority?: EventPriority
  
  /** 批次發送間隔（毫秒） */
  batchIntervalMs?: number
}

/**
 * 創建通知事件
 */
export function createNotificationEvent(
  params: CreateNotificationEventParams
): NotificationEvent {
  const {
    eventType,
    tenantId,
    recipientIds,
    studentId,
    title,
    body,
    channels,
    notificationType,
    metadata,
    priority = 'normal',
    batchIntervalMs = 100
  } = params

  return {
    type: eventType,
    tenantId,
    timestamp: new Date(),
    payload: {
      recipientIds,
      studentId,
      title,
      body,
      channels,
      notificationType,
      metadata
    },
    options: {
      priority,
      retryOnFailure: true,
      maxRetries: 3,
      batchIntervalMs
    }
  }
}

/**
 * 便捷函數：發送調課通知事件
 */
export async function emitScheduleChangeEvent(params: {
  tenantId: string
  recipientIds: string[]
  studentId?: string
  courseName: string
  teacherName?: string
  originalTime: string
  newTime: string
  reason?: string
  channels?: NotificationChannel[]
}) {
  const { tenantId, recipientIds, studentId, courseName, teacherName, originalTime, newTime, reason, channels = ['telegram'] } = params

  const title = '📅 課程異動通知'
  const body = `您好，以下課程有異動：

**課程**：${courseName}
**原時間**：${originalTime}
**新時間**：${newTime}
**老師**：${teacherName || '待定'}${reason ? `\n**原因**：${reason}` : ''}

如有問題請聯繫櫃台，謝謝！`.trim()

  const event = createNotificationEvent({
    eventType: 'schedule.changed',
    tenantId,
    recipientIds,
    studentId,
    title,
    body,
    channels,
    notificationType: 'schedule_change',
    metadata: {
      course_name: courseName,
      teacher_name: teacherName,
      original_time: originalTime,
      new_time: newTime,
      reason
    }
  })

  return emitNotification(event)
}

/**
 * 便捷函數：發送繳費提醒事件
 */
export async function emitBillingReminderEvent(params: {
  tenantId: string
  recipientIds: string[]
  studentId: string
  studentName: string
  amount: number
  dueDate: string
  daysUntilDue: number
  channels?: NotificationChannel[]
}) {
  const { tenantId, recipientIds, studentId, studentName, amount, dueDate, daysUntilDue, channels = ['telegram'] } = params

  const title = '💰 繳費提醒'
  const body = `您好，以下帳單即將到期：

**學生**：${studentName}
**金額**：NT$ ${amount.toLocaleString()}
**到期日**：${dueDate} (剩餘 ${daysUntilDue} 天)

請盡快完成繳費，謝謝！`.trim()

  const event = createNotificationEvent({
    eventType: 'billing.reminder',
    tenantId,
    recipientIds,
    studentId,
    title,
    body,
    channels,
    notificationType: 'billing_reminder',
    metadata: {
      amount,
      due_date: dueDate,
      days_until_due: daysUntilDue
    }
  })

  return emitNotification(event)
}

/**
 * 便捷函數：發送出席異常事件
 */
export async function emitAttendanceAlertEvent(params: {
  tenantId: string
  recipientIds: string[]
  studentId: string
  studentName: string
  consecutiveAbsences: number
  channels?: NotificationChannel[]
}) {
  const { tenantId, recipientIds, studentId, studentName, consecutiveAbsences, channels = ['telegram'] } = params

  const title = '⚠️ 出席異常通知'
  const body = `您好，${studentName} 同學已連續缺席 ${consecutiveAbsences} 次課程。

請確認學生是否有特殊狀況，如需請假請提前告知，謝謝！`.trim()

  const event = createNotificationEvent({
    eventType: 'attendance.alert',
    tenantId,
    recipientIds,
    studentId,
    title,
    body,
    channels,
    notificationType: 'attendance_alert',
    metadata: {
      consecutive_absences: consecutiveAbsences
    }
  })

  return emitNotification(event)
}

/**
 * 便捷函數：發送成績通知事件
 */
export async function emitGradeNotificationEvent(params: {
  tenantId: string
  recipientIds: string[]
  studentId: string
  studentName: string
  courseName: string
  examType: string
  score: number
  channels?: NotificationChannel[]
}) {
  const { tenantId, recipientIds, studentId, studentName, courseName, examType, score, channels = ['telegram'] } = params

  const examTypeMap: Record<string, string> = {
    quiz: '小考',
    midterm: '期中考',
    final: '期末考',
    homework: '作業',
    project: '專題'
  }

  const title = '📊 成績通知'
  const body = `您好，${studentName} 的成績已登錄：

**課程**：${courseName}
**類型**：${examTypeMap[examType] || examType}
**分數**：${score} 分

請登入系統查看詳細資訊。`.trim()

  const event = createNotificationEvent({
    eventType: 'grade.recorded',
    tenantId,
    recipientIds,
    studentId,
    title,
    body,
    channels,
    notificationType: 'grade_notification',
    metadata: {
      course_name: courseName,
      exam_type: examType,
      score
    }
  })

  return emitNotification(event)
}
