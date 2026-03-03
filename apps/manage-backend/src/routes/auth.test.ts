import { describe, it, expect, vi, beforeAll } from 'vitest'

// Mock DB and side-effect modules before importing app
vi.mock('../db', () => ({
  db: {
    execute: vi.fn().mockResolvedValue([]),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
  checkDatabaseHealth: vi.fn().mockResolvedValue(false),
  getDatabaseMetrics: vi.fn().mockReturnValue({
    totalQueries: 0, slowQueries: 0, timeouts: 0, errors: 0,
    avgQueryTime: 0, activeConnections: 0, reconnections: 0,
    poolConfig: {}, healthStatus: 'unknown',
  }),
}))

vi.mock('../db/startup-migrations', () => ({
  runMigrations: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../events', () => ({
  initializeEventSystem: vi.fn(),
}))

vi.mock('@94cram/shared/middleware', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
}))

vi.mock('../middleware/rateLimit', () => ({
  rateLimit: () => async (_c: unknown, next: () => Promise<void>) => next(),
}))

vi.mock('../middleware/tenant', () => ({
  tenantMiddleware: async (_c: unknown, next: () => Promise<void>) => next(),
}))

import { testRequest, generateTestToken, generateExpiredToken } from '../test/helpers'

describe('POST /api/auth/login - validation', () => {
  it('returns 400 when body is empty', async () => {
    const res = await testRequest('POST', '/api/auth/login', { body: {} })
    expect(res.status).toBe(400)
  })

  it('returns 400 when username is provided but password is missing', async () => {
    const res = await testRequest('POST', '/api/auth/login', {
      body: { username: 'admin' },
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when firebaseToken field is empty string', async () => {
    const res = await testRequest('POST', '/api/auth/login', {
      body: { firebaseToken: '' },
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 with neither username/password nor firebaseToken', async () => {
    const res = await testRequest('POST', '/api/auth/login', {
      body: { email: 'not-supported@test.com' },
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/login - DB fallback', () => {
  it('returns 500 or 401 when DB is unavailable (no DB in test)', async () => {
    const res = await testRequest('POST', '/api/auth/login', {
      body: { username: 'admin', password: 'wrong' },
    })
    // With mocked DB returning empty rows, user not found → 401
    expect([401, 500]).toContain(res.status)
  })
})

describe('GET /api/auth/me - token validation', () => {
  it('returns 401 when no token provided', async () => {
    const res = await testRequest('GET', '/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('returns 401 when token is malformed', async () => {
    const res = await testRequest('GET', '/api/auth/me', {
      token: 'not.a.valid.jwt',
    })
    expect(res.status).toBe(401)
  })

  it('returns 401 when token is expired', async () => {
    const expiredToken = await generateExpiredToken()
    const res = await testRequest('GET', '/api/auth/me', { token: expiredToken })
    expect(res.status).toBe(401)
  })

  it('returns 200 with a valid token', async () => {
    const token = await generateTestToken()
    const res = await testRequest('GET', '/api/auth/me', { token })
    expect(res.status).toBe(200)
    const body = res.json as Record<string, unknown>
    expect(body).toHaveProperty('data')
    const data = body.data as Record<string, unknown>
    expect(data).toHaveProperty('user')
  })
})

describe('POST /api/auth/demo', () => {
  it('returns 200 with valid demo token (no DB required)', async () => {
    const res = await testRequest('POST', '/api/auth/demo', {
      body: { username: 'boss' },
    })
    expect(res.status).toBe(200)
    const body = res.json as Record<string, unknown>
    expect(body).toHaveProperty('data')
    const data = body.data as Record<string, unknown>
    expect(data).toHaveProperty('token')
  })

  it('returns 400 for unknown demo username', async () => {
    const res = await testRequest('POST', '/api/auth/demo', {
      body: { username: 'nonexistent' },
    })
    expect(res.status).toBe(400)
  })
})

describe('Protected routes - auth middleware', () => {
  it('GET /api/admin/students returns 401 without token', async () => {
    const res = await testRequest('GET', '/api/admin/students')
    expect(res.status).toBe(401)
  })

  it('GET /api/w8/schedules returns 401 without token', async () => {
    const res = await testRequest('GET', '/api/w8/schedules')
    expect(res.status).toBe(401)
  })
})
