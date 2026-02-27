/**
 * Upstash Redis Store
 * 實作 manage-backend 已定義的 RedisStore interface
 * 可注入到 rate limiter、cache strategy 等
 */
import { getRedis } from './index'

export class UpstashRedisStore {
  async get(key: string): Promise<string | null> {
    const redis = getRedis()
    if (!redis) return null
    try {
      return await redis.get<string>(key)
    } catch {
      return null
    }
  }

  async set(key: string, value: string, expirationMs: number): Promise<void> {
    const redis = getRedis()
    if (!redis) return
    try {
      await redis.set(key, value, { px: expirationMs })
    } catch {
      // Silently fail — fallback to in-memory
    }
  }

  async incr(key: string): Promise<number> {
    const redis = getRedis()
    if (!redis) return 0
    try {
      return await redis.incr(key)
    } catch {
      return 0
    }
  }

  async expire(key: string, expirationMs: number): Promise<void> {
    const redis = getRedis()
    if (!redis) return
    try {
      await redis.pexpire(key, expirationMs)
    } catch {
      // Silently fail
    }
  }

  async del(key: string): Promise<void> {
    const redis = getRedis()
    if (!redis) return
    try {
      await redis.del(key)
    } catch {
      // Silently fail
    }
  }
}
