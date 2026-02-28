import { firestore } from '../firestore/client.js';
import { logger } from '../utils/logger.js';
import { getRedis } from '@94cram/shared/redis';
import type { BotType, ConversationSummary, UserFact, UserMemoryDoc, UserMemoryMessage } from './types.js';

const col = firestore.collection('bot_memory_user');

// In-memory cache: 5 minutes
interface MemCacheEntry {
  data: UserMemoryDoc;
  expiresAt: number;
}

const memCache = new Map<string, MemCacheEntry>();
const MEMORY_TTL_MS = 5 * 60 * 1000; // 5 minutes
const REDIS_TTL_SEC = 300; // 5 minutes

const MAX_USER_FACTS = 20;
const MAX_SUMMARIES = 10;
const COMPACTION_THRESHOLD = 20; // trigger compaction when messages exceed this

function docKey(botType: BotType, telegramUserId: string): string {
  return `${botType}_${telegramUserId}`;
}

function redisKey(botType: BotType, telegramUserId: string): string {
  return `memory:user:${botType}:${telegramUserId}`;
}

function getFromMemCache(key: string): UserMemoryDoc | null {
  const entry = memCache.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data;
  }
  memCache.delete(key);
  return null;
}

function setInMemCache(key: string, data: UserMemoryDoc): void {
  memCache.set(key, { data, expiresAt: Date.now() + MEMORY_TTL_MS });
}

async function getFromRedis(botType: BotType, telegramUserId: string): Promise<UserMemoryDoc | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get<string>(redisKey(botType, telegramUserId));
    if (!raw) return null;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed as UserMemoryDoc;
  } catch {
    return null;
  }
}

async function setInRedis(botType: BotType, telegramUserId: string, data: UserMemoryDoc): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(redisKey(botType, telegramUserId), JSON.stringify(data), { ex: REDIS_TTL_SEC });
  } catch {
    // Non-fatal
  }
}

async function invalidateCache(botType: BotType, telegramUserId: string): Promise<void> {
  memCache.delete(docKey(botType, telegramUserId));
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(redisKey(botType, telegramUserId));
  } catch {
    // Non-fatal
  }
}

export async function getUserMemory(
  botType: BotType,
  telegramUserId: string
): Promise<UserMemoryDoc | null> {
  const key = docKey(botType, telegramUserId);

  // Layer 1: memory cache
  const memResult = getFromMemCache(key);
  if (memResult) {
    logger.info({ botType, telegramUserId }, '[UserMemory] HIT (memory)');
    return memResult;
  }

  // Layer 2: Redis cache
  const redisResult = await getFromRedis(botType, telegramUserId);
  if (redisResult) {
    logger.info({ botType, telegramUserId }, '[UserMemory] HIT (redis)');
    setInMemCache(key, redisResult);
    return redisResult;
  }

  // Layer 3: Firestore
  logger.info({ botType, telegramUserId }, '[UserMemory] MISS, fetching from Firestore');
  const doc = await col.doc(key).get();
  if (!doc.exists) return null;

  const data = doc.data() as UserMemoryDoc;
  setInMemCache(key, data);
  setInRedis(botType, telegramUserId, data).catch(() => {});
  return data;
}

export async function appendMessage(
  botType: BotType,
  telegramUserId: string,
  tenantId: string,
  message: Omit<UserMemoryMessage, 'timestamp'>
): Promise<{ needsCompaction: boolean }> {
  const key = docKey(botType, telegramUserId);
  const now = new Date();
  const newMessage: UserMemoryMessage = { ...message, timestamp: now };

  // Use Firestore transaction to prevent race conditions on concurrent messages
  const docRef = col.doc(key);
  let finalMessageCount = 0;

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);

    if (!snap.exists) {
      // Create new document
      const newDoc: UserMemoryDoc = {
        bot_type: botType,
        telegram_user_id: telegramUserId,
        tenant_id: tenantId,
        messages: [newMessage],
        summaries: [],
        user_facts: [],
        updated_at: now,
        created_at: now,
      };
      tx.set(docRef, newDoc);
      finalMessageCount = 1;
    } else {
      const data = snap.data() as UserMemoryDoc;
      const messages = [...data.messages, newMessage];
      finalMessageCount = messages.length;
      tx.update(docRef, { messages, updated_at: now });
    }
  });

  await invalidateCache(botType, telegramUserId);

  logger.info({ botType, telegramUserId, messageCount: finalMessageCount }, '[UserMemory] Message appended');
  return { needsCompaction: finalMessageCount > COMPACTION_THRESHOLD };
}

export async function compactMessages(
  botType: BotType,
  telegramUserId: string,
  summary: ConversationSummary
): Promise<void> {
  const key = docKey(botType, telegramUserId);
  const docRef = col.doc(key);

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) return;

    const data = snap.data() as UserMemoryDoc;

    // Remove oldest 10 messages
    const messages = data.messages.slice(10);

    // Add summary, cap at MAX_SUMMARIES
    let summaries = [...data.summaries, summary];
    if (summaries.length > MAX_SUMMARIES) {
      summaries = summaries.slice(summaries.length - MAX_SUMMARIES);
    }

    tx.update(docRef, { messages, summaries, updated_at: new Date() });
  });

  await invalidateCache(botType, telegramUserId);

  logger.info({ botType, telegramUserId }, '[UserMemory] Messages compacted');
}

export async function addUserFact(
  botType: BotType,
  telegramUserId: string,
  fact: Omit<UserFact, 'created_at'>
): Promise<void> {
  const key = docKey(botType, telegramUserId);
  const docRef = col.doc(key);
  const now = new Date();
  const newFact: UserFact = { ...fact, created_at: now };

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) return;

    const data = snap.data() as UserMemoryDoc;
    let user_facts = [...data.user_facts, newFact];

    // Cap at MAX_USER_FACTS (remove oldest)
    if (user_facts.length > MAX_USER_FACTS) {
      user_facts = user_facts.slice(user_facts.length - MAX_USER_FACTS);
    }

    tx.update(docRef, { user_facts, updated_at: now });
  });

  await invalidateCache(botType, telegramUserId);

  logger.info({ botType, telegramUserId, fact: fact.fact }, '[UserMemory] User fact added');
}
