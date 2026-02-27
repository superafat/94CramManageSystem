/**
 * 共用 Upstash Redis 客戶端
 * Lazy singleton — 所有 backend 共用同一連線
 * 使用 HTTPS REST protocol，不需要 VPC Connector
 */
import { Redis } from '@upstash/redis'

let client: Redis | null = null
let initialized = false

/**
 * 取得 Redis 客戶端（lazy init）
 * 需要設定 UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * 未設定時回傳 null（graceful degradation）
 */
export function getRedis(): Redis | null {
  if (initialized) return client
  initialized = true

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    return null
  }

  client = new Redis({ url, token })
  return client
}

/**
 * 檢查 Redis 是否可用
 */
export function isRedisAvailable(): boolean {
  return getRedis() !== null
}

export { Redis } from '@upstash/redis'
export { UpstashRedisStore } from './redis-store'
