import { firestore } from '../firestore/client.js';
import { logger } from '../utils/logger.js';
import { getRedis } from '@94cram/shared/redis';
import type { TenantFact, TenantMemoryDoc } from './types.js';

const col = firestore.collection('bot_memory_tenant');

// In-memory cache: 15 minutes
interface MemCacheEntry {
  data: TenantMemoryDoc;
  expiresAt: number;
}

const memCache = new Map<string, MemCacheEntry>();
const MEMORY_TTL_MS = 15 * 60 * 1000; // 15 minutes
const REDIS_TTL_SEC = 900; // 15 minutes

function redisKey(tenantId: string): string {
  return `memory:tenant:${tenantId}`;
}

function getFromMemCache(tenantId: string): TenantMemoryDoc | null {
  const entry = memCache.get(tenantId);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data;
  }
  memCache.delete(tenantId);
  return null;
}

function setInMemCache(tenantId: string, data: TenantMemoryDoc): void {
  memCache.set(tenantId, { data, expiresAt: Date.now() + MEMORY_TTL_MS });
}

async function getFromRedis(tenantId: string): Promise<TenantMemoryDoc | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get<string>(redisKey(tenantId));
    if (!raw) return null;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed as TenantMemoryDoc;
  } catch {
    return null;
  }
}

async function setInRedis(tenantId: string, data: TenantMemoryDoc): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(redisKey(tenantId), JSON.stringify(data), { ex: REDIS_TTL_SEC });
  } catch {
    // Non-fatal
  }
}

async function invalidateCache(tenantId: string): Promise<void> {
  memCache.delete(tenantId);
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(redisKey(tenantId));
  } catch {
    // Non-fatal
  }
}

export async function getTenantMemory(tenantId: string): Promise<TenantMemoryDoc | null> {
  // Layer 1: memory cache
  const memResult = getFromMemCache(tenantId);
  if (memResult) {
    logger.info({ tenantId }, '[TenantMemory] HIT (memory)');
    return memResult;
  }

  // Layer 2: Redis cache
  const redisResult = await getFromRedis(tenantId);
  if (redisResult) {
    logger.info({ tenantId }, '[TenantMemory] HIT (redis)');
    setInMemCache(tenantId, redisResult);
    return redisResult;
  }

  // Layer 3: Firestore
  logger.info({ tenantId }, '[TenantMemory] MISS, fetching from Firestore');
  const doc = await col.doc(tenantId).get();
  if (!doc.exists) return null;

  const data = doc.data() as TenantMemoryDoc;
  setInMemCache(tenantId, data);
  setInRedis(tenantId, data).catch(() => {});
  return data;
}

export async function upsertTenantFact(
  tenantId: string,
  fact: Omit<TenantFact, 'last_used_at' | 'created_at'>
): Promise<void> {
  const now = new Date();
  const existing = await getTenantMemory(tenantId);

  let facts: TenantFact[];

  if (!existing) {
    // Create new doc
    const newFact: TenantFact = { ...fact, last_used_at: now, created_at: now };
    const newDoc: TenantMemoryDoc = {
      tenant_id: tenantId,
      facts: [newFact],
      updated_at: now,
    };
    await col.doc(tenantId).set(newDoc);
    await invalidateCache(tenantId);
    return;
  }

  facts = existing.facts;
  const idx = facts.findIndex((f) => f.key === fact.key);

  if (idx >= 0) {
    // Update existing fact
    facts[idx] = {
      ...facts[idx],
      content: fact.content,
      confidence: fact.confidence,
      last_used_at: now,
    };
  } else {
    // Add new fact
    facts.push({ ...fact, last_used_at: now, created_at: now });
  }

  await col.doc(tenantId).update({ facts, updated_at: now });
  await invalidateCache(tenantId);

  logger.info({ tenantId, factKey: fact.key }, '[TenantMemory] Fact upserted');
}

export async function removeTenantFact(tenantId: string, factKey: string): Promise<void> {
  const existing = await getTenantMemory(tenantId);
  if (!existing) return;

  const facts = existing.facts.filter((f) => f.key !== factKey);
  await col.doc(tenantId).update({ facts, updated_at: new Date() });
  await invalidateCache(tenantId);

  logger.info({ tenantId, factKey }, '[TenantMemory] Fact removed');
}
