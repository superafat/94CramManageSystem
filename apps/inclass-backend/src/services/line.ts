/**
 * LINE Messaging API Service
 * 提供 Push 訊息發送
 */

import { logger } from '../utils/logger.js'

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN

function getLineAccessToken(): string | null {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    logger.error('[LINE] Missing LINE_CHANNEL_ACCESS_TOKEN')
    return null
  }
  return LINE_CHANNEL_ACCESS_TOKEN
}

const LINE_API_BASE = 'https://api.line.me/v2/bot'

/**
 * LINE Push Message API
 * 主動推播訊息給用戶（需要用戶的 LINE user ID）
 */
export async function sendLinePushMessage(
  to: string,
  messages: Array<{ type: string; text: string }>
): Promise<{ success: boolean; error?: string }> {
  // 驗證輸入
  if (!to || typeof to !== 'string') {
    return { success: false, error: 'Invalid recipient userId' }
  }

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 5) {
    return { success: false, error: 'Messages must be array with 1-5 items' }
  }

  // 驗證訊息格式和內容
  for (const msg of messages) {
    if (!msg.type || !msg.text) {
      return { success: false, error: 'Invalid message format' }
    }
    if (msg.text.length > 5000) {
      return { success: false, error: 'Message text too long (max 5000)' }
    }
  }

  const accessToken = getLineAccessToken()
  if (!accessToken) {
    return { success: false, error: 'LINE_CHANNEL_ACCESS_TOKEN is not configured' }
  }

  try {
    const response = await fetch(`${LINE_API_BASE}/message/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        to,
        messages
      })
    })

    if (!response.ok) {
      const errorBody = await response.text()
      logger.error({ status: response.status, body: errorBody }, '[LINE] Push API error')
      return { success: false, error: `LINE API error: ${response.status}` }
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error({ err: error instanceof Error ? error : new Error(message) }, '[LINE] Push error')
    return { success: false, error: message }
  }
}
