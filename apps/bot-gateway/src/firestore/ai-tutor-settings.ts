import { firestore } from './client';

export type ResponseStyle = 'concise' | 'detailed' | 'socratic';

export interface AiTutorSettings {
  tenantId: string;
  enabled: boolean;
  allowedSubjects: string[];
  responseStyle: ResponseStyle;
  dailyQuota: number;
  restrictToKnowledgeBase: boolean;
}

const COLLECTION = 'ai-tutor-settings';

const DEFAULT_SETTINGS: Omit<AiTutorSettings, 'tenantId'> = {
  enabled: true,
  allowedSubjects: [],
  responseStyle: 'detailed',
  dailyQuota: 50,
  restrictToKnowledgeBase: true,
};

export async function getTutorSettings(tenantId: string): Promise<AiTutorSettings> {
  const doc = await firestore.collection(COLLECTION).doc(tenantId).get();
  if (!doc.exists) {
    return { tenantId, ...DEFAULT_SETTINGS };
  }
  return doc.data() as AiTutorSettings;
}

export async function updateTutorSettings(tenantId: string, data: Partial<Omit<AiTutorSettings, 'tenantId'>>): Promise<void> {
  await firestore.collection(COLLECTION).doc(tenantId).set(
    { ...data, tenantId },
    { merge: true }
  );
}
