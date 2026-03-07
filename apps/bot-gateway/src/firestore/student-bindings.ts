import { firestore } from './client';

export interface StudentBinding {
  tenantId: string;
  studentId: string;
  platform: 'telegram' | 'line';
  platformUserId: string;
  studentName: string;
  boundAt: Date;
}

const col = firestore.collection('student-bindings');

export async function bindStudent(binding: StudentBinding): Promise<void> {
  const docId = `${binding.platform}:${binding.platformUserId}`;
  await col.doc(docId).set({ ...binding, boundAt: new Date() });
}

export async function unbindStudent(platform: 'telegram' | 'line', platformUserId: string): Promise<void> {
  const docId = `${platform}:${platformUserId}`;
  await col.doc(docId).delete();
}

export async function getStudentBinding(platform: 'telegram' | 'line', platformUserId: string): Promise<StudentBinding | null> {
  const docId = `${platform}:${platformUserId}`;
  const doc = await col.doc(docId).get();
  return doc.exists ? (doc.data() as StudentBinding) : null;
}

export async function getStudentBindingByPlatformId(platformUserId: string): Promise<StudentBinding | null> {
  const snapshot = await col.where('platformUserId', '==', platformUserId).limit(1).get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as StudentBinding;
}

export async function listStudentBindings(tenantId: string): Promise<StudentBinding[]> {
  const snapshot = await col.where('tenantId', '==', tenantId).get();
  return snapshot.docs.map((doc) => doc.data() as StudentBinding);
}
