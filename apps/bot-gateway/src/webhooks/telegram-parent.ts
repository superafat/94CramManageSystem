import { Hono } from 'hono';
import { parseTelegramUpdate } from '../modules/platform-adapter';
import { getParentBinding, updateParentLastActive } from '../firestore/parent-bindings';
import { getParentInvite, markInviteUsed } from '../firestore/parent-invites';
import { createParentBinding } from '../firestore/parent-bindings';
import { parseParentIntent, executeParentIntent, tryKnowledgeBase } from '../handlers/parent-intent-router';
import { createCrossBotRequest, notifyAdminOfParentRequest } from '../modules/cross-bot-bridge';
import { callParentApi } from '../modules/parent-api-client';
import { sendMessage } from '../utils/telegram';
import { checkRateLimit } from '../utils/rate-limit';
import { getAdminChatId } from '../firestore/admin-lookup';
import type { TelegramUpdate } from '../utils/telegram';

export const telegramParentWebhook = new Hono();

telegramParentWebhook.post('/', async (c) => {
  let update: TelegramUpdate;
  try {
    update = await c.req.json();
  } catch {
    console.error('[ParentBot] Invalid JSON in webhook request');
    return c.json({ ok: true });
  }

  const msg = parseTelegramUpdate(update);
  if (!msg) return c.json({ ok: true });

  // Rate limit
  if (!checkRateLimit(`parent_${msg.userId}`)) {
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
      console.error('[ParentBot] handleParentBind error:', error);
      await sendMessage(msg.chatId, '⚠️ 綁定操作失敗，請稍後再試', undefined, 'parent').catch(() => {});
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
    console.error('[ParentBot] Failed to update last_active_at:', err);
  });

  // Parse intent and respond
  try {
    if (text === '/help') {
      const response = await executeParentIntent({ intent: 'parent.help', params: {} }, binding);
      await sendMessage(msg.chatId, response, undefined, 'parent');
      return c.json({ ok: true });
    }

    const intentResult = parseParentIntent(text, binding);

    // Handle leave requests via cross-bot bridge
    if (intentResult.intent === 'parent.leave') {
      await handleLeaveRequest(msg.chatId, msg.userId, intentResult, binding);
      return c.json({ ok: true });
    }

    // Handle unknown intents — try knowledge base first
    if (intentResult.intent === 'parent.unknown') {
      const kbAnswer = await tryKnowledgeBase(text, binding.tenant_id);
      if (kbAnswer) {
        await sendMessage(msg.chatId, kbAnswer, undefined, 'parent');
        return c.json({ ok: true });
      }
    }

    // Execute intent via real API
    const response = await executeParentIntent(intentResult, binding);
    await sendMessage(msg.chatId, response, undefined, 'parent');
  } catch (error) {
    console.error('[ParentBot] Error processing message:', error);
    await sendMessage(msg.chatId, '⚠️ 系統發生錯誤，請稍後再試', undefined, 'parent');
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
    console.error('[ParentBot] Failed to notify admin:', error);
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
