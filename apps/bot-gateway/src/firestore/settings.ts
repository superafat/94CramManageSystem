import { firestore } from './client';

export type BotModule = 'manage' | 'inclass' | 'stock';

export interface TenantSettings {
  tenant_id: string;
  enabled_modules: BotModule[];
  welcome_message: string;
  plan: 'free' | 'basic' | 'pro';
  max_bindings: number;
  max_ai_calls: number;
  log_retention_days: number;
  created_at: Date;
  updated_at: Date;
}

const COLLECTION = 'bot_tenant_settings';

export async function getSettings(tenantId: string): Promise<TenantSettings | null> {
  const doc = await firestore.collection(COLLECTION).doc(tenantId).get();
  return doc.exists ? (doc.data() as TenantSettings) : null;
}

export async function upsertSettings(tenantId: string, data: Partial<TenantSettings>): Promise<void> {
  await firestore.collection(COLLECTION).doc(tenantId).set(
    { ...data, updated_at: new Date() },
    { merge: true }
  );
}

export async function getEnabledModules(tenantId: string): Promise<BotModule[]> {
  const settings = await getSettings(tenantId);
  return settings?.enabled_modules ?? ['manage', 'inclass', 'stock'];
}
