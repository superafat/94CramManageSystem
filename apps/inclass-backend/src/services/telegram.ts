/**
 * Telegram 訊息發送服務
 */
import { logger } from '../utils/logger.js'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

/**
 * 發送 Telegram 訊息
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error({ err: error instanceof Error ? error : new Error(message) }, '[Telegram] Send error')
    return { success: false, error: message }
  }
}
