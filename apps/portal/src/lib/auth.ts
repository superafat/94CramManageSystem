import { decodeJwt } from 'jose'

const COOKIE_NAMES = ['token', 'platform_token'] as const
const LEGACY_COOKIE_NAME = 'platform_token'

export interface PlatformUser {
  userId: string
  email: string
  name: string
  role: string
  tenantId: string
}

export function setToken(token: string): void {
  document.cookie = `${LEGACY_COOKIE_NAME}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
}

export function getToken(): string | null {
  if (typeof document === 'undefined') return null
  for (const cookieName of COOKIE_NAMES) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${cookieName}=([^;]*)`))
    if (match) return decodeURIComponent(match[1])
  }
  return null
}

export function removeToken(): void {
  for (const cookieName of COOKIE_NAMES) {
    document.cookie = `${cookieName}=; path=/; max-age=0`
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem('platform_token')
  }
}

export function parseToken(token: string): PlatformUser | null {
  try {
    const payload = decodeJwt(token)
    return {
      userId: (payload.userId as string) || (payload.sub as string) || '',
      email: (payload.email as string) || '',
      name: (payload.name as string) || '',
      role: (payload.role as string) || '',
      tenantId: (payload.tenantId as string) || '',
    }
  } catch {
    return null
  }
}
