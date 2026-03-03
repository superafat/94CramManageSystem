import { describe, it, expect, vi } from 'vitest'

// Mock DB and rate-limiter before importing app
vi.mock('../db', () => ({
  db: {
    execute: vi.fn().mockResolvedValue([]),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}))

vi.mock('@94cram/shared/middleware', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
  clearRateLimitTimer: vi.fn(),
}))

import { testRequest } from '../test/helpers'

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await testRequest('GET', '/health')
    expect(res.status).toBe(200)
    const body = res.json as Record<string, unknown>
    expect(body.status).toBe('ok')
    expect(body.service).toBe('94stock')
  })
})

describe('GET /', () => {
  it('returns 200 with API message', async () => {
    const res = await testRequest('GET', '/')
    expect(res.status).toBe(200)
    const body = res.json as Record<string, unknown>
    expect(body.message).toBe('94Stock API')
  })
})
