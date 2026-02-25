/**
 * Cross-Bot Bridge — 順風耳 ↔ 千里眼 Firestore Queue
 *
 * Flow: Parent requests (e.g. leave) → queue entry → admin notification →
 *       admin approve/reject → update queue → notify parent of result
 */
import { firestore } from '../firestore/client';
import { sendMessage, type InlineKeyboardButton } from '../utils/telegram';

export interface CrossBotRequest {
  type: 'leave_request';
  from_bot: 'parent' | 'admin';
  to_bot: 'parent' | 'admin';
  tenant_id: string;
  student_id: string;
  student_name: string;
  parent_telegram_user_id: string;
  parent_chat_id: string;
  admin_chat_id?: string;
  data: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  created_at: Date;
  updated_at: Date;
}

const col = firestore.collection('bot_cross_bot_queue');

/**
 * Create a cross-bot request (e.g. parent leave → admin)
 */
export async function createCrossBotRequest(
  request: Omit<CrossBotRequest, 'status' | 'created_at' | 'updated_at'>
): Promise<string> {
  const doc = await col.add({
    ...request,
    status: 'pending',
    created_at: new Date(),
    updated_at: new Date(),
  });
  return doc.id;
}

/**
 * Get a pending cross-bot request by ID
 */
export async function getCrossBotRequest(requestId: string): Promise<(CrossBotRequest & { id: string }) | null> {
  const doc = await col.doc(requestId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as CrossBotRequest) };
}

/**
 * Admin confirms or rejects a cross-bot request
 */
export async function handleCrossBotDecision(
  requestId: string,
  approved: boolean
): Promise<CrossBotRequest | null> {
  const doc = await col.doc(requestId).get();
  if (!doc.exists) return null;

  const request = doc.data() as CrossBotRequest;
  if (request.status !== 'pending') return null;

  const newStatus = approved ? 'approved' : 'rejected';
  await col.doc(requestId).update({
    status: newStatus,
    updated_at: new Date(),
  });

  return { ...request, status: newStatus };
}

/**
 * Notify admin (千里眼) about a parent request with approve/reject buttons
 */
export async function notifyAdminOfParentRequest(
  adminChatId: string,
  requestId: string,
  studentName: string,
  data: Record<string, unknown>
): Promise<void> {
  const date = data.date as string ?? '未指定';
  const reason = data.reason as string ?? '未說明';

  const text =
    `📩 <b>家長代請假通知</b>\n\n` +
    `👤 學生：${studentName}\n` +
    `📅 日期：${date}\n` +
    `📝 原因：${reason}\n\n` +
    `請確認是否核准：`;

  const keyboard: InlineKeyboardButton[][] = [
    [
      { text: '✅ 確認', callback_data: `crossbot:approve:${requestId}` },
      { text: '❌ 拒絕', callback_data: `crossbot:reject:${requestId}` },
    ],
  ];

  await sendMessage(adminChatId, text, { reply_markup: { inline_keyboard: keyboard } });

  // Store admin_chat_id for later notification
  await col.doc(requestId).update({ admin_chat_id: adminChatId });
}

/**
 * Notify parent (順風耳) of the admin's decision
 */
export async function notifyParentResult(
  parentChatId: string,
  studentName: string,
  approved: boolean,
  data: Record<string, unknown>
): Promise<void> {
  const date = data.date as string ?? '';
  if (approved) {
    await sendMessage(
      parentChatId,
      `✅ 班主任已確認 <b>${studentName}</b> ${date} 的請假申請。\n\n祝早日康復 🙏`,
      undefined,
      'parent'
    );
  } else {
    await sendMessage(
      parentChatId,
      `❌ 班主任未核准 <b>${studentName}</b> ${date} 的請假申請。\n\n如有疑問，請直接聯繫補習班 📞`,
      undefined,
      'parent'
    );
  }
}

/**
 * Get pending requests for a tenant (for admin dashboard)
 */
export async function listPendingRequests(tenantId: string): Promise<Array<CrossBotRequest & { id: string }>> {
  const snapshot = await col
    .where('tenant_id', '==', tenantId)
    .where('status', '==', 'pending')
    .orderBy('created_at', 'desc')
    .limit(20)
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as CrossBotRequest) }));
}
