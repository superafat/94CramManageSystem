import { firestore } from './client';

export interface ParentInvite {
  code: string;
  tenant_id: string;
  student_id: string;
  student_name: string;
  status: 'pending' | 'used' | 'expired';
  created_at: Date;
  expires_at: Date;
  used_by_telegram_user_id?: string;
}

const col = firestore.collection('bot_parent_invites');

export async function createParentInvite(invite: Omit<ParentInvite, 'status' | 'created_at'>): Promise<void> {
  await col.doc(invite.code).set({
    ...invite,
    status: 'pending',
    created_at: new Date(),
  });
}

export async function getParentInvite(code: string): Promise<ParentInvite | null> {
  const doc = await col.doc(code).get();
  return doc.exists ? (doc.data() as ParentInvite) : null;
}

export async function markInviteUsed(code: string, telegramUserId: string): Promise<void> {
  await col.doc(code).update({
    status: 'used',
    used_by_telegram_user_id: telegramUserId,
  });
}

export async function listParentInvites(tenantId: string): Promise<ParentInvite[]> {
  const snapshot = await col.where('tenant_id', '==', tenantId).get();
  return snapshot.docs.map((doc) => doc.data() as ParentInvite);
}

export function generateInviteCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
