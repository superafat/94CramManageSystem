import { firestore } from './client';

export interface PendingAction {
  id?: string;
  telegram_user_id: string;
  telegram_chat_id: string;
  tenant_id: string;
  tenant_name: string;
  intent: string;
  params: Record<string, unknown>;
  confirm_message_id?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired';
  created_at: Date;
  expires_at: Date;
}

const col = firestore.collection('bot_pending_actions');

export async function createPendingAction(action: Omit<PendingAction, 'id'>): Promise<string> {
  const ref = await col.add(action);
  return ref.id;
}

export async function getPendingAction(actionId: string): Promise<PendingAction | null> {
  const doc = await col.doc(actionId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as PendingAction;
}

export async function confirmAction(actionId: string): Promise<void> {
  await col.doc(actionId).update({ status: 'confirmed' });
}

export async function cancelAction(actionId: string): Promise<void> {
  await col.doc(actionId).update({ status: 'cancelled' });
}

export async function getPendingByUser(telegramUserId: string): Promise<PendingAction | null> {
  const snapshot = await col
    .where('telegram_user_id', '==', telegramUserId)
    .where('status', '==', 'pending')
    .orderBy('created_at', 'desc')
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as PendingAction;
}
