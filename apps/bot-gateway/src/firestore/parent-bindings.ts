import { firestore } from './client';

export interface ParentChild {
  student_id: string;
  student_name: string;
  relation: string;
}

export interface ParentBinding {
  telegram_user_id: string;
  tenant_id: string;
  parent_name: string;
  children: ParentChild[];
  created_at: Date;
  last_active_at: Date;
}

const col = firestore.collection('bot_parent_bindings');

export async function getParentBinding(telegramUserId: string): Promise<ParentBinding | null> {
  const doc = await col.doc(telegramUserId).get();
  return doc.exists ? (doc.data() as ParentBinding) : null;
}

export async function createParentBinding(binding: Omit<ParentBinding, 'created_at' | 'last_active_at'>): Promise<void> {
  await col.doc(binding.telegram_user_id).set({
    ...binding,
    created_at: new Date(),
    last_active_at: new Date(),
  });
}

export async function updateParentLastActive(telegramUserId: string): Promise<void> {
  await col.doc(telegramUserId).update({ last_active_at: new Date() });
}

export async function deleteParentBinding(telegramUserId: string): Promise<void> {
  await col.doc(telegramUserId).delete();
}

export async function listParentBindings(tenantId: string): Promise<ParentBinding[]> {
  const snapshot = await col.where('tenant_id', '==', tenantId).get();
  return snapshot.docs.map((doc) => doc.data() as ParentBinding);
}
