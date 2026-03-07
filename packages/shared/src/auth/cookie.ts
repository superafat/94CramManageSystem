/**
 * Cookie-based JWT Auth Helpers
 * HttpOnly cookie for secure token storage
 */
import type { Context } from 'hono'

export const ACCESS_COOKIE = 'cram94_access'
export const REFRESH_COOKIE = 'cram94_refresh'
export const LEGACY_ACCESS_COOKIE = 'token'
export const LEGACY_REFRESH_COOKIE = 'refresh_token'
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
  c.header('Set-Cookie', buildCookie(LEGACY_ACCESS_COOKIE, token, ACCESS_MAX_AGE, options), { append: true })
}

export function setRefreshCookie(c: Context, token: string, options?: CookieOptions) {
  c.header('Set-Cookie', buildCookie(REFRESH_COOKIE, token, REFRESH_MAX_AGE, options), { append: true })
  c.header('Set-Cookie', buildCookie(LEGACY_REFRESH_COOKIE, token, REFRESH_MAX_AGE, options), { append: true })
}

export function clearAuthCookie(c: Context, options?: CookieOptions) {
  c.header('Set-Cookie', buildCookie(ACCESS_COOKIE, '', 0, options))
  c.header('Set-Cookie', buildCookie(LEGACY_ACCESS_COOKIE, '', 0, options), { append: true })
  c.header('Set-Cookie', buildCookie(REFRESH_COOKIE, '', 0, options), { append: true })
  c.header('Set-Cookie', buildCookie(LEGACY_REFRESH_COOKIE, '', 0, options), { append: true })
}

function extractCookieValue(cookieHeader: string, names: readonly string[]): string | null {
  for (const name of names) {
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
    if (match) return match[1]
  }
  return null
}

/**
 * Extract access token from request — tries cookie first, then Authorization header
 */
export function extractToken(c: Context): string | null {
  const cookieHeader = c.req.header('Cookie')
  if (cookieHeader) {
    const token = extractCookieValue(cookieHeader, [ACCESS_COOKIE, LEGACY_ACCESS_COOKIE])
    if (token) return token
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
    const token = extractCookieValue(cookieHeader, [REFRESH_COOKIE, LEGACY_REFRESH_COOKIE])
    if (token) return token
  }
  return null
}
