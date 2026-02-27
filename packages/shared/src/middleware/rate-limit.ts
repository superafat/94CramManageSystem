/**
 * 共用 Rate Limiter — 所有後端使用同一實作
 * Redis-backed when available，fallback 到 in-memory Map
 */
import { getRedis } from '../redis'

interface RateLimitEntry {
  count: number
  resetAt: number
  blocked?: boolean
  blockedUntil?: number
}

interface RateLimitConfig {
  /** 時間窗口（毫秒），預設 60000 (1分鐘) */
  windowMs?: number
  /** 窗口內最大請求數，預設 100 */
  maxRequests?: number
  /** 是否啟用 IP 封鎖（連續超限後封鎖），預設 false */
  enableBlocking?: boolean
  /** 封鎖時間（毫秒），預設 900000 (15分鐘) */
  blockDurationMs?: number
  /** 連續超限幾次後封鎖，預設 3 */
  blockAfterViolations?: number
}

interface RateLimitResult {
  allowed: boolean
  blocked: boolean
  remaining: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()
const violationCount = new Map<string, number>()

// 清理過期條目（每 5 分鐘）
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function ensureCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now >= entry.resetAt && !(entry.blocked && entry.blockedUntil && now < entry.blockedUntil)) {
        store.delete(key)
      }
    }
    for (const [key] of violationCount) {
      if (!store.has(key)) violationCount.delete(key)
    }
  }, 300000)
}

/** 清理 timer，用於 graceful shutdown */
export function clearRateLimitTimer() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
}

export async function checkRateLimit(key: string, config: RateLimitConfig = {}): Promise<RateLimitResult> {
  ensureCleanup()

  const {
    windowMs = 60000,
    maxRequests = 100,
    enableBlocking = false,
    blockDurationMs = 900000,
    blockAfterViolations = 3,
  } = config

  const now = Date.now()

  // Redis path — blocking 保持 in-memory
  const redis = getRedis()
  if (redis) {
    // 先檢查 in-memory blocking（安全功能 per-instance）
    const entry = store.get(key)
    if (entry?.blocked && entry.blockedUntil && now < entry.blockedUntil) {
      return { allowed: false, blocked: true, remaining: 0, resetAt: entry.blockedUntil }
    }

    const redisKey = `rl:shared:${key}`
    try {
      const count = await redis.incr(redisKey)
      if (count === 1) {
        await redis.pexpire(redisKey, windowMs)
      }
      const allowed = count <= maxRequests

      if (!allowed && enableBlocking) {
        const violations = (violationCount.get(key) || 0) + 1
        violationCount.set(key, violations)
        if (violations >= blockAfterViolations) {
          const blockEntry = store.get(key) || { count, resetAt: now + windowMs }
          blockEntry.blocked = true
          blockEntry.blockedUntil = now + blockDurationMs
          store.set(key, blockEntry)
          return { allowed: false, blocked: true, remaining: 0, resetAt: now + blockDurationMs }
        }
      }

      return {
        allowed,
        blocked: false,
        remaining: Math.max(0, maxRequests - count),
        resetAt: Date.now() + windowMs,
      }
    } catch {
      // Redis 失敗，fallback 到 in-memory
    }
  }

  // In-memory path
  const entry = store.get(key)

  // 檢查是否被封鎖
  if (entry?.blocked && entry.blockedUntil && now < entry.blockedUntil) {
    return { allowed: false, blocked: true, remaining: 0, resetAt: entry.blockedUntil }
  }

  // 窗口過期，重置
  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, blocked: false, remaining: maxRequests - 1, resetAt: now + windowMs }
  }

  entry.count++

  if (entry.count > maxRequests) {
    // 超限
    if (enableBlocking) {
      const violations = (violationCount.get(key) || 0) + 1
      violationCount.set(key, violations)
      if (violations >= blockAfterViolations) {
        entry.blocked = true
        entry.blockedUntil = now + blockDurationMs
        return { allowed: false, blocked: true, remaining: 0, resetAt: entry.blockedUntil }
      }
    }
    return { allowed: false, blocked: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, blocked: false, remaining: maxRequests - entry.count, resetAt: entry.resetAt }
}

/** 取得客戶端 IP */
export function getClientIP(c: { req: { header: (name: string) => string | undefined } }): string {
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    || c.req.header('x-real-ip')
    || 'unknown'
}
