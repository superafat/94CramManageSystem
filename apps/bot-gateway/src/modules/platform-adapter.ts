import type { TelegramUpdate } from '../utils/telegram';

export interface UnifiedMessage {
  platform: 'telegram';
  userId: string;
  chatId: string;
  userName: string;
  messageType: 'text' | 'callback';
  content: string;
  callbackQueryId?: string;
  originalMessageId?: number;
  timestamp: Date;
}

export function parseTelegramUpdate(update: TelegramUpdate): UnifiedMessage | null {
  if (update.callback_query) {
    const cq = update.callback_query;
    return {
      platform: 'telegram',
      userId: String(cq.from.id),
      chatId: String(cq.message?.chat.id ?? cq.from.id),
      userName: cq.from.first_name,
      messageType: 'callback',
      content: cq.data ?? '',
      callbackQueryId: cq.id,
      originalMessageId: cq.message?.message_id,
      timestamp: new Date(),
    };
  }

  if (update.message?.text) {
    const msg = update.message;
    const text = msg.text!;
    return {
      platform: 'telegram',
      userId: String(msg.from.id),
      chatId: String(msg.chat.id),
      userName: msg.from.first_name,
      messageType: 'text',
      content: text,
      timestamp: new Date(),
    };
  }

  return null;
}
