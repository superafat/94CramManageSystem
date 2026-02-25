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
import { incrementUsage } from '../firestore/usage';
import type { TelegramUpdate } from '../utils/telegram';

export const telegramWebhook = new Hono();

telegramWebhook.post('/', async (c) => {
  let update: TelegramUpdate;
  try {
    update = await c.req.json();
  } catch {
    console.error('[Telegram] Invalid JSON in webhook request');
    return c.json({ ok: true });
  }
  const msg = parseTelegramUpdate(update);
  if (!msg) return c.json({ ok: true });

  // Rate limit
  if (!checkRateLimit(msg.userId)) {
    await sendMessage(msg.chatId, '⚠️ 操作太頻繁，請稍後再試');
    return c.json({ ok: true });
  }

  // Callback query (confirm/cancel)
  if (msg.messageType === 'callback') {
    try {
      await handleCallback(msg);
    } catch (error) {
      console.error('[Telegram] handleCallback error:', error);
    }
    return c.json({ ok: true });
  }

  // Commands
  const text = msg.content.trim();
  if (text.startsWith('/bind')) {
    try {
      await handleBind(msg.chatId, msg.userId, text.replace('/bind', '').trim());
    } catch (error) {
      console.error('[Telegram] handleBind error:', error);
      await sendMessage(msg.chatId, '⚠️ 綁定操作失敗，請稍後再試').catch(() => {});
    }
    return c.json({ ok: true });
  }
  if (text.startsWith('/switch')) {
    try {
      await handleSwitch(msg.chatId, msg.userId, text.replace('/switch', '').trim());
    } catch (error) {
      console.error('[Telegram] handleSwitch error:', error);
      await sendMessage(msg.chatId, '⚠️ 切換操作失敗，請稍後再試').catch(() => {});
    }
    return c.json({ ok: true });
  }
  if (text === '/sync') {
    try {
      await handleSync(msg.chatId, msg.userId);
    } catch (error) {
      console.error('[Telegram] handleSync error:', error);
      await sendMessage(msg.chatId, '⚠️ 同步操作失敗，請稍後再試').catch(() => {});
    }
    return c.json({ ok: true });
  }
  if (text === '/help' || text === '/start') {
    try {
      await handleHelp(msg.chatId);
    } catch (error) {
      console.error('[Telegram] handleHelp error:', error);
    }
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

    // Track AI usage (fire-and-forget)
    incrementUsage(auth.tenantId, 'ai_calls').catch((err: unknown) => {
      console.error('[Webhook] Failed to increment ai_calls usage:', err);
    });

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

    // Module permission check
    const intentModule = intent.intent.split('.')[0];
    if (!auth.enabledModules.includes(intentModule)) {
      await sendMessage(msg.chatId, `⚠️ 此補習班尚未啟用「${intentModule}」模組，請聯繫管理員`);
      return c.json({ ok: true });
    }

    // Query intents: execute directly
    if (isQueryIntent(intent.intent)) {
      const result = await executeIntent(intent, auth);
      incrementUsage(auth.tenantId, 'api_calls').catch((err: unknown) => {
        console.error('[Webhook] Failed to increment api_calls usage:', err);
      });
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
