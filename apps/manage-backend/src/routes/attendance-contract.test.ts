import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
}))

vi.mock('../db', () => ({
  db: {
    execute: executeMock,
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

import { generateTestToken, testRequest } from '../test/helpers'

describe('attendance contract smoke tests', () => {
  const studentId = '11111111-1111-4111-8111-111111111111'
  const teacherId = '22222222-2222-4222-8222-222222222222'

  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-1234567890'
  })

  beforeEach(() => {
    executeMock.mockReset()
  })

  it('GET /api/admin/attendance returns compatibility payload for reports and student detail pages', async () => {
    const token = await generateTestToken({ role: 'admin' })

    executeMock
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([
        {
          id: 'att-1',
          student_id: studentId,
          enrollment_id: 'enr-1',
          date: '2026-03-01',
          status: 'late',
          note: 'traffic',
          student_name: '王小明',
          grade: '國一',
          course_name: '國中數學',
          created_at: '2026-03-01T10:00:00Z',
        },
      ])

    const res = await testRequest('GET', `/api/admin/attendance?studentId=${studentId}`, { token })

    expect(res.status).toBe(200)
    const body = res.json as Record<string, any>
    expect(body.success).toBe(true)
    expect(body.data.attendance).toHaveLength(1)
    expect(body.data.records).toHaveLength(1)
    expect(body.data.attendance[0]).toMatchObject({
      studentId,
      status: 'late',
      present: true,
      course: '國中數學',
      notes: 'traffic',
    })
    expect(body.meta.pagination.total).toBe(1)
  })

  it('POST /api/teacher-attendance accepts absent records and auto-approves them', async () => {
    const token = await generateTestToken({ role: 'admin' })

    executeMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'ta-1',
          teacher_id: teacherId,
          date: '2026-03-06',
          type: 'absent',
          status: 'approved',
        },
      ])

    const res = await testRequest('POST', '/api/teacher-attendance', {
      token,
      body: {
        teacherId,
        date: '2026-03-06',
        type: 'absent',
        reason: '未到班',
      },
    })

    expect(res.status).toBe(201)
    const body = res.json as Record<string, any>
    expect(body.success).toBe(true)
    expect(body.data.record.type).toBe('absent')
    expect(body.data.record.status).toBe('approved')
  })

  it('GET /api/teacher-attendance/stats exposes salary-friendly fields', async () => {
    const token = await generateTestToken({ role: 'admin' })

    executeMock.mockResolvedValueOnce([
      {
        teacher_id: teacherId,
        teacher_name: '王老師',
        attendance_days: 18,
        late_count: 2,
        absent_days: 1,
        sick_leave_days: 1,
        personal_leave_days: 3,
        annual_leave_days: 0,
        family_leave_days: 0,
        other_leave_days: 0,
        total_leave_days: 4,
        substitute_count: 1,
        attendance_rate: 90,
      },
    ])

    const res = await testRequest('GET', `/api/teacher-attendance/stats?teacherId=${teacherId}&month=2026-03`, { token })

    expect(res.status).toBe(200)
    const body = res.json as Record<string, any>
    expect(body.success).toBe(true)
    expect(body.data.stats[0]).toMatchObject({
      teacher_id: teacherId,
      late_count: 2,
      absent_days: 1,
      personal_leave_days: 3,
      total_leave_days: 4,
    })
  })

  it('GET /api/admin/reports/trend returns chart-friendly month buckets', async () => {
    const token = await generateTestToken({ role: 'admin' })

    executeMock
      .mockResolvedValueOnce([
        { month: '2026-01' },
        { month: '2026-02' },
        { month: '2026-03' },
      ])
      .mockResolvedValueOnce([
        { month: '2026-01', active_students: 7 },
        { month: '2026-02', active_students: 8 },
        { month: '2026-03', active_students: 9 },
      ])

    const res = await testRequest('GET', '/api/admin/reports/trend?months=3', { token })

    expect(res.status).toBe(200)
    const body = res.json as Record<string, any>
    expect(body.success).toBe(true)
    expect(body.data.months).toEqual([
      { month: '2026-01', activeStudents: 7, attendanceRate: 0, avgScore: 0 },
      { month: '2026-02', activeStudents: 8, attendanceRate: 0, avgScore: 0 },
      { month: '2026-03', activeStudents: 9, attendanceRate: 0, avgScore: 0 },
    ])
  })
})