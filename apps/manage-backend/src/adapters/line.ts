/**
 * LINE API 適配器
 * 提供統一的 LINE 訊息發送接口
 */

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN
const LINE_API_BASE = 'https://api.line.me/v2/bot'

/**
 * 發送結果
 */
export interface SendResult {
  success: boolean
  error?: string
}

/**
 * LINE 訊息類型
 */
export interface LineMessage {
  type: 'text' | 'image' | 'video' | 'audio' | 'location' | 'sticker'
  text?: string
  [key: string]: any
}

/**
 * LINE API 適配器類
 */
class LineAdapter {
  /**
   * 發送 Push 訊息
   */
  async sendPushMessage(
    to: string,
    messages: LineMessage[]
  ): Promise<SendResult> {
    // 驗證輸入
    if (!to || typeof to !== 'string') {
      return { success: false, error: 'Invalid recipient userId' }
    }

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 5) {
      return { success: false, error: 'Messages must be array with 1-5 items' }
    }

    // 驗證訊息格式
    for (const msg of messages) {
      if (msg.type === 'text' && (!msg.text || msg.text.length > 5000)) {
        return { success: false, error: 'Invalid text message' }
      }
    }

    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      console.error('[LINE Adapter] Missing LINE_CHANNEL_ACCESS_TOKEN')
      return { success: false, error: 'LINE_CHANNEL_ACCESS_TOKEN is not configured' }
    }

    try {
      const response = await fetch(`${LINE_API_BASE}/message/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
          to,
          messages
        })
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error('[LINE] Push API error:', response.status, errorBody)
        return { success: false, error: `LINE API error: ${response.status}` }
      }

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[LINE] Push error:', message)
      return { success: false, error: message }
    }
  }

  /**
   * 批次發送訊息（帶 rate limiting）
   */
  async sendBulkMessages(
    messages: Array<{
      to: string
      messages: LineMessage[]
    }>,
    intervalMs: number = 100
  ): Promise<{
    results: SendResult[]
    successCount: number
    failedCount: number
  }> {
    const results: SendResult[] = []
    let successCount = 0
    let failedCount = 0

    for (const msg of messages) {
      const result = await this.sendPushMessage(msg.to, msg.messages)
      results.push(result)

      if (result.success) {
        successCount++
      } else {
        failedCount++
      }

      // Rate limiting
      if (messages.indexOf(msg) < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalMs))
      }
    }

    return {
      results,
      successCount,
      failedCount
    }
  }

  /**
   * 創建文字訊息
   */
  createTextMessage(title: string, body: string): LineMessage {
    return {
      type: 'text',
      text: `${title}\n\n${body}`
    }
  }

  /**
   * 驗證 LINE user ID 格式
   */
  isValidUserId(userId: string): boolean {
    // LINE user ID 是 33 字元的字符串
    return typeof userId === 'string' && userId.length === 33 && /^U[a-f0-9]{32}$/.test(userId)
  }
}

/**
 * 單例實例
 */
export const lineAdapter = new LineAdapter()
