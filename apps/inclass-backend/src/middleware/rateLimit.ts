/**
 * Rate Limiting & Security Module
 */
import type { Context } from 'hono'

// ===== Advanced Rate Limiting & Security =====
const rateLimitMap = new Map<string, {
  count: number
  failedCount: number
  resetTime: number
  blockedUntil?: number
}>()

const RATE_LIMIT = 30 // max requests per minute
const RATE_WINDOW = 60 * 1000 // 1 minute
const MAX_FAILED = 10 // max failed attempts before block
const BLOCK_DURATION = 15 * 60 * 1000 // 15 minutes

// Failed login log for security monitoring (bounded)
const MAX_LOG_SIZE = 1000
const failedLoginLog: Array<{
  ip: string
  email: string
  timestamp: number
  userAgent: string
}> = []

export function getClientIP(c: Context): string {
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    || c.req.header('cf-connecting-ip')
    || 'unknown'
}

export function rateLimit(key: string): { allowed: boolean; blocked?: boolean } {
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      failedCount: 0,
      resetTime: now + RATE_WINDOW
    })
    return { allowed: true }
  }

  if (record.blockedUntil && now < record.blockedUntil) {
    return { allowed: false, blocked: true }
  }

  if (record.count >= RATE_LIMIT) {
    return { allowed: false }
  }

  record.count++
  return { allowed: true }
}

export function recordFailedLogin(ip: string, email: string, userAgent: string) {
  const now = Date.now()
  failedLoginLog.push({ ip, email, timestamp: now, userAgent })

  // Keep bounded
  while (failedLoginLog.length > MAX_LOG_SIZE) {
    failedLoginLog.shift()
  }

  const record = rateLimitMap.get(`auth:${ip}`)
  if (record) {
    record.failedCount++
    if (record.failedCount >= MAX_FAILED) {
      record.blockedUntil = now + BLOCK_DURATION
      console.warn(`[Security] IP blocked for 15 minutes: ${ip} after ${MAX_FAILED} failed attempts`)
    }
  }
}

export function recordSuccessfulLogin(ip: string) {
  const record = rateLimitMap.get(`auth:${ip}`)
  if (record) {
    record.failedCount = 0
  }
}

export function getFailedLogins(hours = 24): typeof failedLoginLog {
  const cutoff = Date.now() - (hours * 60 * 60 * 1000)
  return failedLoginLog.filter(l => l.timestamp > cutoff)
}

export function getBlockedIPs(): Array<{ ip: string; blockedUntil: number }> {
  const now = Date.now()
  const blocked: Array<{ ip: string; blockedUntil: number }> = []

  for (const [key, record] of rateLimitMap) {
    if (key.startsWith('auth:') && record.blockedUntil && record.blockedUntil > now) {
      blocked.push({ ip: key.replace('auth:', ''), blockedUntil: record.blockedUntil })
    }
  }

  return blocked
}

// Periodic cleanup of expired entries (every 5 minutes)
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitMap) {
    if (now > record.resetTime && (!record.blockedUntil || now > record.blockedUntil)) {
      rateLimitMap.delete(key)
    }
  }
}, 5 * 60 * 1000)
