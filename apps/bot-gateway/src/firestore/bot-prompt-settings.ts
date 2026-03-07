import { firestore } from './client';

export type BotType = 'clairvoyant' | 'windear' | 'ai-tutor' | 'wentaishi';

export interface StructuredPrompt {
  roleName: string;
  roleDescription: string;
  toneRules: string[];
  forbiddenActions: string[];
  capabilities: string[];
  knowledgeScope: string;
  customRules: string[];
}

export interface ModelConfig {
  name: string;
  temperature: number;
  maxOutputTokens: number;
  topP: number;
  topK: number;
}

export interface BotPromptSettings {
  botType: BotType;
  tenantId: string;
  structured: StructuredPrompt;
  fullPrompt: string;
  mode: 'structured' | 'advanced';
  subPrompts?: Record<string, {
    structured: StructuredPrompt;
    fullPrompt: string;
    mode: 'structured' | 'advanced';
  }>;
  model: ModelConfig;
  updatedAt: Date;
  updatedBy: string;
}

const COLLECTION = 'bot-prompt-settings';

const DEFAULT_MODEL: ModelConfig = {
  name: 'gemini-2.5-flash-lite',
  temperature: 0.7,
  maxOutputTokens: 2048,
  topP: 0.9,
  topK: 40,
};

// In-memory cache
const cache = new Map<string, BotPromptSettings>();

function cacheKey(tenantId: string, botType: BotType): string {
  return `${tenantId}:${botType}`;
}

export function clearPromptCache(tenantId: string, botType: BotType): void {
  cache.delete(cacheKey(tenantId, botType));
}

export async function getPromptSettings(
  tenantId: string,
  botType: BotType,
): Promise<BotPromptSettings | null> {
  const key = cacheKey(tenantId, botType);
  if (cache.has(key)) return cache.get(key)!;

  const docId = `${tenantId}_${botType}`;
  const doc = await firestore.collection(COLLECTION).doc(docId).get();
  if (!doc.exists) return null;

  const data = doc.data() as BotPromptSettings;
  cache.set(key, data);
  return data;
}

export async function updatePromptSettings(
  tenantId: string,
  botType: BotType,
  data: Partial<Omit<BotPromptSettings, 'tenantId' | 'botType'>>,
  updatedBy: string,
): Promise<void> {
  const docId = `${tenantId}_${botType}`;
  await firestore.collection(COLLECTION).doc(docId).set(
    { ...data, tenantId, botType, updatedAt: new Date(), updatedBy },
    { merge: true },
  );
  clearPromptCache(tenantId, botType);
}

export function getDefaultModel(): ModelConfig {
  return { ...DEFAULT_MODEL };
}
