import { randomBytes } from 'crypto';
import { firestore } from './client';

export interface StudentInvite {
  tenantId: string;
  code: string;
  studentId: string;
  studentName: string;
  createdBy: string;
  usedBy?: string;
  usedAt?: Date;
  expiresAt: Date;
}

const col = firestore.collection('student-invites');

export function generateStudentInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = randomBytes(6);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
}

export async function createStudentInvite(invite: Omit<StudentInvite, 'usedBy' | 'usedAt'>): Promise<void> {
  await col.doc(invite.code).set(invite);
}

export async function useStudentInvite(code: string, usedBy: string): Promise<void> {
  await col.doc(code).update({ usedBy, usedAt: new Date() });
}

export async function listStudentInvites(tenantId: string): Promise<StudentInvite[]> {
  const snapshot = await col.where('tenantId', '==', tenantId).get();
  return snapshot.docs.map((doc) => doc.data() as StudentInvite);
}

export async function deleteStudentInvite(code: string): Promise<void> {
  await col.doc(code).delete();
}
