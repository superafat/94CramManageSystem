import { Hono } from 'hono';
import { parseTelegramUpdate } from '../modules/platform-adapter';
import { getParentBinding, updateParentLastActive } from '../firestore/parent-bindings';
import { getParentInvite, markInviteUsed } from '../firestore/parent-invites';
import { createParentBinding } from '../firestore/parent-bindings';
import { parseParentIntent as parseParentIntentKeyword, executeParentIntent, tryKnowledgeBase, detectAndBuildFlexCard, flexToPlainText, type ParentIntentResult, type ParentIntent } from '../handlers/parent-intent-router';
import { parseParentIntent as parseParentIntentAI, type ParentContext } from '../modules/ai-engine';
import { createCrossBotRequest, notifyAdminOfParentRequest, notifyAdminOfParentMessage } from '../modules/cross-bot-bridge';
import { saveConversation } from '../firestore/parent-conversations';
import { saveBotConversation } from '../firestore/bot-conversations';
import { callParentApi } from '../modules/parent-api-client';
import { sendMessage } from '../utils/telegram';
import { checkRateLimit } from '../utils/rate-limit';
import { getAdminChatId } from '../firestore/admin-lookup';
import { logger } from '../utils/logger';
import type { TelegramUpdate } from '../utils/telegram';
import type { ParentBinding, ParentChild } from '../firestore/parent-bindings';
import { getDemoSession, handleDemoStart, handleDemoExit, handleDemoMessage } from '../demo/index.js';
import { getMemoryContext, recordTurn } from '../memory/index.js';
import type { MemoryContext } from '../memory/types.js';
import { recordBotEvent } from '../firestore/bot-health';
// Group mode imports
import { getGroupBinding, createGroupBinding, deleteGroupBinding } from '../firestore/group-bindings';
import { getBinding } from '../firestore/bindings';
import { parseMention } from '../utils/mention-parser';
import { handleGroupIntent, buildGroupContext } from '../handlers/group-intent-router';
import { config } from '../config';

// Map AI intents to parent execution intents
const AI_INTENT_MAP: Record<string, ParentIntent> = {
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
  'info.enrollment': 'parent.info',
  'greeting': 'parent.help',
  'thanks': 'parent.help',
  'feedback': 'parent.unknown',
  'transfer': 'parent.unknown',
  'unknown': 'parent.unknown',
};

function buildParentContext(binding: ParentBinding): ParentContext {
  return {
    parentName: binding.parent_name,
    children: binding.children.map((c) => ({
      name: c.student_name,
      id: c.student_id,
      className: '',
    })),
  };
}

function matchChildFromAI(
  params: Record<string, unknown>,
  binding: ParentBinding
): { child_name?: string; student_id?: string } {
  const name = (params.student_name ?? params.child_name) as string | undefined;
  if (name) {
    const matched = binding.children.find(
      (c) => c.student_name.includes(name) || name.includes(c.student_name)
    );
    if (matched) return { child_name: matched.student_name, student_id: matched.student_id };
  }
  if (binding.children.length === 1) {
    return { child_name: binding.children[0].student_name, student_id: binding.children[0].student_id };
  }
  return {};
}

async function smartParseIntent(
  text: string,
  binding: ParentBinding,
  memoryCtx?: MemoryContext
): Promise<{ result: ParentIntentResult; clarification?: string; aiResponse?: string; aiIntent?: string }> {
  // Try AI first
  try {
    const parentCtx = buildParentContext(binding);
    const ai = await parseParentIntentAI(text, parentCtx, memoryCtx ?? null, binding.tenant_id);

    if (ai.need_clarification) {
      return {
        result: { intent: 'parent.unknown', params: {} },
        clarification: ai.ai_response ?? ai.clarification_question ?? undefined,
        aiIntent: ai.intent,
      };
    }

    // Conversational intents — use AI response directly
    if (ai.intent === 'greeting' || ai.intent === 'thanks' || ai.intent === 'feedback' || ai.intent === 'transfer') {
      if (ai.ai_response) {
        return {
          result: { intent: 'parent.unknown', params: {} },
          aiResponse: ai.ai_response,
          aiIntent: ai.intent,
        };
      }
    }

    const intent = AI_INTENT_MAP[ai.intent] ?? 'parent.unknown';
    const child = matchChildFromAI(ai.params, binding);

    return {
      result: {
        intent,
        params: {
          ...child,
          date: ai.params.date as string | undefined,
          reason: ai.params.reason as string | undefined,
        },
      },
      aiResponse: ai.ai_response ?? undefined,
    };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err : new Error(String(err)) }, '[ParentBot] AI parsing failed, falling back to keywords');
  }

  // Fallback to keyword matching
  return { result: parseParentIntentKeyword(text, binding) };
}

export const telegramParentWebhook = new Hono();

telegramParentWebhook.post('/', async (c) => {
  let update: TelegramUpdate;
  try {
    update = await c.req.json();
  } catch {
    logger.error('[ParentBot] Invalid JSON in webhook request');
    return c.json({ ok: true });
  }

  const msg = parseTelegramUpdate(update);
  if (!msg) return c.json({ ok: true });

  // ── Group mode routing ──
  if (msg.chatType === 'group' || msg.chatType === 'supergroup') {
    return handleGroupMessage(c, msg);
  }

  // ── Private chat flow (below) ──

  // Rate limit
  if (!await checkRateLimit(`parent_${msg.userId}`)) {
    await sendMessage(msg.chatId, '⚠️ 操作太頻繁，請稍後再試', undefined, 'parent');
    return c.json({ ok: true });
  }

  const text = msg.content.trim();

  // Handle /start before auth check
  if (text === '/start') {
    await sendMessage(
      msg.chatId,
      '👋 歡迎使用<b>順風耳家長 Bot</b>！\n\n' +
      '請先輸入補習班提供的邀請碼進行綁定：\n' +
      '<code>/bind 123456</code>\n\n' +
      '綁定後即可查詢孩子的出缺勤、成績、繳費等資訊。',
      undefined,
      'parent'
    );
    return c.json({ ok: true });
  }

  // Handle /bind for parent
  if (text.startsWith('/bind')) {
    try {
      await handleParentBind(msg.chatId, msg.userId, msg.userName, text.replace('/bind', '').trim());
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[ParentBot] handleParentBind error')
      await sendMessage(msg.chatId, '⚠️ 綁定操作失敗，請稍後再試', undefined, 'parent').catch((e: unknown) => { logger.warn({ err: e instanceof Error ? e : new Error(String(e)) }, '[ParentBot] sendMessage failed after bind error'); });
    }
    return c.json({ ok: true });
  }

  // Demo mode
  if (text === '/demo') {
    try {
      await handleDemoStart(msg.chatId, msg.userId, 'parent');
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[ParentBot] handleDemoStart error');
    }
    return c.json({ ok: true });
  }
  if (text === '/exit') {
    try {
      await handleDemoExit(msg.chatId, msg.userId, 'parent');
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[ParentBot] handleDemoExit error');
    }
    return c.json({ ok: true });
  }

  // Demo mode intercept
  const demoSession = getDemoSession('parent', msg.userId);
  if (demoSession) {
    try {
      await handleDemoMessage(msg, demoSession);
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[ParentBot] handleDemoMessage error');
      await sendMessage(msg.chatId, '⚠️ Demo 操作失敗，請稍後再試', undefined, 'parent');
    }
    return c.json({ ok: true });
  }

  // Auth check: parent must be bound
  const binding = await getParentBinding(msg.userId);
  if (!binding) {
    await sendMessage(
      msg.chatId,
      '👋 您尚未綁定，請先輸入補習班提供的邀請碼：\n<code>/bind 123456</code>',
      undefined,
      'parent'
    );
    return c.json({ ok: true });
  }

  // Update last active (fire-and-forget)
  updateParentLastActive(msg.userId).catch((err: unknown) => {
    logger.error({ err: err instanceof Error ? err : new Error(String(err)) }, '[ParentBot] Failed to update last_active_at')
  });

  // Parse intent and respond
  try {
    if (text === '/help') {
      const response = await executeParentIntent({ intent: 'parent.help', params: {} }, binding);
      await sendMessage(msg.chatId, response, undefined, 'parent');
      return c.json({ ok: true });
    }

    // Fetch memory context (non-blocking — don't let memory failure break the bot)
    let memoryCtx: MemoryContext | undefined;
    try {
      memoryCtx = await getMemoryContext('parent', msg.userId, binding.tenant_id);
    } catch (memErr) {
      logger.warn({ err: memErr instanceof Error ? memErr : new Error(String(memErr)) }, '[ParentBot] Memory context fetch failed, continuing without memory');
    }

    const { result: intentResult, clarification, aiResponse, aiIntent } = await smartParseIntent(text, binding, memoryCtx);

    // Helper: save conversation record for admin review
    const logConversation = (botReply: string, intent: string) => {
      saveConversation({
        tenant_id: binding.tenant_id,
        parent_user_id: msg.userId,
        parent_name: msg.userName,
        chat_type: 'private',
        user_message: text,
        bot_response: botReply,
        intent,
      });
      // Dual-write to unified collection
      saveBotConversation({
        tenantId: binding.tenant_id,
        botType: 'windear',
        platform: 'telegram',
        userId: msg.userId,
        userName: msg.userName,
        userRole: 'parent',
        userMessage: text,
        botReply: botReply,
        intent,
        model: 'gemini-2.5-flash-lite',
        latencyMs: 0,
        createdAt: new Date(),
      }).catch(() => {});
    };

    // AI asked for clarification
    if (clarification) {
      await sendMessage(msg.chatId, `🤔 ${clarification}`, undefined, 'parent');
      recordTurn('parent', msg.userId, binding.tenant_id, text, clarification, intentResult.intent);
      logConversation(clarification, aiIntent ?? intentResult.intent);
      return c.json({ ok: true });
    }

    // AI 直接回覆的對話（greeting, thanks, feedback, transfer）
    if (aiResponse && intentResult.intent === 'parent.unknown' && !clarification) {
      await sendMessage(msg.chatId, aiResponse, undefined, 'parent');
      recordTurn('parent', msg.userId, binding.tenant_id, text, aiResponse, 'chat');
      logConversation(aiResponse, aiIntent ?? 'chat');

      // 🔥 轉達/意見回饋 — 真的通知千里眼
      if (aiIntent === 'transfer' || aiIntent === 'feedback') {
        try {
          const adminChatId = await getAdminChatId(binding.tenant_id);
          if (adminChatId) {
            await notifyAdminOfParentMessage(
              adminChatId,
              msg.userName,
              text,
              aiResponse,
              aiIntent as 'transfer' | 'feedback'
            );
          }
        } catch (relayErr) {
          logger.warn({ err: relayErr instanceof Error ? relayErr : new Error(String(relayErr)) }, '[ParentBot] Failed to relay message to admin');
        }
      }
      return c.json({ ok: true });
    }

    // Handle leave requests via cross-bot bridge
    if (intentResult.intent === 'parent.leave') {
      await handleLeaveRequest(msg.chatId, msg.userId, intentResult, binding);
      logConversation('（請假申請已送出）', 'parent.leave');
      return c.json({ ok: true });
    }

    // Handle unknown intents — try AI response, then knowledge base
    if (intentResult.intent === 'parent.unknown') {
      if (aiResponse) {
        await sendMessage(msg.chatId, aiResponse, undefined, 'parent');
        recordTurn('parent', msg.userId, binding.tenant_id, text, aiResponse, intentResult.intent);
        logConversation(aiResponse, aiIntent ?? intentResult.intent);
        return c.json({ ok: true });
      }
      const kbAnswer = await tryKnowledgeBase(text, binding.tenant_id);
      if (kbAnswer) {
        await sendMessage(msg.chatId, kbAnswer, undefined, 'parent');
        recordTurn('parent', msg.userId, binding.tenant_id, text, kbAnswer, intentResult.intent);
        logConversation(kbAnswer, intentResult.intent);
        return c.json({ ok: true });
      }
    }

    // Execute intent via real API
    const apiResult = await executeParentIntent(intentResult, binding);
    // 用 aiResponse 當自然語言前綴，讓回覆更像人
    const reply = aiResponse ? `${aiResponse}\n\n${apiResult}` : apiResult;

    // 嘗試偵測是否有 Flex Message 卡片（課表、學費、推薦）
    // 目前 bot 為 Telegram，Flex Message 以 altText 純文字傳送；
    // 未來接 LINE Messaging API 時只需換成 sendFlexMessage(chatId, flex)
    try {
      const flexCard = await detectAndBuildFlexCard(text, intentResult, binding);
      if (flexCard) {
        // Telegram fallback：使用 altText 作為提示，完整文字另附
        const flexHint = `[Flex Card] ${flexToPlainText(flexCard)}`;
        logger.info({ intent: intentResult.intent, altText: flexCard.altText }, '[ParentBot] Flex Message built');
        await sendMessage(msg.chatId, `${reply}\n\n${flexHint}`, undefined, 'parent');
        recordTurn('parent', msg.userId, binding.tenant_id, text, reply, intentResult.intent);
        logConversation(reply, intentResult.intent);
        return c.json({ ok: true });
      }
    } catch (flexErr) {
      logger.warn({ err: flexErr instanceof Error ? flexErr : new Error(String(flexErr)) }, '[ParentBot] Flex card build failed, falling back to text');
    }

    await sendMessage(msg.chatId, reply, undefined, 'parent');
    recordTurn('parent', msg.userId, binding.tenant_id, text, reply, intentResult.intent);
    logConversation(reply, intentResult.intent);
    recordBotEvent(binding.tenant_id, 'windear', 'telegram', true).catch(() => {});
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[ParentBot] Error processing message')
    recordBotEvent(binding.tenant_id, 'windear', 'telegram', false, undefined, error instanceof Error ? error.message : String(error)).catch(() => {});
    await sendMessage(
      msg.chatId,
      '不好意思，我剛剛沒接住 😅 可以再說一次嗎？\n\n您可以試試：「查出勤」「查學費」「查課表」',
      undefined,
      'parent'
    );
  }

  return c.json({ ok: true });
});

async function handleLeaveRequest(
  chatId: string,
  userId: string,
  intentResult: { params: { child_name?: string; student_id?: string; date?: string; reason?: string } },
  binding: { tenant_id: string; children: Array<{ student_id: string; student_name: string; relation: string }> }
): Promise<void> {
  const { params } = intentResult;
  const studentId = params.student_id;
  const childName = params.child_name;

  // Must identify which child
  if (!studentId) {
    if (binding.children.length > 1) {
      const childList = binding.children.map((c, i) => `${i + 1}. ${c.student_name}`).join('\n');
      await sendMessage(
        chatId,
        `📝 請問要幫哪位孩子請假呢？\n\n${childList}\n\n請輸入孩子的名字，例如「幫小明明天請假」`,
        undefined,
        'parent'
      );
    } else {
      await sendMessage(
        chatId,
        `📝 請告訴我請假的日期和原因，例如「幫${binding.children[0].student_name}明天請假，腸胃炎」`,
        undefined,
        'parent'
      );
    }
    return;
  }

  // Must have date
  if (!params.date) {
    await sendMessage(
      chatId,
      `📅 請問 ${childName} 要請哪一天的假呢？\n\n例如「明天」、「1/5」、「1月5日」`,
      undefined,
      'parent'
    );
    return;
  }

  const reason = params.reason ?? '家長代請假';

  // Validate leave request via inclass backend
  const leaveRes = await callParentApi('inclass', '/leave', binding.tenant_id, {
    method: 'POST',
    body: {
      student_id: studentId,
      student_name: childName,
      date: params.date,
      reason,
    },
  });

  if (!leaveRes.success) {
    await sendMessage(
      chatId,
      `⚠️ 請假申請失敗：${leaveRes.message ?? '系統錯誤'}，請稍後再試 🙏`,
      undefined,
      'parent'
    );
    return;
  }

  // Create cross-bot request to notify admin
  const requestId = await createCrossBotRequest({
    type: 'leave_request',
    from_bot: 'parent',
    to_bot: 'admin',
    tenant_id: binding.tenant_id,
    student_id: studentId,
    student_name: childName ?? '未知',
    parent_telegram_user_id: userId,
    parent_chat_id: chatId,
    data: { date: params.date, reason },
  });

  // Try to notify admin via 千里眼
  try {
    const adminChatId = await getAdminChatId(binding.tenant_id);
    if (adminChatId) {
      await notifyAdminOfParentRequest(adminChatId, requestId, childName ?? '學生', { date: params.date, reason });
    }
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[ParentBot] Failed to notify admin')
  }

  // Confirm to parent
  await sendMessage(
    chatId,
    `📝 收到！我已經幫您向老師提出 <b>${childName}</b> ${params.date} 的請假申請，原因：${reason}。\n\n老師確認後會立即通知您，祝早日康復 🙏`,
    undefined,
    'parent'
  );
}

async function handleParentBind(chatId: string, userId: string, userName: string, args: string): Promise<void> {
  const code = args.trim();
  if (!code || code.length !== 6) {
    await sendMessage(chatId, '❌ 格式錯誤，請輸入：/bind 123456', undefined, 'parent');
    return;
  }

  const invite = await getParentInvite(code);
  if (!invite) {
    await sendMessage(chatId, '❌ 邀請碼不存在或已過期', undefined, 'parent');
    return;
  }

  if (invite.status === 'used') {
    await sendMessage(chatId, '❌ 此邀請碼已被使用', undefined, 'parent');
    return;
  }

  const expiresAt = invite.expires_at instanceof Date ? invite.expires_at : new Date(invite.expires_at);
  if (expiresAt < new Date()) {
    await sendMessage(chatId, '❌ 邀請碼已過期，請聯繫補習班重新生成', undefined, 'parent');
    return;
  }

  const existing = await getParentBinding(userId);
  if (existing) {
    const alreadyHasChild = existing.children.some((c) => c.student_id === invite.student_id);
    if (alreadyHasChild) {
      await sendMessage(chatId, '⚠️ 您已綁定此學生', undefined, 'parent');
      return;
    }
    existing.children.push({
      student_id: invite.student_id,
      student_name: invite.student_name,
      relation: '家長',
    });
    await createParentBinding({
      telegram_user_id: userId,
      tenant_id: existing.tenant_id,
      parent_name: existing.parent_name,
      children: existing.children,
    });
  } else {
    await createParentBinding({
      telegram_user_id: userId,
      tenant_id: invite.tenant_id,
      parent_name: userName,
      children: [{
        student_id: invite.student_id,
        student_name: invite.student_name,
        relation: '家長',
      }],
    });
  }

  await markInviteUsed(code, userId);

  await sendMessage(
    chatId,
    `✅ 綁定成功！\n👤 學生：${invite.student_name}\n\n` +
    `現在您可以查詢孩子的資訊，例如：\n` +
    `「查出缺勤」、「查繳費」、「查課表」、「幫小明請假」`,
    undefined,
    'parent'
  );
}

// ── Group Message Handler ──

import type { UnifiedMessage } from '../modules/platform-adapter';
import type { Context } from 'hono';

async function handleGroupMessage(c: Context, msg: UnifiedMessage): Promise<Response> {
  const text = msg.content.trim();
  const botUsername = config.TELEGRAM_PARENT_BOT_USERNAME ?? '';

  // Rate limit per group (silent drop, don't spam the group)
  if (!await checkRateLimit(`group_${msg.chatId}`)) {
    return c.json({ ok: true });
  }

  // Handle /setup command — only admins can bind groups
  if (text.startsWith('/setup')) {
    try {
      await handleGroupSetup(msg.chatId, msg.userId, msg.userName, botUsername);
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[ParentBot:Group] setup error');
    }
    return c.json({ ok: true });
  }

  // Handle /unbind command — admin removes group binding
  if (text.startsWith('/unbind') || text.startsWith('/remove')) {
    try {
      await handleGroupUnbind(msg.chatId, msg.userId);
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[ParentBot:Group] unbind error');
    }
    return c.json({ ok: true });
  }

  // Check group binding — unbound groups only respond to /setup
  const groupBinding = await getGroupBinding(msg.chatId);
  if (!groupBinding) {
    return c.json({ ok: true }); // Silently ignore unbound groups
  }

  // Check if bot is mentioned or command is directed at it
  const mention = parseMention(text, botUsername);
  if (!mention.isMentioned) {
    return c.json({ ok: true }); // Not mentioned, ignore
  }

  const cleanText = mention.cleanText;
  if (!cleanText) {
    return c.json({ ok: true });
  }

  // Build group context with knowledge base
  try {
    const groupCtx = await buildGroupContext(
      groupBinding.tenant_name,
      groupBinding.tenant_id,
      botUsername
    );

    // Process via group intent router
    const response = await handleGroupIntent(cleanText, groupCtx, groupBinding.tenant_id);

    await sendMessage(msg.chatId, response.text, undefined, 'parent');
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[ParentBot:Group] Error processing group message');
    // Don't send error messages in groups to avoid spam
  }

  return c.json({ ok: true });
}

async function handleGroupSetup(
  chatId: string,
  userId: string,
  userName: string,
  botUsername: string
): Promise<void> {
  // Only admins (千里眼 bound users) can set up groups
  const adminBinding = await getBinding(userId);
  if (!adminBinding) {
    await sendMessage(
      chatId,
      '⚠️ 只有補習班管理員可以設定群組綁定。\n\n請先在千里眼（管理員 Bot）完成綁定，再到群組執行 /setup',
      undefined,
      'parent'
    );
    return;
  }

  // Check if already bound
  const existing = await getGroupBinding(chatId);
  if (existing) {
    await sendMessage(
      chatId,
      `ℹ️ 此群組已綁定「${existing.tenant_name}」\n\n如需更改，請先執行 /unbind 解除綁定`,
      undefined,
      'parent'
    );
    return;
  }

  // Create group binding using admin's active tenant
  await createGroupBinding({
    chat_id: chatId,
    tenant_id: adminBinding.active_tenant_id,
    tenant_name: adminBinding.active_tenant_name,
    group_name: '',
    added_by: userId,
    bot_username: botUsername,
    active: true,
  });

  await sendMessage(
    chatId,
    `✅ 群組綁定成功！\n\n🏫 補習班：${adminBinding.active_tenant_name}\n👤 設定者：${userName}\n\n現在群組成員可以 @${botUsername || '順風耳'} 詢問課程、學費、師資、升學建議等公開資訊 📚\n\n⚠️ 個人資料（出缺勤、繳費）請私聊查詢`,
    undefined,
    'parent'
  );
}

async function handleGroupUnbind(chatId: string, userId: string): Promise<void> {
  // Only admins can unbind
  const adminBinding = await getBinding(userId);
  if (!adminBinding) {
    await sendMessage(chatId, '⚠️ 只有管理員可以解除群組綁定', undefined, 'parent');
    return;
  }

  const existing = await getGroupBinding(chatId);
  if (!existing) {
    await sendMessage(chatId, 'ℹ️ 此群組尚未綁定任何補習班', undefined, 'parent');
    return;
  }

  // Verify the admin belongs to the same tenant
  const hasTenant = adminBinding.bindings.some((b) => b.tenant_id === existing.tenant_id);
  if (!hasTenant) {
    await sendMessage(chatId, '⚠️ 您不是此群組綁定補習班的管理員', undefined, 'parent');
    return;
  }

  await deleteGroupBinding(chatId);

  await sendMessage(
    chatId,
    `✅ 已解除群組綁定（${existing.tenant_name}）\n\n順風耳將不再回應此群組的訊息`,
    undefined,
    'parent'
  );
}
