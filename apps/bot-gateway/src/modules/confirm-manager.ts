import { createPendingAction, confirmAction, cancelAction, getPendingAction } from '../firestore/pending-actions';
import { sendMessage, type InlineKeyboardButton } from '../utils/telegram';
import type { IntentResult } from './ai-engine';

const INTENT_LABELS: Record<string, string> = {
  'inclass.leave': '登記請假',
  'inclass.late': '登記遲到',
  'manage.payment': '登記繳費',
  'manage.add_student': '新增學生',
  'stock.ship': '出貨（減庫存）',
  'stock.restock': '進貨（加庫存）',
};

function formatParams(intent: string, params: Record<string, unknown>): string {
  const lines: string[] = [];
  if (params.student_name) lines.push(`學生：${params.student_name}`);
  if (params.class_name) lines.push(`班級：${params.class_name}`);
  if (params.date) lines.push(`日期：${params.date}`);
  if (params.reason) lines.push(`原因：${params.reason}`);
  if (params.amount) lines.push(`金額：NT$ ${Number(params.amount).toLocaleString()}`);
  if (params.item_name) lines.push(`品項：${params.item_name}`);
  if (params.quantity) lines.push(`數量：${params.quantity}`);
  if (params.destination) lines.push(`目的地：${params.destination}`);
  if (params.name) lines.push(`姓名：${params.name}`);
  if (params.parent_phone) lines.push(`家長電話：${params.parent_phone}`);
  return lines.join('\n');
}

export async function requestConfirmation(
  chatId: string,
  userId: string,
  tenantId: string,
  tenantName: string,
  intentResult: IntentResult
): Promise<void> {
  const label = INTENT_LABELS[intentResult.intent] ?? intentResult.intent;
  const paramText = formatParams(intentResult.intent, intentResult.params);

  const actionId = await createPendingAction({
    telegram_user_id: userId,
    telegram_chat_id: chatId,
    tenant_id: tenantId,
    tenant_name: tenantName,
    intent: intentResult.intent,
    params: intentResult.params,
    status: 'pending',
    created_at: new Date(),
    expires_at: new Date(Date.now() + 5 * 60 * 1000),
  });

  const text = `📋 請確認：\n🏫 ${tenantName}\n操作：${label}\n${paramText}`;

  const keyboard: InlineKeyboardButton[][] = [
    [
      { text: '✅ 確認', callback_data: `confirm:${actionId}` },
      { text: '❌ 取消', callback_data: `cancel:${actionId}` },
    ],
  ];

  await sendMessage(chatId, text, { reply_markup: { inline_keyboard: keyboard } });
}

export { confirmAction, cancelAction, getPendingAction };
