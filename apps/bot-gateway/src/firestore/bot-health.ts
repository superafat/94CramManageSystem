import { firestore } from './client';
import type { BotType } from './bot-prompt-settings';

export interface BotHealth {
  botType: BotType;
  tenantId: string;
  platform: 'telegram' | 'line';
  webhookActive: boolean;
  lastEventAt: Date;
  lastReplyAt: Date;
  lastErrorAt?: Date;
  lastError?: string;
  messagesReceived24h: number;
  repliesSent24h: number;
  errors24h: number;
  avgLatencyMs24h: number;
  updatedAt: Date;
}

const COLLECTION = 'bot-health';

export async function getBotHealth(tenantId: string): Promise<BotHealth[]> {
  const snapshot = await firestore
    .collection(COLLECTION)
    .where('tenantId', '==', tenantId)
    .get();
  return snapshot.docs.map((doc) => doc.data() as BotHealth);
}

export async function updateBotHealth(
  tenantId: string,
  botType: BotType,
  platform: 'telegram' | 'line',
  update: Partial<Pick<BotHealth, 'lastEventAt' | 'lastReplyAt' | 'lastErrorAt' | 'lastError'>>,
): Promise<void> {
  const docId = `${tenantId}_${botType}`;
  await firestore.collection(COLLECTION).doc(docId).set(
    {
      ...update,
      tenantId,
      botType,
      platform,
      webhookActive: true,
      updatedAt: new Date(),
    },
    { merge: true },
  );
}

export async function recordBotEvent(
  tenantId: string,
  botType: BotType,
  platform: 'telegram' | 'line',
  success: boolean,
  latencyMs?: number,
  error?: string,
): Promise<void> {
  const update: Partial<BotHealth> = {
    lastEventAt: new Date(),
    webhookActive: true,
  };
  if (success) {
    update.lastReplyAt = new Date();
  } else {
    update.lastErrorAt = new Date();
    update.lastError = error;
  }
  await updateBotHealth(tenantId, botType, platform, update);
}
