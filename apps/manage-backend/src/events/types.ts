/**
 * 通知事件類型定義
 * 定義所有通知事件的類型和結構
 */

import type { NotificationType, NotificationChannel } from '../db/schema'

/**
 * 通知事件類型
 */
export type NotificationEventType =
  | 'schedule.changed'          // 課程異動
  | 'schedule.cancelled'        // 課程取消
  | 'billing.reminder'          // 繳費提醒
  | 'billing.overdue'           // 逾期通知
  | 'attendance.alert'          // 出席異常
  | 'grade.recorded'            // 成績登錄
  | 'enrollment.trial_scheduled' // 試聽預約
  | 'enrollment.confirmed'      // 報名確認
  | 'enrollment.follow_up'      // 跟進提醒
  | 'system.broadcast'          // 系統廣播
  | 'homework.assigned'         // 作業指派
  | 'homework.reminder'         // 作業提醒

/**
 * 事件優先級
 */
export type EventPriority = 'high' | 'normal' | 'low'

/**
 * 通知事件基礎結構
 */
export interface NotificationEvent {
  /** 事件類型 */
  type: NotificationEventType
  
  /** 租戶 ID */
  tenantId: string
  
  /** 事件發生時間 */
  timestamp: Date
  
  /** 事件 payload */
  payload: NotificationEventPayload
  
  /** 事件選項 */
  options?: NotificationEventOptions
}

/**
 * 通知事件 Payload
 */
export interface NotificationEventPayload {
  /** 接收者 ID 列表（用戶或家長） */
  recipientIds: string[]
  
  /** 相關學生 ID（可選） */
  studentId?: string
  
  /** 通知標題 */
  title: string
  
  /** 通知內容 */
  body: string
  
  /** 發送渠道列表 */
  channels: NotificationChannel[]
  
  /** 額外元數據 */
  metadata?: Record<string, any>
  
  /** 對應的通知類型（用於記錄） */
  notificationType: NotificationType
}

/**
 * 通知事件選項
 */
export interface NotificationEventOptions {
  /** 優先級 */
  priority?: EventPriority
  
  /** 失敗時是否重試 */
  retryOnFailure?: boolean
  
  /** 最大重試次數 */
  maxRetries?: number
  
  /** 延遲發送（毫秒） */
  delayMs?: number
  
  /** 批次發送間隔（毫秒，避免 rate limit） */
  batchIntervalMs?: number
}

/**
 * 事件處理結果
 */
export interface EventHandlerResult {
  /** 是否成功 */
  success: boolean
  
  /** 成功發送數量 */
  sentCount: number
  
  /** 失敗數量 */
  failedCount: number
  
  /** 跳過數量（用戶禁用） */
  skippedCount: number
  
  /** 錯誤訊息 */
  errors?: Array<{ recipientId: string; error: string }>
  
  /** 處理時間（毫秒） */
  processingTimeMs?: number
}

/**
 * 事件處理器接口
 */
export interface EventHandler {
  /** 處理器名稱 */
  name: string
  
  /** 支持的渠道 */
  supportedChannel: NotificationChannel
  
  /** 處理事件 */
  handle(event: NotificationEvent): Promise<EventHandlerResult>
}

/**
 * 事件監聽器類型
 */
export type EventListener = (event: NotificationEvent) => void | Promise<void>

/**
 * 事件訂閱選項
 */
export interface EventSubscriptionOptions {
  /** 訂閱的事件類型（可選，不指定則訂閱所有） */
  eventTypes?: NotificationEventType[]
  
  /** 訂閱的渠道（可選，不指定則訂閱所有） */
  channels?: NotificationChannel[]
  
  /** 優先級過濾 */
  minPriority?: EventPriority
}
