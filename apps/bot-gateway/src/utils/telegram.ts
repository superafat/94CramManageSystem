import { config } from '../config';

const ADMIN_BASE = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`;
const PARENT_BASE = config.TELEGRAM_PARENT_BOT_TOKEN
  ? `https://api.telegram.org/bot${config.TELEGRAM_PARENT_BOT_TOKEN}`
  : null;

function getBase(bot?: 'admin' | 'parent'): string {
  if (bot === 'parent') {
    if (!PARENT_BASE) throw new Error('TELEGRAM_PARENT_BOT_TOKEN is not configured');
    return PARENT_BASE;
  }
  return ADMIN_BASE;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: CallbackQuery;
}

export interface TelegramMessage {
  message_id: number;
  from: { id: number; first_name: string; last_name?: string; username?: string };
  chat: { id: number; type: string };
  text?: string;
  date: number;
}

export interface CallbackQuery {
  id: string;
  from: { id: number; first_name: string };
  message?: TelegramMessage;
  data?: string;
}

export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

export async function sendMessage(
  chatId: number | string,
  text: string,
  options?: { reply_markup?: { inline_keyboard: InlineKeyboardButton[][] } },
  bot?: 'admin' | 'parent'
): Promise<TelegramMessage> {
  const base = getBase(bot);
  const res = await fetch(`${base}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...options }),
  });
  const data = await res.json();
  return data.result;
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  await fetch(`${ADMIN_BASE}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
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
  });
}

export async function setWebhook(url: string, bot?: 'admin' | 'parent'): Promise<void> {
  const base = getBase(bot);
  await fetch(`${base}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
}
