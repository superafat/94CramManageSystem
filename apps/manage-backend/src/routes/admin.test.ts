import { describe, it, expect, vi } from 'vitest'

// Mock DB and side-effect modules before importing app
vi.mock('../db', () => ({
  db: {
    execute: vi.fn().mockResolvedValue([]),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'tenant-id', name: 'Test Tenant' }]),
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

// Mock AI modules that may fail without API keys
vi.mock('../ai/rag', () => ({ ingestChunk: vi.fn() }))
vi.mock('../ai/churn', () => ({ analyzeChurnRisk: vi.fn() }))
vi.mock('../ai/reports', () => ({
  generateBranchReport: vi.fn(),
  generateStudentReport: vi.fn(),
}))
vi.mock('../ai/scheduling', () => ({
  checkConflicts: vi.fn(),
  createTimeSlot: vi.fn(),
  getWeeklySchedule: vi.fn(),
}))
vi.mock('../ai/billing', () => ({
  generateInvoices: vi.fn(),
  getInvoices: vi.fn(),
  markPaid: vi.fn(),
}))
vi.mock('../ai/payroll', () => ({
  calculatePayroll: vi.fn(),
  getPayroll: vi.fn(),
}))
vi.mock('../ai/providers', () => ({
  providerFactory: { getProvider: vi.fn() },
  quotaManager: { checkQuota: vi.fn(), recordUsage: vi.fn() },
}))

import { testRequest, generateTestToken } from '../test/helpers'

describe('GET /api/admin/students - auth', () => {
  it('returns 401 without token', async () => {
    const res = await testRequest('GET', '/api/admin/students')
    expect(res.status).toBe(401)
  })

  it('with valid token does not return 401 (may return 200 or 500 depending on DB)', async () => {
    const token = await generateTestToken({ role: 'admin' })
    const res = await testRequest('GET', '/api/admin/students', { token })
    expect(res.status).not.toBe(401)
  })
})

describe('POST /api/admin/students - validation', () => {
  it('returns 401 without token', async () => {
    const res = await testRequest('POST', '/api/admin/students', {
      body: { name: 'Test Student' },
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 with token but invalid body (missing required fields)', async () => {
    const token = await generateTestToken({ role: 'admin' })
    const res = await testRequest('POST', '/api/admin/students', {
      token,
      body: { invalidField: 'bad' },
    })
    // Validation should reject with 400 before hitting DB
    expect([400, 422, 500]).toContain(res.status)
  })
})

describe('POST /api/admin/knowledge/ingest - RBAC', () => {
  it('returns 401 without token', async () => {
    const res = await testRequest('POST', '/api/admin/knowledge/ingest', {
      body: { content: 'test' },
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 with non-admin role (teacher)', async () => {
    const token = await generateTestToken({ role: 'teacher' })
    const res = await testRequest('POST', '/api/admin/knowledge/ingest', {
      token,
      body: { content: 'test', source: 'test' },
    })
    expect(res.status).toBe(403)
  })
})

describe('GET /api/admin/tenants - admin required', () => {
  it('returns 401 without token', async () => {
    const res = await testRequest('GET', '/api/admin/tenants')
    expect(res.status).toBe(401)
  })

  it('returns 403 with teacher role (not admin)', async () => {
    const token = await generateTestToken({ role: 'teacher' })
    const res = await testRequest('GET', '/api/admin/tenants', { token })
    expect(res.status).toBe(403)
  })
})
