import { getPendingAction, confirmAction, cancelAction } from '../modules/confirm-manager';
import { executeIntent, formatResponse } from './intent-router';
import { authenticate } from '../modules/auth-manager';
import { logOperation } from '../firestore/logs';
import { incrementUsage } from '../firestore/usage';
import { answerCallbackQuery, editMessageText } from '../utils/telegram';
import type { UnifiedMessage } from '../modules/platform-adapter';

export async function handleCallback(msg: UnifiedMessage): Promise<void> {
  const [action, actionId] = msg.content.split(':');
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
    };

    const apiResponse = await executeIntent(intentResult, auth);
    incrementUsage(auth.tenantId, 'api_calls').catch(() => {});
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
