import { getPendingAction, confirmAction, cancelAction } from '../modules/confirm-manager';
import { executeIntent, formatResponse } from './intent-router';
import { authenticate } from '../modules/auth-manager';
import { logOperation } from '../firestore/logs';
import { incrementUsage } from '../firestore/usage';
import { handleCrossBotDecision, notifyParentResult } from '../modules/cross-bot-bridge';
import { answerCallbackQuery, editMessageText } from '../utils/telegram';
import { logger } from '../utils/logger';
import type { UnifiedMessage } from '../modules/platform-adapter';

export async function handleCallback(msg: UnifiedMessage): Promise<void> {
  const parts = msg.content.split(':');

  // Handle cross-bot callbacks: crossbot:approve:xxx or crossbot:reject:xxx
  if (parts[0] === 'crossbot' && parts.length === 3) {
    await handleCrossBotCallback(msg, parts[1], parts[2]);
    return;
  }

  const [action, actionId] = parts;
  if (!actionId) return;

  await answerCallbackQuery(msg.callbackQueryId!);

  const pending = await getPendingAction(actionId);
  if (!pending || pending.status !== 'pending') {
    if (msg.originalMessageId) {
      await editMessageText(msg.chatId, msg.originalMessageId, '⚠️ 此操作已過期或已處理');
    }
    return;
  }

  if (pending.expires_at < new Date()) {
    await cancelAction(actionId);
    if (msg.originalMessageId) {
      await editMessageText(msg.chatId, msg.originalMessageId, '⏰ 此操作已逾時，已自動取消');
    }
    return;
  }

  if (action === 'cancel') {
    await cancelAction(actionId);
    await logOperation({
      telegram_user_id: msg.userId,
      tenant_id: pending.tenant_id,
      tenant_name: pending.tenant_name,
      intent: pending.intent,
      params: pending.params,
      status: 'cancelled',
      created_at: new Date(),
    });
    if (msg.originalMessageId) {
      await editMessageText(msg.chatId, msg.originalMessageId, '❌ 已取消');
    }
    return;
  }

  if (action === 'confirm') {
    await confirmAction(actionId);

    const auth = await authenticate(msg.userId);
    if (!auth) return;

    const intentResult = {
      intent: pending.intent,
      confidence: 1,
      params: pending.params,
      need_clarification: false,
      clarification_question: null,
      ai_response: null,
    };

    const apiResponse = await executeIntent(intentResult, auth);
    incrementUsage(auth.tenantId, 'api_calls').catch((err: unknown) => {
      logger.error({ err: err instanceof Error ? err : new Error(String(err)) }, '[Callback] Failed to increment usage')
    });
    const responseText = formatResponse(apiResponse);

    await logOperation({
      telegram_user_id: msg.userId,
      tenant_id: pending.tenant_id,
      tenant_name: pending.tenant_name,
      intent: pending.intent,
      params: pending.params,
      status: apiResponse.success ? 'confirmed' : 'error',
      api_response: apiResponse as unknown as Record<string, unknown>,
      error_message: apiResponse.success ? undefined : apiResponse.message,
      created_at: new Date(),
    });

    if (msg.originalMessageId) {
      await editMessageText(msg.chatId, msg.originalMessageId, responseText);
    }
  }
}

async function handleCrossBotCallback(msg: UnifiedMessage, action: string, requestId: string): Promise<void> {
  await answerCallbackQuery(msg.callbackQueryId!);

  const approved = action === 'approve';
  const request = await handleCrossBotDecision(requestId, approved);

  if (!request) {
    if (msg.originalMessageId) {
      await editMessageText(msg.chatId, msg.originalMessageId, '⚠️ 此請求已過期或已處理');
    }
    return;
  }

  // Update the admin message
  const statusText = approved ? '✅ 已確認' : '❌ 已拒絕';
  const date = request.data.date as string ?? '';
  const reason = request.data.reason as string ?? '';
  if (msg.originalMessageId) {
    await editMessageText(
      msg.chatId,
      msg.originalMessageId,
      `📩 <b>家長代請假通知</b>\n\n` +
      `👤 學生：${request.student_name}\n` +
      `📅 日期：${date}\n` +
      `📝 原因：${reason}\n\n` +
      `${statusText}`
    );
  }

  // Notify parent of the decision
  await notifyParentResult(
    request.parent_chat_id,
    request.student_name,
    approved,
    request.data
  );
}
