/**
 * Admin Lookup — find admin chat ID for a tenant
 * Used by cross-bot bridge to notify 千里眼 admins of parent requests
 */
import { firestore } from './client';
import type { UserBinding } from './bindings';

const col = firestore.collection('bot_user_bindings');

/**
 * Get the chat ID of an admin bound to a specific tenant.
 * Returns the first admin's Telegram user ID (which is also the chat ID for DMs).
 */
export async function getAdminChatId(tenantId: string): Promise<string | null> {
  const snapshot = await col
    .where('active_tenant_id', '==', tenantId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  // The document ID is the telegram_user_id, which doubles as chat_id for DMs
  return snapshot.docs[0].id;
}

/**
 * Get all admin chat IDs for a tenant (for broadcasting)
 */
export async function getAllAdminChatIds(tenantId: string): Promise<string[]> {
  const snapshot = await col.get();
  const ids: string[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data() as UserBinding;
    const hasTenant = data.bindings.some((b) => b.tenant_id === tenantId);
    if (hasTenant) {
      ids.push(doc.id);
    }
  }

  return ids;
}
