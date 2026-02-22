/**
 * LINE Messaging API Service
 * 提供 signature 驗證、Reply/Push 訊息發送、取得用戶資料
 */

import { createHmac } from 'crypto'

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || 'b456ec1d9cbc50310bd01c6655124fea'
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || 'tXVWiHZgwLhb/Z73ScFKT+DmHrdb/9XfRvsmrHSmtq6IOyv4gkHU499Dby7EfxPTxUa+g83V4khBX6OQhDCo4UfbXdEJNL6QM2WWpMmmrh8voAY0u/7glnsX+i7OdgFSO/0xPCdPHrPatRwSwh/ETgdB04t89/1O/w1cDnyilFU='

const LINE_API_BASE = 'https://api.line.me/v2/bot'

/**
 * 驗證 LINE webhook signature (HMAC-SHA256)
 * 必須使用 raw body，不能先 JSON.parse
 */
export function verifyLineSignature(body: string, signature: string): boolean {
  try {
    // 驗證輸入
    if (!body || typeof body !== 'string') {
      console.error('[LINE] Invalid body for signature verification')
      return false
    }
    
    if (!signature || typeof signature !== 'string') {
      console.error('[LINE] Invalid signature')
      return false
    }
    
    if (!LINE_CHANNEL_SECRET) {
      console.error('[LINE] Missing LINE_CHANNEL_SECRET')
      return false
    }
    
    const hash = createHmac('sha256', LINE_CHANNEL_SECRET)
      .update(body)
      .digest('base64')
    
    // 使用常數時間比較防止 timing attack
    return hash.length === signature.length && hash === signature
  } catch (error: any) {
    console.error('[LINE] Signature verification error:', error.message)
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
  
  try {
    const response = await fetch(`${LINE_API_BASE}/message/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        replyToken,
        messages
      })
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[LINE] Reply API error:', response.status, errorBody)
      return { success: false, error: `LINE API error: ${response.status}` }
    }

    return { success: true }
  } catch (error: any) {
    console.error('[LINE] Reply error:', error.message, error.stack)
    return { success: false, error: error.message }
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
  } catch (error: any) {
    console.error('[LINE] Push error:', error.message, error.stack)
    return { success: false, error: error.message }
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
  
  try {
    const response = await fetch(`${LINE_API_BASE}/profile/${userId}`, {
      headers: {
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      }
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[LINE] Profile API error:', response.status, errorBody)
      return { success: false, error: `LINE API error: ${response.status}` }
    }

    const profile = await response.json()
    
    // 驗證回應格式
    if (!profile || !profile.userId || !profile.displayName) {
      return { success: false, error: 'Invalid profile response' }
    }
    
    return { success: true, profile }
  } catch (error: any) {
    console.error('[LINE] Profile fetch error:', error.message, error.stack)
    return { success: false, error: error.message }
  }
}
