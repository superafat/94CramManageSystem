/**
 * Cookie-based JWT Auth Helpers
 * HttpOnly cookie for secure token storage
 */
import type { Context } from 'hono'

const COOKIE_NAME = 'token'
const MAX_AGE = 7 * 24 * 60 * 60 // 7 days

interface CookieOptions {
  domain?: string
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}

export function setAuthCookie(c: Context, token: string, options?: CookieOptions) {
  const secure = options?.secure ?? (process.env.NODE_ENV === 'production')
  const sameSite = options?.sameSite ?? 'Lax'
  const domainPart = options?.domain ? `; Domain=${options.domain}` : ''

  c.header('Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; ${secure ? 'Secure; ' : ''}SameSite=${sameSite}; Path=/; Max-Age=${MAX_AGE}${domainPart}`
  )
}

export function clearAuthCookie(c: Context, options?: CookieOptions) {
  const secure = options?.secure ?? (process.env.NODE_ENV === 'production')
  const sameSite = options?.sameSite ?? 'Lax'
  const domainPart = options?.domain ? `; Domain=${options.domain}` : ''

  c.header('Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; ${secure ? 'Secure; ' : ''}SameSite=${sameSite}; Path=/; Max-Age=0${domainPart}`
  )
}

/**
 * Extract token from request — tries cookie first, then Authorization header
 */
export function extractToken(c: Context): string | null {
  // 1. Try cookie
  const cookieHeader = c.req.header('Cookie')
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/)
    if (match) return match[1]
  }

  // 2. Fallback to Bearer header (backwards compatibility + API clients)
  const authHeader = c.req.header('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  return null
}
