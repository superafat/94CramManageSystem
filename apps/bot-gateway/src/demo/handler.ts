import { parseIntent, parseParentIntent } from '../modules/ai-engine.js';
import { sendMessage, answerCallbackQuery, editMessageText } from '../utils/telegram.js';
import { logger } from '../utils/logger.js';
import { isQueryIntent, isWriteIntent } from '../handlers/intent-router.js';
import type { UnifiedMessage } from '../modules/platform-adapter.js';
import type { DemoSession } from './session-manager.js';
import {
  startDemoSession,
  getDemoSession,
  endDemoSession,
  incrementDemoMessageCount,
} from './session-manager.js';
import { DEMO_CACHE, DEMO_PARENT_CONTEXT, DEMO_TENANT_NAME } from './mock-data.js';
import { ADMIN_MOCK_RESPONSES, PARENT_MOCK_RESPONSES } from './mock-responses.js';

// Map AI parent intents → demo parent response keys (mirrors telegram-parent.ts AI_INTENT_MAP)
const AI_TO_PARENT_INTENT: Record<string, string> = {
  'attendance.today': 'parent.attendance',
  'attendance.report': 'parent.attendance',
  'finance.status': 'parent.payments',
  'finance.history': 'parent.payments',
  'leave.request': 'parent.leave',
  'schedule.query': 'parent.schedule',
  'info.address': 'parent.info',
  'info.phone': 'parent.info',
  'info.hours': 'parent.info',
  'info.course': 'parent.info',
  'info.fee': 'parent.payments',
  'info.policy': 'parent.info',
  'info.announcement': 'parent.info',
  'greeting': 'parent.help',
  'thanks': 'parent.help',
  'feedback': 'parent.unknown',
  'transfer': 'parent.unknown',
  'unknown': 'parent.unknown',
};

export async function handleDemoStart(
  chatId: string,
  userId: string,
  botType: 'admin' | 'parent'
): Promise<void> {
  // Check if already in demo
  const existing = getDemoSession(botType, userId);
  if (existing) {
    await sendMessage(
      chatId,
      '⚠️ 您已在 Demo 模式中，輸入 /exit 可離開',
      undefined,
      botType
    );
    return;
  }

  startDemoSession(userId, chatId, botType);

  if (botType === 'admin') {
    await sendMessage(
      chatId,
      `🏫 <b>${DEMO_TENANT_NAME} — 千里眼 Demo 模式</b>\n\n` +
      '歡迎體驗千里眼行政助手！以下是一些範例指令：\n\n' +
      '📋 <b>點名查詢</b>\n「今天高二A班點名狀況」\n\n' +
      '📝 <b>請假登記</b>\n「陳小利今天請假」\n\n' +
      '💰 <b>繳費登記</b>\n「陳小利繳了4500元」\n\n' +
      '📦 <b>庫存查詢</b>\n「數學題本還有多少」\n\n' +
      '📦 <b>出貨登記</b>\n「數學題本出10本給文學館1店」\n\n' +
      '─────────────────\n' +
      '⏱ Demo 將於 <b>5 分鐘後</b>自動結束\n' +
      '輸入 <code>/exit</code> 可立即離開',
      undefined,
      'admin'
    );
  } else {
    await sendMessage(
      chatId,
      `🏫 <b>${DEMO_TENANT_NAME} — 順風耳 Demo 模式</b>\n\n` +
      '您好，陳媽媽！👋\n\n' +
      '您的孩子：<b>陳小利（高二A班）</b>\n\n' +
      '可以問我：\n\n' +
      '📊 「小利今天到了嗎？」\n' +
      '💰 「學費繳了嗎？」\n' +
      '📅 「這週什麼時候上課？」\n' +
      '📝 「幫小利明天請假」\n' +
      '🏫 「補習班地址是哪？」\n\n' +
      '─────────────────\n' +
      '⏱ Demo 將於 <b>5 分鐘後</b>自動結束\n' +
      '輸入 <code>/exit</code> 可立即離開',
      undefined,
      'parent'
    );
  }
}

export async function handleDemoExit(
  chatId: string,
  userId: string,
  botType: 'admin' | 'parent'
): Promise<void> {
  const session = getDemoSession(botType, userId);
  const count = session?.messageCount ?? 0;
  endDemoSession(botType, userId);

  await sendMessage(
    chatId,
    `👋 已離開 Demo 模式\n\n` +
    `您在 Demo 中嘗試了 <b>${count}</b> 個操作\n\n` +
    `想要使用完整功能，請聯繫補習班取得綁定碼，輸入 <code>/bind 123456</code> 即可開始使用 🚀`,
    undefined,
    botType
  );
}

export async function handleDemoMessage(
  msg: UnifiedMessage,
  session: DemoSession
): Promise<void> {
  incrementDemoMessageCount(session.botType, session.userId);

  const text = msg.content.trim();

  if (session.botType === 'admin') {
    await handleAdminDemoMessage(msg.chatId, text, session);
  } else {
    await handleParentDemoMessage(msg.chatId, text, session);
  }
}

async function handleAdminDemoMessage(
  chatId: string,
  text: string,
  session: DemoSession
): Promise<void> {
  let intent;
  try {
    intent = await parseIntent(text, DEMO_CACHE);
  } catch (err) {
    logger.error({ err: err instanceof Error ? err : new Error(String(err)) }, '[Demo] parseIntent failed');
    await sendMessage(chatId, '⚠️ AI 解析暫時有點問題，請稍後再試', undefined, 'admin');
    return;
  }

  // Need clarification
  if (intent.need_clarification && intent.clarification_question) {
    await sendMessage(chatId, `🤔 ${intent.clarification_question}`, undefined, 'admin');
    return;
  }

  // Unknown intent
  if (intent.intent === 'unknown') {
    await sendMessage(
      chatId,
      '🤔 我沒聽懂，可以換個方式說嗎？\n\n例如：「陳小利今天請假」「查數學題本庫存」「陳小利繳了4500元」',
      undefined,
      'admin'
    );
    return;
  }

  // System intents
  if (intent.intent.startsWith('system.')) {
    await sendMessage(
      chatId,
      '📖 Demo 模式使用說明\n\n' +
      '直接輸入指令即可，例如：\n' +
      '「陳小利今天請假」\n' +
      '「查今天高二A班出勤」\n' +
      '「數學題本出10本給文學館1店」\n\n' +
      '輸入 /exit 離開 Demo 模式',
      undefined,
      'admin'
    );
    return;
  }

  const mockFn = ADMIN_MOCK_RESPONSES[intent.intent];

  // Query intent — respond directly
  if (isQueryIntent(intent.intent)) {
    if (mockFn) {
      const res = mockFn(intent.params);
      const text = res.success ? `✅ ${res.message}` : `❌ ${res.message}`;
      await sendMessage(chatId, text, undefined, 'admin');
    } else {
      await sendMessage(chatId, `🔍 查詢完成（Demo）\n\n✅ 操作：${intent.intent}`, undefined, 'admin');
    }
    return;
  }

  // Write intent — ask for confirmation with inline keyboard
  if (isWriteIntent(intent.intent)) {
    const sessionKey = `${session.botType}:${session.userId}`;
    const preview = mockFn ? mockFn(intent.params).message : `操作：${intent.intent}`;

    await sendMessage(
      chatId,
      `🏫 ${DEMO_TENANT_NAME}\n\n` +
      `📋 確認操作：\n${preview}\n\n` +
      '請確認是否執行？',
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ 確認', callback_data: `demo_confirm:${sessionKey}:${intent.intent}` },
              { text: '❌ 取消', callback_data: `demo_cancel:${sessionKey}` },
            ],
          ],
        },
      },
      'admin'
    );
    return;
  }

  await sendMessage(chatId, '🤔 我不確定要怎麼處理這個指令', undefined, 'admin');
}

async function handleParentDemoMessage(
  chatId: string,
  text: string,
  _session: DemoSession
): Promise<void> {
  let parentIntentKey = 'parent.unknown';
  let params: Record<string, unknown> = {};

  try {
    const ai = await parseParentIntent(text, DEMO_PARENT_CONTEXT);
    if (ai.need_clarification && ai.clarification_question) {
      await sendMessage(chatId, `🤔 ${ai.clarification_question}`, undefined, 'parent');
      return;
    }
    parentIntentKey = AI_TO_PARENT_INTENT[ai.intent] ?? 'parent.unknown';
    params = ai.params;
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err : new Error(String(err)) }, '[Demo] parseParentIntent failed, using fallback');
    parentIntentKey = 'parent.unknown';
  }

  const mockFn = PARENT_MOCK_RESPONSES[parentIntentKey] ?? PARENT_MOCK_RESPONSES['parent.unknown'];
  const response = mockFn(params);
  await sendMessage(chatId, response, undefined, 'parent');
}

export async function handleDemoCallback(
  msg: UnifiedMessage,
  session: DemoSession
): Promise<void> {
  const data = msg.content;

  // Answer callback to dismiss the loading spinner
  if (msg.callbackQueryId) {
    await answerCallbackQuery(msg.callbackQueryId).catch((err: unknown) => {
      logger.warn({ err: err instanceof Error ? err : new Error(String(err)) }, '[Demo] answerCallbackQuery failed');
    });
  }

  if (!msg.originalMessageId) return;

  if (data.startsWith('demo_confirm:')) {
    // Extract intent from callback data: demo_confirm:{botType}:{userId}:{intent}
    const parts = data.split(':');
    const intentName = parts.slice(3).join(':'); // handles intents with dots

    const mockFn = intentName ? ADMIN_MOCK_RESPONSES[intentName] : undefined;
    const res = mockFn ? mockFn({}) : { success: true, message: '操作已完成' };

    await editMessageText(
      msg.chatId,
      msg.originalMessageId,
      `✅ ${res.message}`
    ).catch((err: unknown) => {
      logger.warn({ err: err instanceof Error ? err : new Error(String(err)) }, '[Demo] editMessageText failed');
    });
  } else if (data.startsWith('demo_cancel:')) {
    await editMessageText(
      msg.chatId,
      msg.originalMessageId,
      '❌ 已取消'
    ).catch((err: unknown) => {
      logger.warn({ err: err instanceof Error ? err : new Error(String(err)) }, '[Demo] editMessageText failed');
    });
  }

  // Increment message count for callback interactions too
  incrementDemoMessageCount(session.botType, session.userId);
}

// Re-export session helpers for convenience in webhook handlers
export { startDemoSession, getDemoSession, endDemoSession, incrementDemoMessageCount };
