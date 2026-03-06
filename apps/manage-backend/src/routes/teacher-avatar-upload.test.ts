import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { uploadTeacherAvatarMock } = vi.hoisted(() => ({
  uploadTeacherAvatarMock: vi.fn(),
}))

vi.mock('../db', () => ({
  db: {
    execute: vi.fn(),
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

vi.mock('../middleware/rateLimit', () => ({
  rateLimit: () => async (_c: unknown, next: () => Promise<void>) => next(),
}))

vi.mock('../middleware/tenant', () => ({
  tenantMiddleware: async (_c: unknown, next: () => Promise<void>) => next(),
}))

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

vi.mock('../services/gcs', () => ({
  uploadTeacherAvatar: uploadTeacherAvatarMock,
}))

import { app } from '../app'
import { generateTestToken } from '../test/helpers'

describe('POST /api/w8/teachers/upload-avatar', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-1234567890'
  })

  beforeEach(() => {
    uploadTeacherAvatarMock.mockReset()
  })

  it('uploads a valid avatar image and returns a public url', async () => {
    const token = await generateTestToken({ role: 'admin' })
    uploadTeacherAvatarMock.mockResolvedValue('https://storage.googleapis.com/demo-bucket/teacher-avatars/avatar.png')

    const body = new FormData()
    body.append('tenantId', '11111111-1111-1111-1111-111111111111')
    body.append('file', new File([Uint8Array.from([0x89, 0x50, 0x4e, 0x47])], 'avatar.png', { type: 'image/png' }))

    const res = await app.request('/api/w8/teachers/upload-avatar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    })

    const json = await res.json() as { success: boolean; data: { url: string } }

    expect(res.status).toBe(201)
    expect(json.success).toBe(true)
    expect(json.data.url).toContain('teacher-avatars/avatar.png')
    expect(uploadTeacherAvatarMock).toHaveBeenCalledOnce()
  })

  it('rejects unsupported file types', async () => {
    const token = await generateTestToken({ role: 'admin' })

    const body = new FormData()
    body.append('tenantId', '11111111-1111-1111-1111-111111111111')
    body.append('file', new File(['not-an-image'], 'avatar.txt', { type: 'text/plain' }))

    const res = await app.request('/api/w8/teachers/upload-avatar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    })

    const json = await res.json() as { error?: { message?: string } }

    expect(res.status).toBe(400)
    expect(JSON.stringify(json)).toContain('Invalid file type')
    expect(uploadTeacherAvatarMock).not.toHaveBeenCalled()
  })
})