import PQueue from 'p-queue'

// Token bucket per user
interface Bucket {
  tokens: number
  lastRefill: number
}

const buckets = new Map<string, Bucket>()

const CAPACITY = 30 // tokens per second
const REFILL_RATE = 30 // tokens per second

function refill(bucket: Bucket) {
  const now = Date.now()
  const elapsed = (now - bucket.lastRefill) / 1000
  const refillAmount = elapsed * REFILL_RATE
  if (refillAmount > 0) {
    bucket.tokens = Math.min(CAPACITY, bucket.tokens + refillAmount)
    bucket.lastRefill = now
  }
}

export function checkRateLimit(userId: string): boolean {
  if (!buckets.has(userId)) {
    buckets.set(userId, { tokens: CAPACITY, lastRefill: Date.now() })
  }
  const bucket = buckets.get(userId) as Bucket
  refill(bucket)
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1
    return true
  }
  return false
}

// Simple global queue for outgoing Telegram messages to avoid bursts
export const telegramQueue = new PQueue({ concurrency: 1, interval: 1000 / 30, intervalCap: 1 })
