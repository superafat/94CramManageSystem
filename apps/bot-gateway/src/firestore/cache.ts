import { firestore } from './client';
import { logger } from '../utils/logger';
import { getRedis, isRedisAvailable } from '@94cram/shared/redis';

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

// ── P1: In-memory cache layer ──
interface CacheEntry {
  data: TenantCache;
  expiresAt: number;
}

const memCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL (configurable)
const REDIS_TTL_SEC = 300; // 5 minutes in seconds

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

async function getFromRedis(tenantId: string): Promise<TenantCache | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get<TenantCache>(`cache:tenant:${tenantId}`);
  } catch {
    return null;
  }
}

async function setInRedis(tenantId: string, data: TenantCache): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(`cache:tenant:${tenantId}`, JSON.stringify(data), { ex: REDIS_TTL_SEC });
  } catch {
    // Redis write failure is non-fatal
  }
}

export async function getCache(tenantId: string): Promise<TenantCache | null> {
  // Layer 1: memory cache
  const memResult = getFromMemCache(tenantId);
  if (memResult) {
    logger.info({ tenantId }, '[Cache] HIT (memory)');
    return memResult;
  }

  // Layer 2: Redis cache
  const redisResult = await getFromRedis(tenantId);
  if (redisResult) {
    logger.info({ tenantId }, '[Cache] HIT (redis)');
    setInMemCache(tenantId, redisResult);
    return redisResult;
  }

  // Layer 3: Firestore
  logger.info({ tenantId }, '[Cache] MISS, fetching from Firestore');
  const doc = await col.doc(tenantId).get();
  if (!doc.exists) return null;

  const data = doc.data() as TenantCache;
  setInMemCache(tenantId, data);
  await setInRedis(tenantId, data);
  return data;
}

export async function setCache(tenantId: string, data: TenantCache): Promise<void> {
  await col.doc(tenantId).set(data);
  // Write-through to all cache layers
  setInMemCache(tenantId, data);
  await setInRedis(tenantId, data);
}

export async function invalidateCache(tenantId: string): Promise<void> {
  memCache.delete(tenantId);
  // Also invalidate Redis
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(`cache:tenant:${tenantId}`);
    } catch {
      // Non-fatal
    }
  }
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
    redisConnected: isRedisAvailable(),
  };
}
