import PQueue from 'p-queue'
import type { Firestore } from '@google-cloud/firestore'
import { getRedis } from '@94cram/shared/redis'

// Token bucket per user
interface Bucket {
  tokens: number
  lastRefill: number
}

// In-memory cache (fast path)
const localBuckets = new Map<string, Bucket>()

const CAPACITY = 30 // tokens per second
const REFILL_RATE = 30 // tokens per second
const SYNC_INTERVAL = 5000 // sync to Firestore every 5 seconds

let firestoreDb: Firestore | null = null

export function initRateLimitStore(db: Firestore) {
  firestoreDb = db
  setInterval(() => {
    syncToFirestore().catch(() => {
      // Firestore unavailable — stay silent, in-memory continues
    })
  }, SYNC_INTERVAL)
}

async function syncToFirestore() {
  if (!firestoreDb || localBuckets.size === 0) return
  const batch = firestoreDb.batch()
  const now = Date.now()
  for (const [userId, bucket] of localBuckets) {
    const ref = firestoreDb.collection('rate_limits').doc(userId)
    batch.set(ref, {
      tokens: bucket.tokens,
      lastRefill: bucket.lastRefill,
      updatedAt: now,
    }, { merge: true })
  }
  await batch.commit()
}

async function loadFromFirestore(userId: string): Promise<Bucket | null> {
  if (!firestoreDb) return null
  try {
    const doc = await firestoreDb.collection('rate_limits').doc(userId).get()
    if (doc.exists) {
      const data = doc.data()!
      return { tokens: data['tokens'] as number, lastRefill: data['lastRefill'] as number }
    }
  } catch {
    // ignore — fall back to in-memory
  }
  return null
}

function refill(bucket: Bucket) {
  const now = Date.now()
  const elapsed = (now - bucket.lastRefill) / 1000
  const refillAmount = elapsed * REFILL_RATE
  if (refillAmount > 0) {
    bucket.tokens = Math.min(CAPACITY, bucket.tokens + refillAmount)
    bucket.lastRefill = now
  }
}

export async function checkRateLimit(userId: string): Promise<boolean> {
  const redis = getRedis()

  if (redis) {
    // Redis fast path: atomic incr + 1-second window
    try {
      const key = `rl:bot:${userId}`
      const count = await redis.incr(key)
      if (count === 1) await redis.pexpire(key, 1000)
      return count <= CAPACITY
    } catch {
      // Redis error — fall through to local bucket
    }
  }

  // Fallback: local token bucket + Firestore sync
  if (!localBuckets.has(userId)) {
    localBuckets.set(userId, { tokens: CAPACITY, lastRefill: Date.now() })
    // Non-blocking: merge remote state on first encounter (conservative strategy)
    loadFromFirestore(userId).then(remote => {
      if (remote) {
        const local = localBuckets.get(userId)
        if (local) {
          // Take whichever has fewer tokens to avoid over-counting across instances
          local.tokens = Math.min(local.tokens, remote.tokens)
        }
      }
    }).catch(() => {
      // ignore
    })
  }
  const bucket = localBuckets.get(userId) as Bucket
  refill(bucket)
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1
    return true
  }
  return false
}

/**
 * Global rate guard across all bot-gateway instances.
 * Ensures combined send rate stays ≤25 msg/s (Telegram limit is ~30).
 * Falls back to true (allow) when Redis is unavailable — per-instance PQueue handles it.
 */
export async function checkTelegramGlobalRate(): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return true // fallback: per-instance PQueue handles rate
  try {
    const key = 'tg:global:send'
    const count = await redis.incr(key)
    if (count === 1) await redis.pexpire(key, 1000)
    return count <= 25
  } catch {
    return true // Redis error — allow through
  }
}

// Simple global queue for outgoing Telegram messages to avoid bursts
export const telegramQueue: InstanceType<typeof PQueue> = new PQueue({ concurrency: 1, interval: 1000 / 30, intervalCap: 1 })
