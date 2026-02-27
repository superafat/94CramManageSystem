import { firestore } from './client';
import { logger } from '../utils/logger';

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

// ── P1: In-memory cache layer (ready for Redis upgrade) ──
interface CacheEntry {
  data: TenantCache;
  expiresAt: number;
}

const memCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL (configurable)

// Check if Redis is available (placeholder for future upgrade)
const REDIS_URL = process.env.REDIS_URL;
const useRedis = !!REDIS_URL;

function getFromMemCache(tenantId: string): TenantCache | null {
  const entry = memCache.get(tenantId);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data;
  }
  memCache.delete(tenantId);
  return null;
}

function setInMemCache(tenantId: string, data: TenantCache): void {
  memCache.set(tenantId, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// TODO: Implement Redis version when REDIS_URL is set
// async function getFromRedis(tenantId: string): Promise<TenantCache | null>
// async function setInRedis(tenantId: string, data: TenantCache): Promise<void>

export async function getCache(tenantId: string): Promise<TenantCache | null> {
  // Try memory cache first
  const memResult = getFromMemCache(tenantId);
  if (memResult) {
    logger.info(`[Cache] HIT (memory) for ${tenantId}`);
    return memResult;
  }

  // TODO: Try Redis when available
  // if (useRedis) { ... }

  // Fallback to Firestore
  logger.info(`[Cache] MISS for ${tenantId}, fetching from Firestore`);
  const doc = await col.doc(tenantId).get();
  if (!doc.exists) return null;

  const data = doc.data() as TenantCache;
  // Store in memory cache
  setInMemCache(tenantId, data);
  return data;
}

export async function setCache(tenantId: string, data: TenantCache): Promise<void> {
  await col.doc(tenantId).set(data);
  // Also update in-memory cache
  setInMemCache(tenantId, data);
}

export async function invalidateCache(tenantId: string): Promise<void> {
  memCache.delete(tenantId);
  // TODO: Invalidate Redis if present
}

export async function isCacheStale(tenantId: string, maxAgeMs = 24 * 60 * 60 * 1000): Promise<boolean> {
  const cache = await getCache(tenantId);
  if (!cache) return true;
  const syncTime = cache.last_synced_at instanceof Date ? cache.last_synced_at.getTime() : new Date(cache.last_synced_at).getTime();
  return Date.now() - syncTime > maxAgeMs;
}

// Cache stats for monitoring
export function getCacheStats() {
  return {
    memCacheSize: memCache.size,
    useRedis,
    redisConfigured: !!REDIS_URL,
  };
}
