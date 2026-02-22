/**
 * 事件系統初始化
 * 註冊所有事件處理器到事件總線
 */

import { eventBus } from './event-bus'
import { telegramEventHandler, lineEventHandler } from './handlers'

/**
 * 初始化事件系統
 */
export function initializeEventSystem(): void {
  console.log('[EventSystem] Initializing event system...')
  
  // 註冊 Telegram 處理器
  eventBus.registerHandler(telegramEventHandler)
  
  // 註冊 LINE 處理器
  eventBus.registerHandler(lineEventHandler)
  
  // 可選：訂閱全局事件監聽器（用於調試）
  if (process.env.NODE_ENV === 'development') {
    eventBus.subscribe(async (event) => {
      console.log('[EventSystem] Event emitted:', {
        type: event.type,
        recipientCount: event.payload.recipientIds.length,
        channels: event.payload.channels,
        timestamp: event.timestamp
      })
    })
  }
  
  const stats = eventBus.getStats()
  console.log('[EventSystem] Event system initialized:', stats)
}

// 導出事件總線相關功能
export { eventBus, emitNotification, enqueueNotification } from './event-bus'
export type {
  NotificationEvent,
  NotificationEventType,
  NotificationEventPayload,
  EventHandlerResult
} from './types'
