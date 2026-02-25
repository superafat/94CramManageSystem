/**
 * 事件總線 (Event Bus)
 * 實現事件發布/訂閱機制，解耦業務邏輯與通知處理
 */

import type {
  NotificationEvent,
  NotificationEventType,
  EventHandler,
  EventListener,
  EventSubscriptionOptions,
  EventHandlerResult
} from './types'

/**
 * 事件總線類
 */
class EventBus {
  /** 事件監聽器映射 */
  private listeners: Map<string, EventListener[]> = new Map()
  
  /** 事件處理器列表 */
  private handlers: Map<string, EventHandler> = new Map()
  
  /** 事件隊列（用於異步處理） */
  private eventQueue: NotificationEvent[] = []
  
  /** 是否正在處理隊列 */
  private isProcessing = false
  
  /** 事件日誌（最近 1000 條） */
  private eventLog: Array<{
    event: NotificationEvent
    result?: EventHandlerResult
    timestamp: Date
  }> = []
  
  private maxLogSize = 1000

  /**
   * 註冊事件處理器
   */
  registerHandler(handler: EventHandler): void {
    const key = handler.supportedChannel
    
    if (this.handlers.has(key)) {
      console.warn(`[EventBus] Handler for channel ${key} already exists, overwriting`)
    }
    
    this.handlers.set(key, handler)
    console.info(`[EventBus] Registered handler: ${handler.name} for channel: ${key}`)
  }

  /**
   * 註銷事件處理器
   */
  unregisterHandler(channel: string): void {
    this.handlers.delete(channel)
    console.info(`[EventBus] Unregistered handler for channel: ${channel}`)
  }

  /**
   * 訂閱事件
   */
  subscribe(
    listener: EventListener,
    options?: EventSubscriptionOptions
  ): () => void {
    const key = this.getSubscriptionKey(options)
    
    if (!this.listeners.has(key)) {
      this.listeners.set(key, [])
    }
    
    this.listeners.get(key)!.push(listener)
    
    // 返回取消訂閱函數
    return () => {
      const listeners = this.listeners.get(key)
      if (listeners) {
        const index = listeners.indexOf(listener)
        if (index > -1) {
          listeners.splice(index, 1)
        }
      }
    }
  }

  /**
   * 發布事件（同步）
   */
  async emit(event: NotificationEvent): Promise<EventHandlerResult[]> {
    console.info(`[EventBus] Emitting event: ${event.type}`)
    
    // 記錄事件
    this.logEvent(event)
    
    // 通知監聽器
    await this.notifyListeners(event)
    
    // 分發到處理器
    const results = await this.dispatchToHandlers(event)
    
    return results
  }

  /**
   * 發布事件（異步，加入隊列）
   */
  enqueue(event: NotificationEvent): void {
    this.eventQueue.push(event)
    this.processQueue()
  }

  /**
   * 處理事件隊列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return
    }
    
    this.isProcessing = true
    
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()
      if (event) {
        try {
          await this.emit(event)
        } catch (error) {
          console.error(`[EventBus] Error processing event:`, error)
        }
      }
    }
    
    this.isProcessing = false
  }

  /**
   * 分發事件到處理器
   */
  private async dispatchToHandlers(
    event: NotificationEvent
  ): Promise<EventHandlerResult[]> {
    const results: EventHandlerResult[] = []
    const channels = event.payload.channels
    
    for (const channel of channels) {
      const handler = this.handlers.get(channel)
      
      if (!handler) {
        console.warn(`[EventBus] No handler found for channel: ${channel}`)
        continue
      }
      
      try {
        const startTime = Date.now()
        const result = await handler.handle(event)
        result.processingTimeMs = Date.now() - startTime
        
        results.push(result)
        
        // 記錄結果
        this.logEventResult(event, result)
        
        console.info(
          `[EventBus] Handler ${handler.name} completed:`,
          `sent=${result.sentCount}, failed=${result.failedCount}, skipped=${result.skippedCount}`
        )
      } catch (error) {
        console.error(`[EventBus] Handler ${handler.name} error:`, error)
        results.push({
          success: false,
          sentCount: 0,
          failedCount: event.payload.recipientIds.length,
          skippedCount: 0,
          errors: [{ recipientId: 'all', error: error instanceof Error ? error.message : String(error) }]
        })
      }
    }
    
    return results
  }

  /**
   * 通知監聽器
   */
  private async notifyListeners(event: NotificationEvent): Promise<void> {
    // 通知所有監聽器
    const allListeners = this.listeners.get('*') || []
    
    // 通知特定類型的監聽器
    const typeListeners = this.listeners.get(event.type) || []
    
    const listeners = [...allListeners, ...typeListeners]
    
    for (const listener of listeners) {
      try {
        await listener(event)
      } catch (error) {
        console.error(`[EventBus] Listener error:`, error)
      }
    }
  }

  /**
   * 獲取訂閱鍵
   */
  private getSubscriptionKey(options?: EventSubscriptionOptions): string {
    if (!options || !options.eventTypes || options.eventTypes.length === 0) {
      return '*'
    }
    
    return options.eventTypes.join(',')
  }

  /**
   * 記錄事件
   */
  private logEvent(event: NotificationEvent): void {
    this.eventLog.push({
      event,
      timestamp: new Date()
    })
    
    // 限制日誌大小
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift()
    }
  }

  /**
   * 記錄事件結果
   */
  private logEventResult(event: NotificationEvent, result: EventHandlerResult): void {
    const logEntry = this.eventLog.find(log => log.event === event)
    if (logEntry) {
      logEntry.result = result
    }
  }

  /**
   * 獲取事件日誌
   */
  getEventLog(limit?: number): typeof this.eventLog {
    if (limit) {
      return this.eventLog.slice(-limit)
    }
    return [...this.eventLog]
  }

  /**
   * 清空事件日誌
   */
  clearEventLog(): void {
    this.eventLog = []
  }

  /**
   * 獲取統計信息
   */
  getStats(): {
    handlersCount: number
    listenersCount: number
    queueLength: number
    logSize: number
  } {
    const listenersCount = Array.from(this.listeners.values()).reduce(
      (sum, arr) => sum + arr.length,
      0
    )
    
    return {
      handlersCount: this.handlers.size,
      listenersCount,
      queueLength: this.eventQueue.length,
      logSize: this.eventLog.length
    }
  }
}

/**
 * 單例事件總線
 */
export const eventBus = new EventBus()

/**
 * 便捷函數：發送通知事件
 */
export function emitNotification(event: NotificationEvent): Promise<EventHandlerResult[]> {
  return eventBus.emit(event)
}

/**
 * 便捷函數：將通知事件加入隊列
 */
export function enqueueNotification(event: NotificationEvent): void {
  eventBus.enqueue(event)
}
