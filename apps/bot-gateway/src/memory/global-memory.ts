import { firestore } from '../firestore/client.js';
import { logger } from '../utils/logger.js';
import { getRedis } from '@94cram/shared/redis';
import type { GlobalMemoryEntry } from './types.js';

const col = firestore.collection('bot_memory_global');

// In-memory cache: 60 minutes (global memory rarely changes)
interface MemCacheEntry {
  data: GlobalMemoryEntry[];
  expiresAt: number;
}

let memCache: MemCacheEntry | null = null;
const MEMORY_TTL_MS = 60 * 60 * 1000; // 60 minutes
const REDIS_KEY = 'memory:global';
const REDIS_TTL_SEC = 3600; // 1 hour

function getFromMemCache(): GlobalMemoryEntry[] | null {
  if (memCache && Date.now() < memCache.expiresAt) {
    return memCache.data;
  }
  memCache = null;
  return null;
}

function setInMemCache(data: GlobalMemoryEntry[]): void {
  memCache = { data, expiresAt: Date.now() + MEMORY_TTL_MS };
}

async function getFromRedis(): Promise<GlobalMemoryEntry[] | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get<string>(REDIS_KEY);
    if (!raw) return null;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed as GlobalMemoryEntry[];
  } catch {
    return null;
  }
}

async function setInRedis(data: GlobalMemoryEntry[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(REDIS_KEY, JSON.stringify(data), { ex: REDIS_TTL_SEC });
  } catch {
    // Redis write failure is non-fatal
  }
}

async function invalidateCache(): Promise<void> {
  memCache = null;
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(REDIS_KEY);
  } catch {
    // Non-fatal
  }
}

export async function getGlobalMemory(): Promise<GlobalMemoryEntry[]> {
  // Layer 1: memory cache
  const memResult = getFromMemCache();
  if (memResult) {
    logger.info('[GlobalMemory] HIT (memory)');
    return memResult;
  }

  // Layer 2: Redis cache
  const redisResult = await getFromRedis();
  if (redisResult) {
    logger.info('[GlobalMemory] HIT (redis)');
    setInMemCache(redisResult);
    return redisResult;
  }

  // Layer 3: Firestore
  logger.info('[GlobalMemory] MISS, fetching from Firestore');
  const snap = await col.where('active', '==', true).get();
  const entries: GlobalMemoryEntry[] = snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<GlobalMemoryEntry, 'id'>),
  }));

  setInMemCache(entries);
  setInRedis(entries).catch(() => {});
  return entries;
}

export async function addGlobalMemoryEntry(
  entry: Omit<GlobalMemoryEntry, 'id' | 'created_at' | 'updated_at' | 'usage_count'>
): Promise<string> {
  const now = new Date();
  const doc = await col.add({
    ...entry,
    usage_count: 0,
    created_at: now,
    updated_at: now,
  });

  // Invalidate so next read is fresh
  await invalidateCache();

  logger.info({ id: doc.id, category: entry.category }, '[GlobalMemory] Entry added');
  return doc.id;
}

export async function incrementGlobalUsage(id: string): Promise<void> {
  // Fire-and-forget: don't await caller
  col
    .doc(id)
    .update({
      usage_count: (await col.doc(id).get()).data()?.usage_count + 1 || 1,
      updated_at: new Date(),
    })
    .catch((err: unknown) => {
      logger.warn({ id, err }, '[GlobalMemory] Failed to increment usage count');
    });
}
