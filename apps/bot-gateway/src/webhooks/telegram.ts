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
import { logger } from '../utils/logger';
import type { TelegramUpdate } from '../utils/telegram';
import { getDemoSession, handleDemoStart, handleDemoExit, handleDemoMessage, handleDemoCallback } from '../demo/index.js';
import { getMemoryContext, recordTurn } from '../memory/index.js';

export const telegramWebhook = new Hono();

telegramWebhook.post('/', async (c) => {
  let update: TelegramUpdate;
  try {
    update = await c.req.json();
  } catch {
    logger.error('[Telegram] Invalid JSON in webhook request');
    return c.json({ ok: true });
  }
  const msg = parseTelegramUpdate(update);
  if (!msg) return c.json({ ok: true });

  // Rate limit
  if (!await checkRateLimit(msg.userId)) {
    await sendMessage(msg.chatId, '⚠️ 操作太頻繁，請稍後再試');
    return c.json({ ok: true });
  }

  // Callback query (confirm/cancel)
  if (msg.messageType === 'callback') {
    try {
      // Demo callbacks
      if (msg.content.startsWith('demo_confirm:') || msg.content.startsWith('demo_cancel:')) {
        const demoSess = getDemoSession('admin', msg.userId);
        if (demoSess) {
          await handleDemoCallback(msg, demoSess);
          return c.json({ ok: true });
        }
      }
      await handleCallback(msg);
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[Telegram] handleCallback error')
    }
    return c.json({ ok: true });
  }

  // Commands
  const text = msg.content.trim();
  if (text.startsWith('/bind')) {
    try {
      await handleBind(msg.chatId, msg.userId, text.replace('/bind', '').trim());
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[Telegram] handleBind error')
      await sendMessage(msg.chatId, '⚠️ 綁定操作失敗，請稍後再試').catch((e: unknown) => { logger.warn({ err: e instanceof Error ? e : new Error(String(e)) }, '[Telegram] sendMessage failed after bind error'); });
    }
    return c.json({ ok: true });
  }
  if (text.startsWith('/switch')) {
    try {
      await handleSwitch(msg.chatId, msg.userId, text.replace('/switch', '').trim());
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[Telegram] handleSwitch error')
      await sendMessage(msg.chatId, '⚠️ 切換操作失敗，請稍後再試').catch((e: unknown) => { logger.warn({ err: e instanceof Error ? e : new Error(String(e)) }, '[Telegram] sendMessage failed after switch error'); });
    }
    return c.json({ ok: true });
  }
  if (text === '/sync') {
    try {
      await handleSync(msg.chatId, msg.userId);
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[Telegram] handleSync error')
      await sendMessage(msg.chatId, '⚠️ 同步操作失敗，請稍後再試').catch((e: unknown) => { logger.warn({ err: e instanceof Error ? e : new Error(String(e)) }, '[Telegram] sendMessage failed after sync error'); });
    }
    return c.json({ ok: true });
  }
  if (text === '/help' || text === '/start') {
    try {
      await handleHelp(msg.chatId);
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[Telegram] handleHelp error')
    }
    return c.json({ ok: true });
  }

  // Demo mode
  if (text === '/demo') {
    try {
      await handleDemoStart(msg.chatId, msg.userId, 'admin');
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[Telegram] handleDemoStart error');
    }
    return c.json({ ok: true });
  }
  if (text === '/exit') {
    try {
      await handleDemoExit(msg.chatId, msg.userId, 'admin');
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[Telegram] handleDemoExit error');
    }
    return c.json({ ok: true });
  }

  // Demo mode intercept (before auth check)
  const demoSession = getDemoSession('admin', msg.userId);
  if (demoSession) {
    try {
      await handleDemoMessage(msg, demoSession);
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[Telegram] handleDemoMessage error');
      await sendMessage(msg.chatId, '⚠️ Demo 操作失敗，請稍後再試');
    }
    return c.json({ ok: true });
  }

  // Auth check
  const auth = await authenticate(msg.userId);
  if (!auth) {
    await sendMessage(
      msg.chatId,
      '👋 歡迎使用 蜂神榜 補習班 Ai 助手系統！\n\n請先在 94Manage 後台生成綁定碼，然後輸入：\n/bind 123456'
    );
    return c.json({ ok: true });
  }

  // AI intent parsing
  try {
    const [cache, memoryCtx] = await Promise.all([
      getCache(auth.tenantId),
      getMemoryContext('admin', msg.userId, auth.tenantId),
    ]);
    const intent = await parseIntent(text, cache, memoryCtx);

    // Track AI usage (fire-and-forget)
    incrementUsage(auth.tenantId, 'ai_calls').catch((err: unknown) => {
      logger.error({ err: err instanceof Error ? err : new Error(String(err)) }, '[Webhook] Failed to increment ai_calls usage')
    });

    if (intent.need_clarification) {
      const reply = intent.ai_response ?? intent.clarification_question ?? '沒聽懂，可以再說一次嗎？';
      await sendMessage(msg.chatId, `🤔 ${reply}`);
      recordTurn('admin', msg.userId, auth.tenantId, text, reply, intent.intent);
      return c.json({ ok: true });
    }

    // Conversational intents — respond with AI-generated natural language
    if (intent.intent.startsWith('chat.')) {
      const reply = intent.ai_response ?? '👋 你好！有什麼行政事務需要幫忙嗎？';
      await sendMessage(msg.chatId, reply);
      recordTurn('admin', msg.userId, auth.tenantId, text, reply, intent.intent);
      return c.json({ ok: true });
    }

    if (intent.intent === 'unknown') {
      const reply = intent.ai_response ?? '🤔 我沒聽懂，可以換個方式說嗎？\n輸入 /help 查看使用說明';
      await sendMessage(msg.chatId, reply);
      recordTurn('admin', msg.userId, auth.tenantId, text, reply, intent.intent);
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
        logger.error({ err: err instanceof Error ? err : new Error(String(err)) }, '[Webhook] Failed to increment api_calls usage')
      });
      const formatted = formatResponse(result);
      // 用 ai_response 當自然語言前綴，讓回覆更像人
      const reply = intent.ai_response ? `${intent.ai_response}\n\n${formatted}` : formatted;
      await sendMessage(msg.chatId, reply);
      recordTurn('admin', msg.userId, auth.tenantId, text, reply, intent.intent);
      return c.json({ ok: true });
    }

    // Write intents: request confirmation
    if (isWriteIntent(intent.intent)) {
      await requestConfirmation(msg.chatId, msg.userId, auth.tenantId, auth.tenantName, intent);
      return c.json({ ok: true });
    }

    await sendMessage(msg.chatId, '🤔 我不確定要怎麼處理這個指令');
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[Webhook] Error processing message')
    await sendMessage(msg.chatId, '⚠️ 系統發生錯誤，請稍後再試');
  }

  return c.json({ ok: true });
});
