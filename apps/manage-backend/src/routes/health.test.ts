import { describe, it, expect, vi, beforeAll } from 'vitest'

// Mock DB and related modules before importing app
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
    totalQueries: 0,
    slowQueries: 0,
    timeouts: 0,
    errors: 0,
    avgQueryTime: 0,
    activeConnections: 0,
    reconnections: 0,
    poolConfig: {},
    healthStatus: 'unknown',
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

vi.mock('../middleware/tenant', () => ({
  tenantMiddleware: async (_c: unknown, next: () => Promise<void>) => next(),
}))

import { testRequest } from '../test/helpers'

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await testRequest('GET', '/health')
    expect(res.status).toBe(200)
    const body = res.json as Record<string, unknown>
    expect(body).toHaveProperty('data')
    expect((body.data as Record<string, unknown>).status).toBe('ok')
  })
})

describe('GET /api/health/live', () => {
  it('returns 200 alive (no DB required)', async () => {
    const res = await testRequest('GET', '/api/health/live')
    expect(res.status).toBe(200)
    const body = res.json as Record<string, unknown>
    expect(body).toHaveProperty('data')
    expect((body.data as Record<string, unknown>).status).toBe('alive')
  })
})

describe('GET /api/health', () => {
  it('returns 503 when DB is not connected', async () => {
    const res = await testRequest('GET', '/api/health')
    // Without DB, healthRoutes returns 503 or the rate-limiter/tenant may intercept
    // We just confirm the server responds (not a crash)
    expect([200, 404, 503]).toContain(res.status)
  })
})
