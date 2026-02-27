/**
 * Rate Limiter Middleware - 速率限制
 * 
 * 防止短時間內連續攻擊（暴力破解、濫用註冊等）
 * 支援記憶體或 Redis 儲存
 */
import { Context, Next } from 'hono'
import { UpstashRedisStore, isRedisAvailable } from '@94cram/shared/redis'

// 記憶體儲存（適合單一實例）
const inMemoryStore: Map<string, { count: number; resetTime: number }> = new Map()

// Redis store singleton（Redis 可用時才建立）
const redisStore = isRedisAvailable() ? new UpstashRedisStore() : undefined

// Redis 儲存介面（可選）
interface RedisStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string, expirationMs: number): Promise<void>
  incr(key: string): Promise<number>
  expire(key: string, expirationMs: number): Promise<void>
}

interface RateLimitConfig {
  windowMs: number      // 時間窗口（毫秒）
  maxRequests: number   // 最大請求數
  message?: string      // 超過限制時的訊息
  keyPrefix?: string    // Redis key 前綴
  store?: RedisStore    // 可選的 Redis store
}

const defaultConfig: Record<string, RateLimitConfig> = {
  // 試用申請 - 每天最多 3 次（防止濫用）
  'trial-signup': {
    windowMs: 24 * 60 * 60 * 1000, // 24 小時
    maxRequests: 3,
    message: '您已超過試用申請次數上限，請明天再試',
    keyPrefix: 'rl:trial',
    store: redisStore
  },
  // 登入 - 每分鐘最多 10 次（防止暴力破解）
  'login': {
    windowMs: 60 * 1000, // 1 分鐘
    maxRequests: 10,
    message: '登入嘗試次數過多，請稍後再試',
    keyPrefix: 'rl:login',
    store: redisStore
  },
  // 一般 API - 每分鐘最多 100 次（預設）
  'default': {
    windowMs: 60 * 1000, // 1 分鐘
    maxRequests: 100,
    message: '請求過於頻繁，請稍後再試',
    keyPrefix: 'rl:api',
    store: redisStore
  }
}

/**
 * 速率限制 middleware
 * @param options - 配置選項或預設配置 key
 */
export function rateLimit(
  options: string | Partial<RateLimitConfig> = 'default'
) {
  // 支援字串（預設配置 key）或完整配置物件
  const config: RateLimitConfig = 
    typeof options === 'string' 
      ? (defaultConfig[options] || defaultConfig['default'])
      : { ...defaultConfig['default'], ...options }

  return async (c: Context, next: Next) => {
    // 獲取客戶端 IP
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() 
      || c.req.header('x-real-ip') 
      || c.req.header('cf-connecting-ip')
      || 'unknown'
    
    // 組合 key（使用配置中的 keyPrefix）
    const key = `${config.keyPrefix || 'rl:default'}:${ip}`
    const now = Date.now()

    let count: number
    let resetTime: number

    // 使用 Redis 或記憶體儲存
    if (config.store) {
      // Redis 實現（未來擴展）
      const stored = await config.store.get(key)
      if (stored) {
        const data = JSON.parse(stored)
        count = data.count
        resetTime = data.resetTime
        
        if (now > resetTime) {
          count = 1
          resetTime = now + config.windowMs
          await config.store.set(key, JSON.stringify({ count, resetTime }), config.windowMs)
        } else {
          count++
          await config.store.set(key, JSON.stringify({ count, resetTime }), resetTime - now)
        }
      } else {
        count = 1
        resetTime = now + config.windowMs
        await config.store.set(key, JSON.stringify({ count, resetTime }), config.windowMs)
      }
    } else {
      // 記憶體實現
      let record = inMemoryStore.get(key)
      
      if (!record || now > record.resetTime) {
        record = {
          count: 1,
          resetTime: now + config.windowMs
        }
        inMemoryStore.set(key, record)
      } else {
        record.count++
      }
      
      count = record.count
      resetTime = record.resetTime
    }

    // 檢查是否超過限制
    if (count > config.maxRequests) {
      const retryAfter = Math.ceil((resetTime - now) / 1000)
      
      return c.json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: config.message || '請求過於頻繁',
          retryAfter
        }
      }, 429, {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(config.maxRequests),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(resetTime / 1000))
      })
    }

    // 設定回應 header
    c.res.headers.set('X-RateLimit-Limit', String(config.maxRequests))
    c.res.headers.set('X-RateLimit-Remaining', String(config.maxRequests - count))
    c.res.headers.set('X-RateLimit-Reset', String(Math.floor(resetTime / 1000)))

    await next()
  }
}

/**
 * 使用範例：
 * 
 * import { rateLimit } from './middleware/rateLimit'
 * 
 * // 使用預設配置
 * app.use('*', rateLimit())
 * 
 * // 使用內建配置
 * app.post('/api/auth/trial-signup', rateLimit('trial-signup'), ...)
 * app.post('/api/auth/login', rateLimit('login'), ...)
 * 
 * // 自訂配置
 * app.use('/api/*', rateLimit({
 *   maxRequests: 100,
 *   windowMs: 60 * 1000, // 1 分鐘
 *   keyPrefix: 'rl:custom',
 *   message: '請求過多，請稍後再試'
 * }))
 */

// 清理過期的記錄（定時任務）
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of inMemoryStore.entries()) {
    if (now > record.resetTime) {
      inMemoryStore.delete(key)
    }
  }
}, 60 * 60 * 1000) // 每小時清理一次
