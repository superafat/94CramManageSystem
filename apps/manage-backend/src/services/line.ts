/**
 * LINE Messaging API Service
 * 提供 signature 驗證、Reply/Push 訊息發送、取得用戶資料
 */

import { createHmac } from 'crypto'
import { logger } from '../utils/logger'

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET
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
 * 驗證 LINE webhook signature (HMAC-SHA256)
 * 必須使用 raw body，不能先 JSON.parse
 */
export function verifyLineSignature(body: string, signature: string): boolean {
  try {
    // 驗證輸入
    if (!body || typeof body !== 'string') {
      logger.error('[LINE] Invalid body for signature verification')
      return false
    }
    
    if (!signature || typeof signature !== 'string') {
      logger.error('[LINE] Invalid signature')
      return false
    }
    
    if (!LINE_CHANNEL_SECRET) {
      logger.error('[LINE] Missing LINE_CHANNEL_SECRET')
      return false
    }
    
    const hash = createHmac('sha256', LINE_CHANNEL_SECRET)
      .update(body)
      .digest('base64')
    
    // 使用常數時間比較防止 timing attack
    return hash.length === signature.length && hash === signature
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[LINE] Signature verification error')
    return false
  }
}

/**
 * LINE Reply Message API
 * 用於回覆 webhook event（一次性，只能用一次 replyToken）
 */
export async function sendLineReplyMessage(
  replyToken: string,
  messages: Array<{ type: string; text: string }>
): Promise<{ success: boolean; error?: string }> {
  // 驗證輸入
  if (!replyToken || typeof replyToken !== 'string') {
    return { success: false, error: 'Invalid replyToken' }
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
    const response = await fetch(`${LINE_API_BASE}/message/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        replyToken,
        messages
      })
    })

    if (!response.ok) {
      const errorBody = await response.text()
      logger.error({ status: response.status, body: errorBody }, '[LINE] Reply API error')
      return { success: false, error: `LINE API error: ${response.status}` }
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error({ err: error instanceof Error ? error : new Error(message) }, '[LINE] Reply error')
    return { success: false, error: message }
  }
}

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

/**
 * 取得 LINE 用戶 Profile
 * 可用於儲存用戶資料（displayName, pictureUrl, statusMessage）
 */
export async function getLineProfile(userId: string): Promise<{
  success: boolean
  profile?: {
    userId: string
    displayName: string
    pictureUrl?: string
    statusMessage?: string
  }
  error?: string
}> {
  // 驗證輸入
  if (!userId || typeof userId !== 'string') {
    return { success: false, error: 'Invalid userId' }
  }
  
  // 防止路徑遍歷攻擊
  if (userId.includes('/') || userId.includes('\\') || userId.includes('..')) {
    return { success: false, error: 'Invalid userId format' }
  }
  
  const accessToken = getLineAccessToken()
  if (!accessToken) {
    return { success: false, error: 'LINE_CHANNEL_ACCESS_TOKEN is not configured' }
  }
  
  try {
    const response = await fetch(`${LINE_API_BASE}/profile/${userId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      const errorBody = await response.text()
      logger.error({ status: response.status, body: errorBody }, '[LINE] Profile API error')
      return { success: false, error: `LINE API error: ${response.status}` }
    }

    const profile = await response.json()
    
    // 驗證回應格式
    if (!profile || !profile.userId || !profile.displayName) {
      return { success: false, error: 'Invalid profile response' }
    }
    
    return { success: true, profile }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error({ err: error instanceof Error ? error : new Error(message) }, '[LINE] Profile fetch error')
    return { success: false, error: message }
  }
}
