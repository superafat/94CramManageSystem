/**
 * Telegram API 適配器
 * 提供統一的 Telegram 訊息發送接口
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
if (!TELEGRAM_BOT_TOKEN) {
  console.warn('WARNING: TELEGRAM_BOT_TOKEN not set. Telegram notifications will fail.')
}
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

/**
 * 發送結果
 */
export interface SendResult {
  success: boolean
  error?: string
  messageId?: number
}

/**
 * Telegram 訊息選項
 */
export interface TelegramMessageOptions {
  parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML'
  disableWebPagePreview?: boolean
  disableNotification?: boolean
}

/**
 * Telegram API 適配器類
 */
class TelegramAdapter {
  /**
   * 發送文字訊息
   */
  async sendMessage(
    chatId: string,
    text: string,
    options?: TelegramMessageOptions
  ): Promise<SendResult> {
    try {
      const response = await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: options?.parseMode || 'Markdown',
          disable_web_page_preview: options?.disableWebPagePreview,
          disable_notification: options?.disableNotification
        })
      })

      const result = await response.json()

      if (!result.ok) {
        return {
          success: false,
          error: result.description || 'Unknown Telegram API error'
        }
      }

      return {
        success: true,
        messageId: result.result?.message_id
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 批次發送訊息（帶 rate limiting）
   */
  async sendBulkMessages(
    messages: Array<{
      chatId: string
      text: string
      options?: TelegramMessageOptions
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
      const result = await this.sendMessage(msg.chatId, msg.text, msg.options)
      results.push(result)

      if (result.success) {
        successCount++
      } else {
        failedCount++
      }

      // Rate limiting: 避免觸發 Telegram 限制（30 msg/sec）
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
   * 格式化訊息（添加標題粗體）
   */
  formatMessage(title: string, body: string): string {
    return `*${title}*\n\n${body}`
  }

  /**
   * 驗證 chat ID 格式
   */
  isValidChatId(chatId: string): boolean {
    // Telegram chat ID 可以是數字或 @username
    return /^-?\d+$/.test(chatId) || /^@[a-zA-Z0-9_]{5,}$/.test(chatId)
  }
}

/**
 * 單例實例
 */
export const telegramAdapter = new TelegramAdapter()
