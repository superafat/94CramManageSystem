import { Hono } from 'hono';
import { parseTelegramUpdate } from '../modules/platform-adapter';
import { authenticate } from '../modules/auth-manager';
import { parseIntent } from '../modules/ai-engine';
import { getCache } from '../firestore/cache';
import { requestConfirmation } from '../modules/confirm-manager';
import { executeIntent, isQueryIntent, isWriteIntent, formatResponse } from '../handlers/intent-router';
import { handleCallback } from '../handlers/callback';
import { handleBind } from '../commands/bind';
import { handleSwitch } from '../commands/switch';
import { handleSync } from '../commands/sync';
import { handleHelp } from '../commands/help';
import { sendMessage } from '../utils/telegram';
import { checkRateLimit } from '../utils/rate-limit';
import type { TelegramUpdate } from '../utils/telegram';

export const telegramWebhook = new Hono();

telegramWebhook.post('/', async (c) => {
  const update: TelegramUpdate = await c.req.json();
  const msg = parseTelegramUpdate(update);
  if (!msg) return c.json({ ok: true });

  // Rate limit
  if (!checkRateLimit(msg.userId)) {
    await sendMessage(msg.chatId, '⚠️ 操作太頻繁，請稍後再試');
    return c.json({ ok: true });
  }

  // Callback query (confirm/cancel)
  if (msg.messageType === 'callback') {
    await handleCallback(msg);
    return c.json({ ok: true });
  }

  // Commands
  const text = msg.content.trim();
  if (text.startsWith('/bind')) {
    await handleBind(msg.chatId, msg.userId, text.replace('/bind', '').trim());
    return c.json({ ok: true });
  }
  if (text.startsWith('/switch')) {
    await handleSwitch(msg.chatId, msg.userId, text.replace('/switch', '').trim());
    return c.json({ ok: true });
  }
  if (text === '/sync') {
    await handleSync(msg.chatId, msg.userId);
    return c.json({ ok: true });
  }
  if (text === '/help' || text === '/start') {
    await handleHelp(msg.chatId);
    return c.json({ ok: true });
  }

  // Auth check
  const auth = await authenticate(msg.userId);
  if (!auth) {
    await sendMessage(
      msg.chatId,
      '👋 歡迎使用 94CramBot！\n\n請先在 94Manage 後台生成綁定碼，然後輸入：\n/bind 123456'
    );
    return c.json({ ok: true });
  }

  // AI intent parsing
  try {
    const cache = await getCache(auth.tenantId);
    const intent = await parseIntent(text, cache);

    if (intent.need_clarification) {
      await sendMessage(msg.chatId, `🤔 ${intent.clarification_question}`);
      return c.json({ ok: true });
    }

    if (intent.intent === 'unknown') {
      await sendMessage(msg.chatId, '🤔 我沒聽懂，可以換個方式說嗎？\n輸入 /help 查看使用說明');
      return c.json({ ok: true });
    }

    if (intent.intent.startsWith('system.')) {
      if (intent.intent === 'system.switch') {
        await handleSwitch(msg.chatId, msg.userId, '');
      } else {
        await handleHelp(msg.chatId);
      }
      return c.json({ ok: true });
    }

    // Query intents: execute directly
    if (isQueryIntent(intent.intent)) {
      const result = await executeIntent(intent, auth);
      await sendMessage(msg.chatId, formatResponse(result));
      return c.json({ ok: true });
    }

    // Write intents: request confirmation
    if (isWriteIntent(intent.intent)) {
      await requestConfirmation(msg.chatId, msg.userId, auth.tenantId, auth.tenantName, intent);
      return c.json({ ok: true });
    }

    await sendMessage(msg.chatId, '🤔 我不確定要怎麼處理這個指令');
  } catch (error) {
    console.error('[Webhook] Error processing message:', error);
    await sendMessage(msg.chatId, '⚠️ 系統發生錯誤，請稍後再試');
  }

  return c.json({ ok: true });
});
