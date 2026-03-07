import { Hono } from 'hono';
import { parseTelegramUpdate } from '../modules/platform-adapter';
import { getStudentBindingByPlatformId } from '../firestore/student-bindings';
import { handleStudentBind } from '../commands/student-bind';
import { sendMessage } from '../utils/telegram';
import { checkRateLimit } from '../utils/rate-limit';
import { logger } from '../utils/logger';
import { saveBotConversation } from '../firestore/bot-conversations';
import { recordBotEvent } from '../firestore/bot-health';
import type { TelegramUpdate } from '../utils/telegram';

export const telegramStudentWebhook = new Hono();

telegramStudentWebhook.post('/', async (c) => {
  let update: TelegramUpdate;
  try {
    update = await c.req.json();
  } catch {
    logger.error('[StudentBot] Invalid JSON in webhook request');
    return c.json({ ok: true });
  }

  const msg = parseTelegramUpdate(update);
  if (!msg) return c.json({ ok: true });

  // Rate limit
  if (!await checkRateLimit(`student_${msg.userId}`)) {
    await sendMessage(msg.chatId, '⚠️ 操作太頻繁，請稍後再試', undefined, 'student');
    return c.json({ ok: true });
  }

  const text = msg.content.trim();

  // Handle /start before auth check
  if (text === '/start') {
    await sendMessage(
      msg.chatId,
      '👋 歡迎使用<b>神算子 AI 助教 Bot</b>！\n\n' +
      '請先輸入老師提供的邀請碼進行綁定：\n' +
      '<code>/bind 邀請碼</code>\n\n' +
      '綁定後即可向 AI 助教提問課業問題。',
      undefined,
      'student'
    );
    return c.json({ ok: true });
  }

  // Handle /bind command (works whether bound or not)
  if (text.startsWith('/bind')) {
    const code = text.replace('/bind', '').trim();
    try {
      const reply = await handleStudentBind(String(msg.userId), 'telegram', code);
      await sendMessage(msg.chatId, reply, undefined, 'student');
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[StudentBot] handleStudentBind error');
      await sendMessage(msg.chatId, '⚠️ 綁定操作失敗，請稍後再試', undefined, 'student').catch((e: unknown) => {
        logger.warn({ err: e instanceof Error ? e : new Error(String(e)) }, '[StudentBot] sendMessage failed after bind error');
      });
    }
    return c.json({ ok: true });
  }

  // Auth check: student must be bound
  let binding;
  try {
    binding = await getStudentBindingByPlatformId(String(msg.userId));
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[StudentBot] getStudentBindingByPlatformId error');
    await sendMessage(msg.chatId, '⚠️ 系統發生錯誤，請稍後再試', undefined, 'student');
    return c.json({ ok: true });
  }

  if (!binding) {
    await sendMessage(
      msg.chatId,
      '請先綁定學生帳號！使用 /bind <邀請碼> 進行綁定。',
      undefined,
      'student'
    );
    return c.json({ ok: true });
  }

  // Process student message — forward to AI tutor
  try {
    // Detect image attachment
    const rawUpdate = update as unknown as Record<string, unknown>;
    const rawMsg = (rawUpdate.message ?? {}) as Record<string, unknown>;
    const photos = rawMsg.photo as unknown[] | undefined;
    const hasImage = Array.isArray(photos) && photos.length > 0;

    // Build a placeholder AI tutor response
    // (Full AI routing would be wired here once a student-intent-router is implemented)
    const reply = hasImage
      ? `📸 收到圖片！${binding.studentName} 同學，目前 AI 助教圖片解題功能即將上線，請先用文字描述您的問題 😊`
      : `🤖 ${binding.studentName} 同學，我是神算子 AI 助教，正在思考您的問題...\n\n（AI 助教課業回覆功能即將完整上線）`;

    await sendMessage(msg.chatId, reply, undefined, 'student');
    recordBotEvent(binding.tenantId, 'ai-tutor', 'telegram', true).catch(() => {});
    saveBotConversation({
      tenantId: binding.tenantId,
      botType: 'ai-tutor',
      platform: 'telegram',
      userId: String(msg.userId),
      userName: binding.studentName,
      userRole: 'student',
      userMessage: text,
      botReply: reply,
      intent: 'tutor.answer',
      model: 'gemini-2.5-flash-lite',
      latencyMs: 0,
      createdAt: new Date(),
    }).catch(() => {});
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[StudentBot] Error processing message');
    recordBotEvent(binding.tenantId, 'ai-tutor', 'telegram', false, undefined, error instanceof Error ? error.message : String(error)).catch(() => {});
    await sendMessage(
      msg.chatId,
      '不好意思，我剛剛沒接住 😅 可以再說一次嗎？',
      undefined,
      'student'
    );
  }

  return c.json({ ok: true });
});
