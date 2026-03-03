import { describe, it, expect, vi } from 'vitest'

// Mock DB before importing app — auth middleware does a DB lookup
vi.mock('../db', () => ({
  db: {
    execute: vi.fn().mockResolvedValue([]),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
        limit: vi.fn().mockReturnValue({
          offset: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
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

describe('POST /api/auth/login - validation', () => {
  it('returns 400 when body is empty', async () => {
    const res = await testRequest('POST', '/api/auth/login', { body: {} })
    expect(res.status).toBe(400)
  })

  it('returns 400 when email is missing', async () => {
    const res = await testRequest('POST', '/api/auth/login', {
      body: { password: 'somepassword' },
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when email format is invalid', async () => {
    const res = await testRequest('POST', '/api/auth/login', {
      body: { email: 'not-an-email', password: 'somepassword' },
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when password is missing', async () => {
    const res = await testRequest('POST', '/api/auth/login', {
      body: { email: 'user@test.com' },
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/login - DB fallback', () => {
  it('returns 401 when user not found (mocked empty DB)', async () => {
    const res = await testRequest('POST', '/api/auth/login', {
      body: { email: 'user@test.com', password: 'password123' },
    })
    // DB mock returns [] → user not found → 401
    expect(res.status).toBe(401)
    const body = res.json as Record<string, unknown>
    expect(body.error).toBeDefined()
  })
})

describe('GET /api/auth/me - auth middleware', () => {
  it('returns 401 without token', async () => {
    const res = await testRequest('GET', '/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('returns 401 with invalid token', async () => {
    const res = await testRequest('GET', '/api/auth/me', {
      token: 'invalid.jwt.token',
    })
    expect(res.status).toBe(401)
  })
})

describe('POST /api/auth/register - validation', () => {
  it('returns 400 when body is empty', async () => {
    const res = await testRequest('POST', '/api/auth/register', { body: {} })
    expect(res.status).toBe(400)
  })

  it('returns 400 when email is invalid', async () => {
    const res = await testRequest('POST', '/api/auth/register', {
      body: {
        tenantName: 'Test',
        slug: 'test',
        email: 'bad-email',
        password: 'pass123',
        name: 'Admin',
      },
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when password is too short', async () => {
    const res = await testRequest('POST', '/api/auth/register', {
      body: {
        tenantName: 'Test',
        slug: 'test',
        email: 'admin@test.com',
        password: 'abc',
        name: 'Admin',
      },
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/users - RBAC', () => {
  it('returns 401 without token', async () => {
    const res = await testRequest('POST', '/api/auth/users', {
      body: { email: 'new@test.com', password: 'pass', name: 'New', role: 'viewer' },
    })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/auth/users - RBAC', () => {
  it('returns 401 without token', async () => {
    const res = await testRequest('GET', '/api/auth/users')
    expect(res.status).toBe(401)
  })
})
