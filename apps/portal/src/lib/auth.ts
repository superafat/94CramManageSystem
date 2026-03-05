import { decodeJwt } from 'jose'

const COOKIE_NAME = 'platform_token'

export interface PlatformUser {
  userId: string
  email: string
  name: string
  role: string
  tenantId: string
}

export function setToken(token: string): void {
  document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
}

export function getToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function removeToken(): void {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`
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
