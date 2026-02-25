import { firestore } from './client';

export type NotificationType = 'arrival' | 'departure' | 'grade' | 'payment';

export interface BotNotification {
  tenant_id: string;
  telegram_user_id: string;
  type: NotificationType;
  message: string;
  sent_at: Date;
}

const col = firestore.collection('bot_notifications');

export async function logNotification(notification: Omit<BotNotification, 'sent_at'>): Promise<void> {
  await col.add({ ...notification, sent_at: new Date() });
}

export async function listNotifications(
  tenantId: string,
  limit = 50
): Promise<BotNotification[]> {
  const snapshot = await col
    .where('tenant_id', '==', tenantId)
    .orderBy('sent_at', 'desc')
    .limit(limit)
    .get();
  return snapshot.docs.map((doc) => doc.data() as BotNotification);
}
