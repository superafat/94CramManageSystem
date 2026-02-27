/**
 * Cookie-based JWT Auth Helpers
 * HttpOnly cookie for secure token storage
 */
import type { Context } from 'hono'

const ACCESS_COOKIE = 'token'
const REFRESH_COOKIE = 'refresh_token'
const ACCESS_MAX_AGE = 60 * 60 // 1 hour
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 // 7 days

interface CookieOptions {
  domain?: string
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}

function buildCookie(name: string, value: string, maxAge: number, options?: CookieOptions): string {
  const secure = options?.secure ?? (process.env.NODE_ENV === 'production')
  const sameSite = options?.sameSite ?? 'Lax'
  const domainPart = options?.domain ? `; Domain=${options.domain}` : ''
  return `${name}=${value}; HttpOnly; ${secure ? 'Secure; ' : ''}SameSite=${sameSite}; Path=/; Max-Age=${maxAge}${domainPart}`
}

export function setAuthCookie(c: Context, token: string, options?: CookieOptions) {
  c.header('Set-Cookie', buildCookie(ACCESS_COOKIE, token, ACCESS_MAX_AGE, options))
}

export function setRefreshCookie(c: Context, token: string, options?: CookieOptions) {
  c.header('Set-Cookie', buildCookie(REFRESH_COOKIE, token, REFRESH_MAX_AGE, options), { append: true })
}

export function clearAuthCookie(c: Context, options?: CookieOptions) {
  c.header('Set-Cookie', buildCookie(ACCESS_COOKIE, '', 0, options))
  c.header('Set-Cookie', buildCookie(REFRESH_COOKIE, '', 0, options), { append: true })
}

/**
 * Extract access token from request — tries cookie first, then Authorization header
 */
export function extractToken(c: Context): string | null {
  const cookieHeader = c.req.header('Cookie')
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/)
    if (match) return match[1]
  }

  const authHeader = c.req.header('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  return null
}

/**
 * Extract refresh token from cookie
 */
export function extractRefreshToken(c: Context): string | null {
  const cookieHeader = c.req.header('Cookie')
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)refresh_token=([^;]+)/)
    if (match) return match[1]
  }
  return null
}
