/**
 * Parent Conversations — Firestore `bot_parent_conversations` collection
 * Stores all parent-bot conversations so admins can review them
 */
import { firestore } from './client';
import { logger } from '../utils/logger';

export interface ConversationEntry {
  tenant_id: string;
  parent_user_id: string;
  parent_name: string;
  /** 'private' or 'group' */
  chat_type: string;
  user_message: string;
  bot_response: string;
  intent: string;
  created_at: Date;
}

const col = firestore.collection('bot_parent_conversations');

/**
 * Save a conversation turn (fire-and-forget)
 */
export function saveConversation(entry: Omit<ConversationEntry, 'created_at'>): void {
  col.add({ ...entry, created_at: new Date() }).catch((err: unknown) => {
    logger.warn({ err: err instanceof Error ? err : new Error(String(err)) }, '[ParentConversations] Failed to save conversation');
  });
}

/**
 * Get recent conversations for a tenant (for admin review)
 */
export async function getRecentConversations(
  tenantId: string,
  limit = 20
): Promise<Array<ConversationEntry & { id: string }>> {
  const snapshot = await col
    .where('tenant_id', '==', tenantId)
    .orderBy('created_at', 'desc')
    .limit(limit)
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as ConversationEntry) }));
}

/**
 * Get conversations for a specific parent
 */
export async function getParentConversations(
  tenantId: string,
  parentUserId: string,
  limit = 10
): Promise<Array<ConversationEntry & { id: string }>> {
  const snapshot = await col
    .where('tenant_id', '==', tenantId)
    .where('parent_user_id', '==', parentUserId)
    .orderBy('created_at', 'desc')
    .limit(limit)
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as ConversationEntry) }));
}
