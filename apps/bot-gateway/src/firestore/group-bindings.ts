/**
 * Group Bindings — Firestore `bot_group_bindings` collection
 * Links Telegram groups to tenants for group mode
 */
import { firestore } from './client';

export interface GroupBinding {
  chat_id: string;
  tenant_id: string;
  tenant_name: string;
  group_name: string;
  added_by: string;
  bot_username: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

const col = firestore.collection('bot_group_bindings');

export async function getGroupBinding(chatId: string): Promise<GroupBinding | null> {
  const doc = await col.doc(chatId).get();
  if (!doc.exists) return null;
  const data = doc.data() as GroupBinding;
  return data.active ? data : null;
}

export async function createGroupBinding(
  binding: Omit<GroupBinding, 'created_at' | 'updated_at'>
): Promise<void> {
  await col.doc(binding.chat_id).set({
    ...binding,
    created_at: new Date(),
    updated_at: new Date(),
  });
}

export async function deleteGroupBinding(chatId: string): Promise<void> {
  await col.doc(chatId).update({ active: false, updated_at: new Date() });
}

export async function listGroupBindings(tenantId: string): Promise<GroupBinding[]> {
  const snapshot = await col
    .where('tenant_id', '==', tenantId)
    .where('active', '==', true)
    .get();
  return snapshot.docs.map((doc) => doc.data() as GroupBinding);
}
