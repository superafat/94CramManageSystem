import { firestore } from './client';

export interface TenantCache {
  students: Array<{ id: string; name: string; class_name: string }>;
  classes: string[];
  items: Array<{ id: string; name: string; stock: number }>;
  warehouses: Array<{ id: string; name: string }>;
  tenantName?: string;
  tenantAddress?: string;
  last_synced_at: Date;
}

const col = firestore.collection('bot_tenant_cache');

export async function getCache(tenantId: string): Promise<TenantCache | null> {
  const doc = await col.doc(tenantId).get();
  return doc.exists ? (doc.data() as TenantCache) : null;
}

export async function setCache(tenantId: string, data: TenantCache): Promise<void> {
  await col.doc(tenantId).set(data);
}

export async function isCacheStale(tenantId: string, maxAgeMs = 24 * 60 * 60 * 1000): Promise<boolean> {
  const cache = await getCache(tenantId);
  if (!cache) return true;
  const syncTime = cache.last_synced_at instanceof Date ? cache.last_synced_at.getTime() : new Date(cache.last_synced_at).getTime();
  return Date.now() - syncTime > maxAgeMs;
}
