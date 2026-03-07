import { firestore } from './client';
import type { BotType } from './bot-prompt-settings';

export interface BotConversation {
  tenantId: string;
  botType: BotType;
  platform: 'telegram' | 'line';
  userId: string;
  userName: string;
  userRole: 'admin' | 'parent' | 'student' | 'guest';
  userMessage: string;
  botReply: string;
  intent: string;
  model: string;
  latencyMs: number;
  tokensUsed?: number;
  createdAt: Date;
}

const COLLECTION = 'bot-conversations';

export async function saveBotConversation(data: BotConversation): Promise<string> {
  const doc = await firestore.collection(COLLECTION).add(data);
  return doc.id;
}

export interface ConversationQuery {
  tenantId: string;
  botType?: BotType;
  platform?: 'telegram' | 'line';
  userRole?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  startAfter?: string;
}

export async function queryConversations(
  query: ConversationQuery,
): Promise<Array<BotConversation & { id: string }>> {
  let q: FirebaseFirestore.Query = firestore
    .collection(COLLECTION)
    .where('tenantId', '==', query.tenantId);

  if (query.botType) {
    q = q.where('botType', '==', query.botType);
  }
  if (query.platform) {
    q = q.where('platform', '==', query.platform);
  }
  if (query.startDate) {
    q = q.where('createdAt', '>=', query.startDate);
  }
  if (query.endDate) {
    q = q.where('createdAt', '<=', query.endDate);
  }

  q = q.orderBy('createdAt', 'desc');

  if (query.startAfter) {
    const cursorDoc = await firestore.collection(COLLECTION).doc(query.startAfter).get();
    if (cursorDoc.exists) {
      q = q.startAfter(cursorDoc);
    }
  }

  const limit = Math.min(query.limit || 50, 200);
  q = q.limit(limit);

  const snapshot = await q.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as BotConversation) }));
}

export async function getConversationStats(
  tenantId: string,
  startDate: Date,
  endDate?: Date,
): Promise<{ total: number; byBot: Record<string, number>; byRole: Record<string, number> }> {
  let q: FirebaseFirestore.Query = firestore
    .collection(COLLECTION)
    .where('tenantId', '==', tenantId)
    .where('createdAt', '>=', startDate);

  if (endDate) {
    q = q.where('createdAt', '<=', endDate);
  }

  const snapshot = await q.get();
  const byBot: Record<string, number> = {};
  const byRole: Record<string, number> = {};

  for (const doc of snapshot.docs) {
    const data = doc.data() as BotConversation;
    byBot[data.botType] = (byBot[data.botType] || 0) + 1;
    byRole[data.userRole] = (byRole[data.userRole] || 0) + 1;
  }

  return { total: snapshot.size, byBot, byRole };
}
