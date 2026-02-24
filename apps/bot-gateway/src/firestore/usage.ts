import { firestore } from './client';

export interface UsageStats {
  tenant_id: string;
  month: string;
  ai_calls: number;
  api_calls: number;
  ai_tokens_used: number;
  daily_breakdown: Record<string, { ai_calls: number; api_calls: number }>;
  updated_at: Date;
}

const COLLECTION = 'bot_usage_stats';

function docId(tenantId: string, month: string) {
  return `${tenantId}_${month}`;
}

export async function getUsage(tenantId: string, month: string): Promise<UsageStats | null> {
  const doc = await firestore.collection(COLLECTION).doc(docId(tenantId, month)).get();
  return doc.exists ? (doc.data() as UsageStats) : null;
}

export async function incrementUsage(
  tenantId: string,
  field: 'ai_calls' | 'api_calls',
  tokens?: number
): Promise<void> {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const day = String(now.getDate()).padStart(2, '0');
  const id = docId(tenantId, month);
  const ref = firestore.collection(COLLECTION).doc(id);

  await firestore.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) {
      tx.set(ref, {
        tenant_id: tenantId,
        month,
        ai_calls: field === 'ai_calls' ? 1 : 0,
        api_calls: field === 'api_calls' ? 1 : 0,
        ai_tokens_used: tokens ?? 0,
        daily_breakdown: {
          [day]: {
            ai_calls: field === 'ai_calls' ? 1 : 0,
            api_calls: field === 'api_calls' ? 1 : 0,
          },
        },
        updated_at: now,
      });
    } else {
      const data = doc.data() as UsageStats;
      const dayData = data.daily_breakdown?.[day] ?? { ai_calls: 0, api_calls: 0 };
      tx.update(ref, {
        [field]: (data[field] ?? 0) + 1,
        ai_tokens_used: (data.ai_tokens_used ?? 0) + (tokens ?? 0),
        [`daily_breakdown.${day}`]: {
          ...dayData,
          [field]: (dayData[field] ?? 0) + 1,
        },
        updated_at: now,
      });
    }
  });
}
