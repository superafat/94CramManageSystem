import { config } from '../config'
import { logger } from './logger'
import PQueue from 'p-queue'

const ADMIN_BASE = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`
const PARENT_BASE = config.TELEGRAM_PARENT_BOT_TOKEN
  ? `https://api.telegram.org/bot${config.TELEGRAM_PARENT_BOT_TOKEN}`
  : null

function getBase(bot?: 'admin' | 'parent'): string {
  if (bot === 'parent') {
    if (!PARENT_BASE) throw new Error('TELEGRAM_PARENT_BOT_TOKEN is not configured')
    return PARENT_BASE
  }
  return ADMIN_BASE
}

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  callback_query?: CallbackQuery
}

export interface TelegramMessage {
  message_id: number
  from: { id: number; first_name: string; last_name?: string; username?: string }
  chat: { id: number; type: string }
  text?: string
  date: number
}

export interface CallbackQuery {
  id: string
  from: { id: number; first_name: string }
  message?: TelegramMessage
  data?: string
}

export interface InlineKeyboardButton {
  text: string
  callback_data: string
}

const queue = new PQueue({ concurrency: 1 })

async function doSend(base: string, body: Record<string, unknown>) {
  const res = await fetch(`${base}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parse_mode: 'HTML', ...body }),
    // timeout handled by runtime
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const err = new Error('Telegram sendMessage failed') as Error & { status?: number; response?: string }
    err.status = res.status
    err.response = text
    throw err
  }
  return res.json()
}

export async function sendMessage(
  chatId: number | string,
  text: string,
  options?: { reply_markup?: { inline_keyboard: InlineKeyboardButton[][] } },
  bot?: 'admin' | 'parent'
): Promise<TelegramMessage> {
  const base = getBase(bot)
  // enqueue to avoid bursts
  return queue.add(async () => {
    // retries with exponential backoff
    let attempts = 0
    const maxAttempts = 3
    while (true) {
      try {
        const result = await doSend(base, { chat_id: chatId, text, ...options })
        return result.result
      } catch (err: unknown) {
        attempts++
        const telegramErr = err as Error & { status?: number; response?: string }
        // 400-499 non-retryable except 429
        if (telegramErr.status && telegramErr.status >= 400 && telegramErr.status < 500 && telegramErr.status !== 429) {
          logger.error({ err: telegramErr, status: telegramErr.status, response: telegramErr.response }, '[Telegram] Non-retryable error')
          throw telegramErr
        }
        if (attempts >= maxAttempts) {
          logger.error({ err: telegramErr }, '[Telegram] sendMessage failed after retries')
          throw telegramErr
        }
        const backoff = Math.pow(2, attempts) * 200
        await new Promise((r) => setTimeout(r, backoff))
      }
    }
  })
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  await fetch(`${ADMIN_BASE}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  })
}

export async function editMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
  options?: { reply_markup?: { inline_keyboard: InlineKeyboardButton[][] } }
): Promise<void> {
  await fetch(`${ADMIN_BASE}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML', ...options }),
  })
}

export async function setWebhook(url: string, bot?: 'admin' | 'parent'): Promise<void> {
  const base = getBase(bot)
  await fetch(`${base}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
}
