import { createHash } from 'crypto'

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function getRefreshTokenExpiryDate(now = new Date()): Date {
  return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
}