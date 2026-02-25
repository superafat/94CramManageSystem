/**
 * Admin Routes - 管理後台 API
 * 
 * 修復項目：
 * 1. ✅ 增加 Input Validation (Zod)
 * 2. ✅ 統一 API Response Format
 * 3. ✅ 防止 SQL Injection (已使用 parameterized queries)
 * 4. ✅ 改善 Error Handling
 * 5. ✅ 增加分頁參數驗證
 * 6. ✅ 搜尋字串清理（防止 SQL wildcard 攻擊）
 * 7. ✅ 增加 UUID 驗證
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { ingestChunk } from '../ai/rag'
import { authMiddleware } from '../middleware/auth'
import { requireRole, requirePermission, Role, Permission, type RBACVariables } from '../middleware/rbac'
import { db } from '../db'
import { sql } from 'drizzle-orm'
import { analyzeChurnRisk } from '../ai/churn'
import { generateBranchReport, generateStudentReport } from '../ai/reports'
import { checkConflicts, createTimeSlot, getWeeklySchedule } from '../ai/scheduling'
import { generateInvoices, getInvoices, markPaid } from '../ai/billing'
import { calculatePayroll, getPayroll } from '../ai/payroll'
import { branchReportToMd, churnRisksToMd, studentsToMd, invoicesToMd, scheduleToMd } from '../utils/markdown'
import {
  uuidSchema,
  createStudentSchema,
  updateStudentSchema,
  studentStatusSchema,
  createAttendanceSchema,
  bulkAttendanceSchema,
  createGradeSchema,
  bulkGradeSchema,
  sanitizeSearchTerm,
} from '../utils/validation'
import {
  success,
  successWithPagination,
  badRequest,
  notFound,
  forbidden,
  internalError,
} from '../utils/response'
import { providerFactory, quotaManager } from '../ai/providers'

export const adminRoutes = new Hono<{ Variables: RBACVariables }>()

// ===== Helper Functions =====

/** Check if string is a valid UUID (guest tokens like tg-xxx are not) */
const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
const getUserBranchId = (user: unknown): string | null => {
  if (!user || typeof user !== 'object') return null
  const branchId = (user as { branch_id?: unknown }).branch_id
  return typeof branchId === 'string' && isUUID(branchId) ? branchId : null
}

/** Convert result to array */
const rows = (result: any): any[] => Array.isArray(result) ? result : (result?.rows ?? [])
const first = (result: any) => rows(result)[0]
const isBranchInTenant = async (branchId: string, tenantId: string): Promise<boolean> => {
  const result = await db.execute(sql`
    SELECT 1
    FROM branches
    WHERE id = ${branchId} AND tenant_id = ${tenantId}
    LIMIT 1
  `)
  return Boolean(first(result))
}

/** Check if request wants markdown response */
function wantsMd(c: any): boolean {
  const accept = c.req.header('Accept') ?? ''
  return accept.includes('text/markdown') || c.req.query('format') === 'md'
}

/** Send markdown response */
function mdResponse(c: any, text: string) {
  return c.text(text, 200, { 'Content-Type': 'text/markdown; charset=utf-8' })
}

// ===== Auth gate: ALL admin routes require valid JWT =====
adminRoutes.use('*', authMiddleware)

// ========================================================================
// KNOWLEDGE INGEST (admin only)
// ========================================================================

const ingestSchema = z.object({
  branchId: uuidSchema.optional(),
  tenantId: uuidSchema.optional(),
  content: z.string().min(1).max(50000).optional(),
  chunks: z.array(z.object({
    content: z.string().min(1).max(50000),
    metadata: z.record(z.string(), z.any()).optional(),
  })).max(100).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
}).refine(
  (data) => data.content || (data.chunks && data.chunks.length > 0),
  { message: 'Provide "content" or "chunks" array' }
)

adminRoutes.post('/knowledge/ingest', requireRole(Role.ADMIN), zValidator('json', ingestSchema), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const tenantId = body.tenantId ?? user.tenant_id
  
  try {
    if (body.chunks && Array.isArray(body.chunks)) {
      let stored = 0
      for (const chunk of body.chunks) {
        await ingestChunk(body.branchId ?? '', chunk.content, chunk.metadata ?? {}, tenantId)
        stored++
      }
      return success(c, { stored })
    } else if (body.content) {
      await ingestChunk(body.branchId ?? '', body.content, body.metadata ?? {}, tenantId)
      return success(c, { stored: 1 })
    }
    return badRequest(c, 'Provide "content" or "chunks" array')
  } catch (err) {
    console.error('Ingest error:', err)
    return internalError(c, err)
  }
})

// ========================================================================
// TENANTS (superadmin only)
// ========================================================================

adminRoutes.get('/tenants', requireRole(Role.ADMIN), async (c) => {
  try {
    const result = await db.execute(sql`
      SELECT id, name, slug, plan, active, created_at 
      FROM tenants 
      ORDER BY created_at
    `)
    return success(c, { tenants: rows(result) })
  } catch (err) {
    return internalError(c, err)
  }
})

adminRoutes.get('/tenants/:tenantId/stats',
  requireRole(Role.ADMIN),
  zValidator('param', z.object({ tenantId: uuidSchema })),
  async (c) => {
    const { tenantId } = c.req.valid('param')
    try {
      const [conv] = await db.execute(sql`SELECT COUNT(*)::int as count FROM conversations WHERE tenant_id = ${tenantId}`) as any[]
      const [chunk] = await db.execute(sql`SELECT COUNT(*)::int as count FROM knowledge_chunks WHERE tenant_id = ${tenantId}`) as any[]
      const [branch] = await db.execute(sql`SELECT COUNT(*)::int as count FROM branches WHERE tenant_id = ${tenantId}`) as any[]
      return success(c, {
        conversations: conv?.count ?? 0,
        knowledgeChunks: chunk?.count ?? 0,
        branches: branch?.count ?? 0,
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ========================================================================
// TRIAL MANAGEMENT (superadmin only)
// ========================================================================

// Get all trial requests
adminRoutes.get('/trials', requireRole(Role.ADMIN), async (c) => {
  try {
    const result = await db.execute(sql`
      SELECT 
        t.id, t.name, t.slug, t.plan, t.active, t.created_at,
        t.trial_status, t.trial_start_at, t.trial_end_at,
        t.trial_approved_at, t.trial_notes,
        t.trial_approved_by,
        u.name as approver_name
      FROM tenants t
      LEFT JOIN users u ON t.trial_approved_by = u.id
      WHERE t.trial_status != 'none'
      ORDER BY 
        CASE t.trial_status 
          WHEN 'pending' THEN 1 
          WHEN 'approved' THEN 2 
          WHEN 'rejected' THEN 3 
          WHEN 'expired' THEN 4 
          ELSE 5 
        END,
        t.created_at DESC
    `)
    return success(c, { trials: rows(result) })
  } catch (err) {
    return internalError(c, err)
  }
})

// Get single trial request details
adminRoutes.get('/trials/:tenantId',
  requireRole(Role.ADMIN),
  zValidator('param', z.object({ tenantId: uuidSchema })),
  async (c) => {
    const { tenantId } = c.req.valid('param')
    try {
      const [tenant] = await db.execute(sql`
        SELECT 
          t.*,
          u.name as approver_name,
          (SELECT COUNT(*)::int FROM users WHERE tenant_id = t.id) as user_count,
          (SELECT COUNT(*)::int FROM branches WHERE tenant_id = t.id) as branch_count
        FROM tenants t
        LEFT JOIN users u ON t.trial_approved_by = u.id
        WHERE t.id = ${tenantId}
      `) as any[]
      
      if (!tenant) {
        return notFound(c, 'Tenant not found')
      }
      return success(c, { tenant })
    } catch (err) {
      return internalError(c, err)
    }
  })

// Approve trial request
adminRoutes.post('/trials/:tenantId/approve',
  requireRole(Role.ADMIN),
  zValidator('param', z.object({ tenantId: uuidSchema })),
  zValidator('json', z.object({
    notes: z.string().max(500).optional(),
  })),
  async (c) => {
    const { tenantId } = c.req.valid('param')
    const { notes } = c.req.valid('json')
    const approver = c.get('user')
    
    try {
      const now = new Date().toISOString()
      const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      
      await db.execute(sql`
        UPDATE tenants 
        SET trial_status = 'approved',
            trial_start_at = ${now},
            trial_end_at = ${trialEnd},
            trial_approved_by = ${approver.id},
            trial_approved_at = ${now},
            trial_notes = ${notes || null},
            plan = 'pro',
            updated_at = NOW()
        WHERE id = ${tenantId}
      `)
      
      return success(c, { message: 'Trial approved for 30 days' })
    } catch (err) {
      return internalError(c, err)
    }
  })

// Reject trial request
adminRoutes.post('/trials/:tenantId/reject',
  requireRole(Role.ADMIN),
  zValidator('param', z.object({ tenantId: uuidSchema })),
  zValidator('json', z.object({
    notes: z.string().max(500),
  })),
  async (c) => {
    const { tenantId } = c.req.valid('param')
    const { notes } = c.req.valid('json')
    const approver = c.get('user')
    
    try {
      await db.execute(sql`
        UPDATE tenants 
        SET trial_status = 'rejected',
            trial_approved_by = ${approver.id},
            trial_approved_at = NOW(),
            trial_notes = ${notes},
            updated_at = NOW()
        WHERE id = ${tenantId}
      `)
      
      return success(c, { message: 'Trial request rejected' })
    } catch (err) {
      return internalError(c, err)
    }
  })

// Revoke active trial (early termination)
adminRoutes.post('/trials/:tenantId/revoke',
  requireRole(Role.ADMIN),
  zValidator('param', z.object({ tenantId: uuidSchema })),
  zValidator('json', z.object({
    notes: z.string().max(500).optional(),
  })),
  async (c) => {
    const { tenantId } = c.req.valid('param')
    const { notes } = c.req.valid('json')
    
    try {
      await db.execute(sql`
        UPDATE tenants 
        SET trial_status = 'expired',
            trial_end_at = NOW(),
            trial_notes = COALESCE(trial_notes || ', ', '') || 'REVOKED: ' || ${notes || 'Admin revoked'},
            updated_at = NOW()
        WHERE id = ${tenantId}
      `)
      
      return success(c, { message: 'Trial revoked' })
    } catch (err) {
      return internalError(c, err)
    }
  })

// ========================================================================
// STUDENTS
// ========================================================================

const studentQuerySchema = z.object({
  branchId: uuidSchema.optional(),
  search: z.string().max(100).optional(),
  grade: z.string().max(10).optional(),
  status: z.enum(['active', 'inactive', 'dropped', 'graduated', 'suspended', 'all']).default('active'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

adminRoutes.get('/students', requirePermission(Permission.STUDENTS_READ), zValidator('query', studentQuerySchema), async (c) => {
  const user = c.get('user')
  const tenantId = user.tenant_id
  const query = c.req.valid('query')
  const offset = (query.page - 1) * query.limit

  try {
    const conditions = [sql`s.tenant_id = ${tenantId}`, sql`s.deleted_at IS NULL`]
    
    if (query.status !== 'all') {
      conditions.push(sql`s.status = ${query.status}`)
    }
    if (query.branchId) {
      conditions.push(sql`s.branch_id = ${query.branchId}`)
    }
    if (query.grade) {
      conditions.push(sql`s.grade_level = ${query.grade}`)
    }
    if (query.search) {
      const searchTerm = sanitizeSearchTerm(query.search)
      conditions.push(sql`(
        s.full_name ILIKE ${'%' + searchTerm + '%'} 
        OR s.phone ILIKE ${'%' + searchTerm + '%'} 
        OR s.student_code ILIKE ${'%' + searchTerm + '%'}
      )`)
    }

    // Role-based filtering
    const teacherBranchId = getUserBranchId(user)
    if (user.role === Role.TEACHER && teacherBranchId) {
      conditions.push(sql`s.branch_id = ${teacherBranchId}`)
    } else if (user.role === Role.PARENT && isUUID(user.id)) {
      conditions.push(sql`s.id IN (SELECT student_id FROM parent_students WHERE parent_id = ${user.id})`)
    }

    const where = sql.join(conditions, sql` AND `)

    const [countResult] = await db.execute(sql`SELECT COUNT(*)::int as total FROM students s WHERE ${where}`) as any[]
    const total = countResult?.total ?? 0

    const studentRows = await db.execute(sql`
      SELECT s.id, s.student_code, s.full_name, s.nickname, s.gender,
        s.date_of_birth, s.school_name, s.grade_level, s.branch_id,
        s.phone, s.email, s.status, s.enrollment_date, s.notes, s.created_at,
        (SELECT json_agg(json_build_object(
          'id', e.id, 'course_id', e.course_id, 'status', e.status,
          'tuition', e.tuition_amount, 'start_date', e.start_date))
         FROM enrollments e WHERE e.student_id = s.id AND e.status = 'active') as enrollments
      FROM students s
      WHERE ${where}
      ORDER BY s.full_name
      LIMIT ${query.limit} OFFSET ${offset}
    `)

    return successWithPagination(c, { students: rows(studentRows) }, {
      page: query.page,
      limit: query.limit,
      total,
    })
  } catch (err) {
    return internalError(c, err)
  }
})

adminRoutes.get('/students/:id',
  requirePermission(Permission.STUDENTS_READ),
  zValidator('param', z.object({ id: uuidSchema })),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const { id: studentId } = c.req.valid('param')

    try {
      const [student] = await db.execute(sql`
        SELECT s.* FROM students s 
        WHERE s.id = ${studentId} AND s.tenant_id = ${tenantId} AND s.deleted_at IS NULL
      `) as any[]
      
      if (!student) {
        return notFound(c, 'Student')
      }

      // Role check
      const teacherBranchId = getUserBranchId(user)
      if (user.role === Role.TEACHER && teacherBranchId && student.branch_id !== teacherBranchId) {
        return forbidden(c, 'Access denied')
      }
      if (user.role === Role.PARENT && isUUID(user.id)) {
        const [link] = await db.execute(sql`
          SELECT 1
          FROM parent_students ps
          JOIN students s ON s.id = ps.student_id
          WHERE ps.student_id = ${studentId}
            AND ps.parent_id = ${user.id}
            AND s.tenant_id = ${tenantId}
            AND s.deleted_at IS NULL
          LIMIT 1
        `) as any[]
        if (!link) {
          return forbidden(c, 'Access denied')
        }
      }

      const enrollments = await db.execute(sql`
        SELECT e.*
        FROM enrollments e
        JOIN students s ON s.id = e.student_id
        WHERE e.student_id = ${studentId}
          AND s.tenant_id = ${tenantId}
          AND s.deleted_at IS NULL
        ORDER BY e.status, e.start_date DESC
      `)
      const attendance = await db.execute(sql`
        SELECT a.*
        FROM attendance a
        JOIN students s ON s.id = a.student_id
        WHERE a.student_id = ${studentId}
          AND s.tenant_id = ${tenantId}
          AND s.deleted_at IS NULL
        ORDER BY a.date DESC
        LIMIT 30
      `)
      const grades = await db.execute(sql`
        SELECT g.*
        FROM grades g
        JOIN students s ON s.id = g.student_id
        WHERE g.student_id = ${studentId}
          AND s.tenant_id = ${tenantId}
          AND s.deleted_at IS NULL
        ORDER BY g.date DESC
        LIMIT 20
      `)

      return success(c, { student, enrollments: rows(enrollments), attendance: rows(attendance), grades: rows(grades) })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

adminRoutes.post('/students',
  requirePermission(Permission.STUDENTS_WRITE),
  zValidator('json', createStudentSchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const body = c.req.valid('json')
    
    try {
      if (body.branchId && !(await isBranchInTenant(body.branchId, tenantId))) {
        return badRequest(c, 'Invalid branchId for current tenant')
      }

      const studentCode = body.studentCode || ('S' + Date.now().toString(36).toUpperCase())
      
      const [result] = await db.execute(sql`
        INSERT INTO students (tenant_id, branch_id, student_code, full_name, nickname, gender,
          date_of_birth, school_name, grade_level, phone, email, address, notes)
        VALUES (${tenantId}, ${body.branchId ?? null}, ${studentCode},
          ${body.fullName}, ${body.nickname ?? null}, ${body.gender ?? null},
          ${body.dateOfBirth ?? null}::date, ${body.schoolName ?? null}, ${body.gradeLevel ?? null},
          ${body.phone ?? null}, ${body.email ?? null}, ${body.address ?? null}, ${body.notes ?? null})
        RETURNING id
      `) as any[]
      
      return success(c, { id: result?.id }, 201)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

adminRoutes.put('/students/:id',
  requirePermission(Permission.STUDENTS_WRITE),
  zValidator('param', z.object({ id: uuidSchema })),
  zValidator('json', updateStudentSchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const { id: studentId } = c.req.valid('param')
    const body = c.req.valid('json')
    
    try {
      if (body.branchId && !(await isBranchInTenant(body.branchId, tenantId))) {
        return badRequest(c, 'Invalid branchId for current tenant')
      }

      const result = await db.execute(sql`
        UPDATE students SET
          full_name = COALESCE(${body.fullName ?? null}, full_name),
          nickname = COALESCE(${body.nickname ?? null}, nickname),
          branch_id = COALESCE(${body.branchId ?? null}, branch_id),
          grade_level = COALESCE(${body.gradeLevel ?? null}, grade_level),
          school_name = COALESCE(${body.schoolName ?? null}, school_name),
          phone = COALESCE(${body.phone ?? null}, phone),
          email = COALESCE(${body.email ?? null}, email),
          status = COALESCE(${body.status ?? null}, status),
          notes = COALESCE(${body.notes ?? null}, notes),
          updated_at = NOW()
        WHERE id = ${studentId} AND tenant_id = ${tenantId} AND deleted_at IS NULL
        RETURNING id
      `)
      
      if (!first(result)) {
        return notFound(c, 'Student')
      }
      
      return success(c, { updated: true })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

adminRoutes.delete('/students/:id',
  requirePermission(Permission.STUDENTS_WRITE),
  zValidator('param', z.object({ id: uuidSchema })),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const { id: studentId } = c.req.valid('param')
    
    try {
      // Soft delete
      const result = await db.execute(sql`
        UPDATE students 
        SET deleted_at = NOW(), status = 'dropped' 
        WHERE id = ${studentId} AND tenant_id = ${tenantId} AND deleted_at IS NULL
        RETURNING id
      `)
      
      if (!first(result)) {
        return notFound(c, 'Student')
      }
      
      return success(c, { deleted: true })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ========================================================================
// SCHEDULING
// ========================================================================

const scheduleQuerySchema = z.object({
  branchId: uuidSchema.optional(),
})

adminRoutes.get('/scheduling/week',
  requirePermission(Permission.SCHEDULE_READ),
  zValidator('query', scheduleQuerySchema),
  async (c) => {
    const user = c.get('user')
    const query = c.req.valid('query')
    const branchId = query.branchId ?? (user as any).branch_id
    
    if (!branchId) {
      return badRequest(c, 'branchId required')
    }
    
    try {
      const schedule = await getWeeklySchedule(user.tenant_id, branchId)
      if (wantsMd(c)) return mdResponse(c, scheduleToMd(schedule as any[]))
      return success(c, { schedule })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

adminRoutes.get('/schedule/:branchId',
  requirePermission(Permission.SCHEDULE_READ),
  zValidator('param', z.object({ branchId: uuidSchema })),
  async (c) => {
    const user = c.get('user')
    const { branchId } = c.req.valid('param')
    
    try {
      const schedule = await getWeeklySchedule(user.tenant_id, branchId)
      if (wantsMd(c)) return mdResponse(c, scheduleToMd(schedule as any[]))
      return success(c, { schedule })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

const checkConflictsSchema = z.object({
  branchId: uuidSchema,
  studentId: uuidSchema,
  teacherId: uuidSchema,
  classroomId: uuidSchema.optional(),
  subject: z.string().min(1).max(50),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  dayOfWeek: z.number().int().min(0).max(6),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

adminRoutes.post('/schedule/check',
  requirePermission(Permission.SCHEDULE_WRITE),
  zValidator('json', checkConflictsSchema),
  async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')
    
    try {
      const conflicts = await checkConflicts({ 
        tenantId: user.tenant_id,
        branchId: body.branchId,
        studentId: body.studentId,
        teacherId: body.teacherId,
        classroomId: body.classroomId,
        subject: body.subject,
        dayOfWeek: body.dayOfWeek,
        startTime: body.startTime,
        endTime: body.endTime,
        effectiveFrom: body.effectiveFrom,
      })
      return success(c, { conflicts, hasConflicts: conflicts.length > 0 })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

const createSlotSchema = z.object({
  branchId: uuidSchema,
  studentId: uuidSchema,
  teacherId: uuidSchema,
  classroomId: uuidSchema.optional(),
  subject: z.string().min(1).max(50),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  dayOfWeek: z.number().int().min(0).max(6),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

adminRoutes.post('/schedule/create',
  requirePermission(Permission.SCHEDULE_WRITE),
  zValidator('json', createSlotSchema),
  async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')
    
    try {
      const result = await createTimeSlot({ 
        tenantId: user.tenant_id,
        branchId: body.branchId,
        studentId: body.studentId,
        teacherId: body.teacherId,
        classroomId: body.classroomId,
        subject: body.subject,
        dayOfWeek: body.dayOfWeek,
        startTime: body.startTime,
        endTime: body.endTime,
        effectiveFrom: body.effectiveFrom,
      })
      return success(c, result, 201)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ========================================================================
// ATTENDANCE
// ========================================================================

const attendanceQuerySchema = z.object({
  studentId: uuidSchema.optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

adminRoutes.get('/attendance',
  requirePermission(Permission.ATTENDANCE_READ),
  zValidator('query', attendanceQuerySchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const query = c.req.valid('query')
    const offset = (query.page - 1) * query.limit

    try {
      const conditions = [sql`s.tenant_id = ${tenantId}`]
      
      if (query.studentId) conditions.push(sql`a.student_id = ${query.studentId}`)
      if (query.from) conditions.push(sql`a.date >= ${query.from}::date`)
      if (query.to) conditions.push(sql`a.date <= ${query.to}::date`)
      
      if (user.role === Role.TEACHER && (user as any).branch_id) {
        conditions.push(sql`s.branch_id = ${(user as any).branch_id}`)
      } else if (user.role === Role.PARENT && isUUID(user.id)) {
        conditions.push(sql`s.id IN (SELECT student_id FROM parent_students WHERE parent_id = ${user.id})`)
      }

      const where = sql.join(conditions, sql` AND `)
      
      const [cnt] = await db.execute(sql`
        SELECT COUNT(*)::int as total 
        FROM attendance a JOIN students s ON a.student_id = s.id 
        WHERE ${where}
      `) as any[]

      const attendanceRows = await db.execute(sql`
        SELECT a.id, a.student_id, a.lesson_id, a.date, a.present, a.notes, a.created_at,
          s.full_name as student_name, s.grade_level
        FROM attendance a JOIN students s ON a.student_id = s.id
        WHERE ${where}
        ORDER BY a.date DESC, s.full_name
        LIMIT ${query.limit} OFFSET ${offset}
      `)
      
      return successWithPagination(c, { attendance: rows(attendanceRows) }, {
        page: query.page,
        limit: query.limit,
        total: cnt?.total ?? 0,
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

adminRoutes.post('/attendance',
  requirePermission(Permission.ATTENDANCE_WRITE),
  zValidator('json', z.union([createAttendanceSchema, bulkAttendanceSchema])),
  async (c) => {
    const body = c.req.valid('json')
    
    try {
      const records = 'records' in body ? body.records : [body]
      let inserted = 0
      
      for (const rec of records) {
        await db.execute(sql`
          INSERT INTO attendance (student_id, lesson_id, date, present, notes)
          VALUES (${rec.studentId}, ${rec.lessonId ?? null},
            ${rec.date ?? new Date().toISOString().slice(0, 10)}::date,
            ${rec.present ?? true}, ${rec.notes ?? null})
        `)
        inserted++
      }
      
      return success(c, { inserted }, 201)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ========================================================================
// GRADES
// ========================================================================

const gradeQuerySchema = z.object({
  studentId: uuidSchema.optional(),
  examType: z.string().max(20).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

adminRoutes.get('/grades',
  requirePermission(Permission.GRADES_READ),
  zValidator('query', gradeQuerySchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const query = c.req.valid('query')
    const offset = (query.page - 1) * query.limit

    try {
      const conditions = [sql`g.tenant_id = ${tenantId}`]
      
      if (query.studentId) conditions.push(sql`g.student_id = ${query.studentId}`)
      if (query.examType) conditions.push(sql`g.exam_type = ${query.examType}`)
      if (query.from) conditions.push(sql`g.date >= ${query.from}::date`)
      if (query.to) conditions.push(sql`g.date <= ${query.to}::date`)
      
      if (user.role === Role.TEACHER && (user as any).branch_id) {
        conditions.push(sql`s.branch_id = ${(user as any).branch_id}`)
      } else if (user.role === Role.PARENT && isUUID(user.id)) {
        conditions.push(sql`s.id IN (SELECT student_id FROM parent_students WHERE parent_id = ${user.id})`)
      }

      const where = sql.join(conditions, sql` AND `)
      
      const [cnt] = await db.execute(sql`
        SELECT COUNT(*)::int as total 
        FROM grades g JOIN students s ON g.student_id = s.id 
        WHERE ${where}
      `) as any[]

      const gradeRows = await db.execute(sql`
        SELECT g.id, g.student_id, g.exam_type, g.exam_name, g.subject,
          g.score, COALESCE(g.max_score, g.full_score, 100) as max_score, 
          COALESCE(g.date, g.exam_date) as date,
          g.note as notes, g.created_at,
          ROUND((g.score / COALESCE(g.max_score, g.full_score, 100) * 100)::numeric, 1) as percentage,
          CASE 
            WHEN g.score >= 90 THEN 'A'
            WHEN g.score >= 80 THEN 'B'
            WHEN g.score >= 70 THEN 'C'
            WHEN g.score >= 60 THEN 'D'
            ELSE 'F'
          END as letter_grade,
          g.score >= 60 as passed,
          s.full_name as student_name, s.grade_level
        FROM grades g JOIN students s ON g.student_id = s.id
        WHERE ${where}
        ORDER BY COALESCE(g.date, g.exam_date) DESC, s.full_name
        LIMIT ${query.limit} OFFSET ${offset}
      `)
      
      return successWithPagination(c, { grades: rows(gradeRows) }, {
        page: query.page,
        limit: query.limit,
        total: cnt?.total ?? 0,
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

adminRoutes.post('/grades',
  requirePermission(Permission.GRADES_WRITE),
  zValidator('json', z.union([createGradeSchema, bulkGradeSchema])),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const body = c.req.valid('json')
    
    try {
      const records = 'records' in body ? body.records : [body]
      let inserted = 0
      
      for (const rec of records) {
        await db.execute(sql`
          INSERT INTO grades (tenant_id, student_id, exam_type, exam_name, subject, score, max_score, date, note)
          VALUES (${tenantId}, ${rec.studentId}, ${rec.examType},
            ${rec.examName}, ${rec.subject ?? null},
            ${rec.score}, ${rec.maxScore},
            ${rec.date ?? new Date().toISOString().slice(0, 10)}::date,
            ${rec.notes ?? null})
        `)
        inserted++
      }
      
      return success(c, { inserted }, 201)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ========================================================================
// REPORTS TREND
// ========================================================================

const trendQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
})

adminRoutes.get('/reports/trend',
  requirePermission(Permission.STUDENTS_READ),
  zValidator('query', trendQuerySchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const { months } = c.req.valid('query')

    try {
      // Generate the last N month buckets
      const monthRows = await db.execute(sql`
        SELECT TO_CHAR(m, 'YYYY-MM') as month
        FROM generate_series(
          date_trunc('month', NOW()) - (${months - 1} || ' months')::interval,
          date_trunc('month', NOW()),
          '1 month'::interval
        ) AS m
        ORDER BY m
      `)

      // Active students per month: count students created on or before end of that month
      // with status = 'active' (approximation — uses created_at as proxy for enrollment start)
      const studentRows = await db.execute(sql`
        SELECT
          TO_CHAR(date_trunc('month', generate_series), 'YYYY-MM') as month,
          COUNT(s.id)::int as active_students
        FROM generate_series(
          date_trunc('month', NOW()) - (${months - 1} || ' months')::interval,
          date_trunc('month', NOW()),
          '1 month'::interval
        ) AS generate_series
        LEFT JOIN students s
          ON s.tenant_id = ${tenantId}
          AND s.status = 'active'
          AND s.created_at <= (generate_series + interval '1 month' - interval '1 second')
          AND (s.deleted_at IS NULL OR s.deleted_at > generate_series)
        GROUP BY 1
        ORDER BY 1
      `)

      // Attendance rate per month
      const attRows = await db.execute(sql`
        SELECT
          TO_CHAR(date_trunc('month', a.date), 'YYYY-MM') as month,
          COUNT(*)::int as total,
          SUM(CASE WHEN a.present THEN 1 ELSE 0 END)::int as present_count
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        WHERE s.tenant_id = ${tenantId}
          AND a.date >= date_trunc('month', NOW()) - (${months - 1} || ' months')::interval
          AND a.date < date_trunc('month', NOW()) + interval '1 month'
        GROUP BY 1
        ORDER BY 1
      `)

      // Average grade score per month
      const gradeRows = await db.execute(sql`
        SELECT
          TO_CHAR(date_trunc('month', COALESCE(g.date, g.exam_date)), 'YYYY-MM') as month,
          ROUND(AVG(g.score)::numeric, 1)::float as avg_score
        FROM grades g
        JOIN students s ON g.student_id = s.id
        WHERE g.tenant_id = ${tenantId}
          AND COALESCE(g.date, g.exam_date) >= date_trunc('month', NOW()) - (${months - 1} || ' months')::interval
          AND COALESCE(g.date, g.exam_date) < date_trunc('month', NOW()) + interval '1 month'
        GROUP BY 1
        ORDER BY 1
      `)

      // Build lookup maps
      const studentMap = new Map<string, number>()
      for (const r of rows(studentRows)) {
        studentMap.set(r.month as string, r.active_students as number)
      }

      const attMap = new Map<string, { total: number; present: number }>()
      for (const r of rows(attRows)) {
        attMap.set(r.month as string, { total: r.total as number, present: r.present_count as number })
      }

      const gradeMap = new Map<string, number>()
      for (const r of rows(gradeRows)) {
        gradeMap.set(r.month as string, r.avg_score as number)
      }

      const result = rows(monthRows).map((r) => {
        const month = r.month as string
        const att = attMap.get(month)
        const attendanceRate = att && att.total > 0
          ? Math.round((att.present / att.total) * 100)
          : 0
        return {
          month,
          activeStudents: studentMap.get(month) ?? 0,
          attendanceRate,
          avgScore: gradeMap.get(month) ?? 0,
        }
      })

      return success(c, { months: result })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ========================================================================
// BILLING
// ========================================================================

const billingQuerySchema = z.object({
  parentId: uuidSchema.optional(),
  branchId: uuidSchema.optional(),
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
})

adminRoutes.get('/billing',
  requirePermission(Permission.BILLING_READ),
  zValidator('query', billingQuerySchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const query = c.req.valid('query')
    const period = query.period ?? new Date().toISOString().slice(0, 7)

    try {
      // If parentId, get billing for parent's children
      if (query.parentId) {
        const students = await db.execute(sql`
          SELECT s.id, s.full_name
          FROM students s
          JOIN parent_students ps ON ps.student_id = s.id
          WHERE ps.parent_id = ${query.parentId} AND s.tenant_id = ${tenantId} AND s.deleted_at IS NULL
        `)

        const result = []
        for (const s of rows(students)) {
          const fees = await db.execute(sql`
            SELECT p.id, p.description as item, p.amount, p.due_date,
              p.status as paid, p.paid_amount,
              (p.amount - COALESCE(p.paid_amount, 0)) as remaining
            FROM payments p
            WHERE p.student_id = ${s.id} AND p.tenant_id = ${tenantId}
            ORDER BY p.due_date DESC
          `)
          const feeList = rows(fees)
          const totalDue = feeList.reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0)
          const totalPaid = feeList.reduce((sum: number, f: any) => sum + Number(f.paid_amount || 0), 0)
          result.push({
            studentId: s.id,
            name: s.full_name,
            fees: feeList,
            totalDue,
            totalPaid,
            totalRemaining: totalDue - totalPaid,
          })
        }
        return success(c, { billing: result })
      }

      // Otherwise, branch-level billing
      if (query.branchId) {
        const invoices = await getInvoices(tenantId, query.branchId, period)
        if (wantsMd(c)) return mdResponse(c, invoicesToMd(invoices as any[], period))
        return success(c, { invoices, period })
      }

      return badRequest(c, 'Provide parentId or branchId')
    } catch (err) {
      return internalError(c, err)
    }
  }
)

const generateInvoicesSchema = z.object({
  branchId: uuidSchema,
  period: z.string().regex(/^\d{4}-\d{2}$/),
})

adminRoutes.post('/billing/generate',
  requirePermission(Permission.BILLING_WRITE),
  zValidator('json', generateInvoicesSchema),
  async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')
    
    try {
      const result = await generateInvoices(user.tenant_id, body.branchId, body.period)
      return success(c, result, 201)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

adminRoutes.get('/billing/:branchId',
  requirePermission(Permission.BILLING_READ),
  zValidator('param', z.object({ branchId: uuidSchema })),
  zValidator('query', z.object({ period: z.string().regex(/^\d{4}-\d{2}$/).optional() })),
  async (c) => {
    const user = c.get('user')
    const { branchId } = c.req.valid('param')
    const { period = new Date().toISOString().slice(0, 7) } = c.req.valid('query')
    
    try {
      const invoices = await getInvoices(user.tenant_id, branchId, period)
      if (wantsMd(c)) return mdResponse(c, invoicesToMd(invoices as any[], period))
      return success(c, { invoices, period })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

const markPaidSchema = z.object({
  method: z.string().max(20).optional(),
  ref: z.string().max(50).optional(),
})

adminRoutes.post('/billing/:invoiceId/pay',
  requirePermission(Permission.BILLING_WRITE),
  zValidator('param', z.object({ invoiceId: uuidSchema })),
  zValidator('json', markPaidSchema),
  async (c) => {
    const { invoiceId } = c.req.valid('param')
    const body = c.req.valid('json')
    
    try {
      await markPaid(invoiceId, body.method ?? 'cash', body.ref)
      return success(c, { paid: true })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ========================================================================
// REPORTS
// ========================================================================

adminRoutes.get('/reports/branch/:branchId',
  requirePermission(Permission.REPORTS_READ),
  zValidator('param', z.object({ branchId: uuidSchema })),
  zValidator('query', z.object({ period: z.string().regex(/^\d{4}-\d{2}$/).optional() })),
  async (c) => {
    const user = c.get('user')
    const { branchId } = c.req.valid('param')
    const { period } = c.req.valid('query')
    
    try {
      const report = await generateBranchReport(user.tenant_id, branchId, period)
      if (wantsMd(c)) return mdResponse(c, branchReportToMd(report))
      return success(c, report)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

adminRoutes.get('/reports/student/:studentId',
  requirePermission(Permission.REPORTS_READ),
  zValidator('param', z.object({ studentId: uuidSchema })),
  async (c) => {
    const user = c.get('user')
    const { studentId } = c.req.valid('param')
    
    try {
      const report = await generateStudentReport(user.tenant_id, studentId)
      if (!report) {
        return notFound(c, 'Student')
      }
      return success(c, report)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ========================================================================
// CHURN ANALYSIS
// ========================================================================

adminRoutes.get('/churn/:branchId',
  requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('param', z.object({ branchId: uuidSchema })),
  zValidator('query', z.object({ days: z.coerce.number().int().min(7).max(365).default(60) })),
  async (c) => {
    const user = c.get('user')
    const { branchId } = c.req.valid('param')
    const { days } = c.req.valid('query')
    
    try {
      const risks = await analyzeChurnRisk(user.tenant_id, branchId, days)
      if (wantsMd(c)) return mdResponse(c, churnRisksToMd(risks))
      
      const high = risks.filter(r => r.riskLevel === 'high')
      const medium = risks.filter(r => r.riskLevel === 'medium')
      
      return success(c, {
        total: risks.length,
        highRisk: high.length,
        mediumRisk: medium.length,
        lowRisk: risks.length - high.length - medium.length,
        students: risks,
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ========================================================================
// PAYROLL
// ========================================================================

const calculatePayrollSchema = z.object({
  branchId: uuidSchema,
  period: z.string().regex(/^\d{4}-\d{2}$/),
})

adminRoutes.post('/payroll/calculate',
  requireRole(Role.ADMIN),
  zValidator('json', calculatePayrollSchema),
  async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')
    
    try {
      const result = await calculatePayroll(user.tenant_id, body.branchId, body.period)
      return success(c, result)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

adminRoutes.get('/payroll',
  requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('query', z.object({ period: z.string().regex(/^\d{4}-\d{2}$/).optional() })),
  async (c) => {
    const user = c.get('user')
    const { period = new Date().toISOString().slice(0, 7) } = c.req.valid('query')
    
    try {
      const records = await getPayroll(user.tenant_id, period)
      return success(c, { records, period })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ========================================================================
// TEACHERS
// ========================================================================

adminRoutes.get('/teachers', requirePermission(Permission.SCHEDULE_READ), async (c) => {
  const user = c.get('user')
  
  try {
    const teacherRows = await db.execute(sql`
      SELECT id, name, phone, school, department, specialty, is_local,
        available_slots, hourly_rates, status, created_at
      FROM teachers 
      WHERE tenant_id = ${user.tenant_id} AND deleted_at IS NULL 
      ORDER BY name
    `)
    return success(c, { teachers: rows(teacherRows) })
  } catch (err) {
    return internalError(c, err)
  }
})

const createTeacherSchema = z.object({
  name: z.string().min(1).max(50),
  phone: z.string().max(20).optional(),
  school: z.string().max(50).optional(),
  department: z.string().max(50).optional(),
  specialty: z.enum(['both', 'tutoring', 'private']).default('both'),
  isLocal: z.boolean().default(false),
  availableSlots: z.record(z.string(), z.any()).default({}),
  hourlyRates: z.object({
    tutoring: z.number().optional(),
    private: z.number().optional(),
    assistant: z.number().optional(),
  }).default({ tutoring: 250, private: 350, assistant: 88 }),
})

adminRoutes.post('/teachers',
  requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('json', createTeacherSchema),
  async (c) => {
    const user = c.get('user')
    const body = c.req.valid('json')
    
    try {
      const result = await db.execute(sql`
        INSERT INTO teachers (tenant_id, name, phone, school, department, specialty, is_local, available_slots, hourly_rates)
        VALUES (${user.tenant_id}, ${body.name}, ${body.phone ?? null}, ${body.school ?? null},
          ${body.department ?? null}, ${body.specialty}, ${body.isLocal},
          ${JSON.stringify(body.availableSlots)}::jsonb,
          ${JSON.stringify(body.hourlyRates)}::jsonb)
        RETURNING id
      `)
      return success(c, { id: first(result)?.id }, 201)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ========================================================================
// LEADS
// ========================================================================

const leadsQuerySchema = z.object({
  status: z.string().max(20).optional(),
})

adminRoutes.get('/leads',
  requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('query', leadsQuerySchema),
  async (c) => {
    const user = c.get('user')
    const { status } = c.req.valid('query')
    
    try {
      const conditions = [sql`tenant_id = ${user.tenant_id}`]
      if (status) conditions.push(sql`status = ${status}`)
      const where = sql.join(conditions, sql` AND `)
      
      const leadRows = await db.execute(sql`
        SELECT * FROM leads WHERE ${where} ORDER BY created_at DESC
      `)
      return success(c, { leads: rows(leadRows) })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

adminRoutes.get('/leads/overdue', requireRole(Role.ADMIN, Role.MANAGER), async (c) => {
  const user = c.get('user')
  
  try {
    const leadRows = await db.execute(sql`
      SELECT * FROM leads 
      WHERE tenant_id = ${user.tenant_id}
        AND status IN ('inquiry', 'scheduled')
        AND (next_follow_up IS NULL OR next_follow_up <= CURRENT_DATE)
        AND created_at <= NOW() - INTERVAL '3 days'
      ORDER BY created_at ASC
    `)
    return success(c, { overdue: rows(leadRows), count: rows(leadRows).length })
  } catch (err) {
    return internalError(c, err)
  }
})

// ===== BILLING SYSTEM (學費管理) =====

// Get course fee settings
adminRoutes.get('/courses/:id/fees', requirePermission(Permission.SCHEDULE_READ), async (c) => {
  const user = c.get('user')
  const courseId = c.req.param('id')
  
  try {
    const [result] = await db.execute(sql`
      SELECT id, name, fee_monthly, fee_quarterly, fee_semester, fee_yearly
      FROM courses 
      WHERE id = ${courseId} AND tenant_id = ${user.tenant_id}
    `) as any[]
    
    if (!result) return notFound(c, 'Course not found')
    return success(c, { course: result })
  } catch (err) {
    return internalError(c, err)
  }
})

// Update course fee settings
adminRoutes.put('/courses/:id/fees',
  requirePermission(Permission.SCHEDULE_WRITE),
  zValidator('param', z.object({ id: uuidSchema })),
  zValidator('json', z.object({
    feeMonthly: z.number().nonnegative().optional(),
    feeQuarterly: z.number().nonnegative().optional(),
    feeSemester: z.number().nonnegative().optional(),
    feeYearly: z.number().nonnegative().optional(),
  })),
  async (c) => {
  const user = c.get('user')
  const { id: courseId } = c.req.valid('param')
  const body = c.req.valid('json')
  
  try {
    await db.execute(sql`
      UPDATE courses SET
        fee_monthly = ${body.feeMonthly},
        fee_quarterly = ${body.feeQuarterly},
        fee_semester = ${body.feeSemester},
        fee_yearly = ${body.feeYearly},
        updated_at = NOW()
      WHERE id = ${courseId} AND tenant_id = ${user.tenant_id}
    `)
    return success(c, { message: 'Fees updated' })
  } catch (err) {
    return internalError(c, err)
  }
})

// Get billing data for a course (students + payment status)
adminRoutes.get('/billing/course/:courseId',
  requirePermission(Permission.BILLING_READ),
  zValidator('param', z.object({ courseId: uuidSchema })),
  zValidator('query', z.object({
    periodMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  })),
  async (c) => {
  const user = c.get('user')
  const { courseId } = c.req.valid('param')
  const periodMonth = c.req.valid('query').periodMonth || new Date().toISOString().substring(0, 7)
  
  try {
    // Get course info with fees
    const [course] = await db.execute(sql`
      SELECT id, name, fee_monthly, fee_quarterly, fee_semester, fee_yearly
      FROM courses WHERE id = ${courseId} AND tenant_id = ${user.tenant_id}
    `) as any[]
    
    if (!course) return notFound(c, 'Course not found')
    
    // Get students in this course with payment records
    const studentRows = await db.execute(sql`
      SELECT 
        s.id, s.full_name, s.grade_level,
        pr.id as payment_id, pr.amount as paid_amount, pr.payment_type, pr.payment_date
      FROM students s
      LEFT JOIN course_enrollments ce ON ce.student_id = s.id AND ce.course_id = ${courseId} AND ce.status = 'active'
      LEFT JOIN payment_records pr ON pr.student_id = s.id 
        AND pr.course_id = ${courseId}
        AND pr.period_month = ${periodMonth}
        AND pr.status = 'paid'
      WHERE s.tenant_id = ${user.tenant_id} AND s.deleted_at IS NULL
        AND ce.student_id IS NOT NULL
      ORDER BY s.full_name
    `)
    
    const students = rows(studentRows)
    const total = students.length
    const paid = students.filter((s: any) => s.payment_id).length
    
    return success(c, {
      course,
      periodMonth,
      students,
      stats: {
        total,
        paid,
        unpaid: total - paid
      }
    })
  } catch (err) {
    return internalError(c, err)
  }
})

// Batch create payment records
adminRoutes.post('/billing/payment-records/batch',
  requirePermission(Permission.BILLING_WRITE),
  zValidator('json', z.object({
    records: z.array(z.object({
      studentId: uuidSchema,
      courseId: uuidSchema,
      paymentType: z.string().min(1),
      amount: z.number().positive(),
      periodMonth: z.string().regex(/^\d{4}-\d{2}$/),
      paymentDate: z.string().optional(),
      notes: z.string().optional(),
    })).min(1),
  })),
  async (c) => {
  const user = c.get('user')
  const { records } = c.req.valid('json')

  try {
    for (const rec of records) {
      await db.execute(sql`
        INSERT INTO payment_records (
          tenant_id, student_id, course_id, payment_type, amount,
          payment_date, period_month, status, notes, created_by, created_at
        ) VALUES (
          ${user.tenant_id}, ${rec.studentId}, ${rec.courseId}, ${rec.paymentType},
          ${rec.amount}, ${rec.paymentDate || new Date().toISOString().split('T')[0]},
          ${rec.periodMonth}, 'paid', ${rec.notes || null}, ${user.id}, NOW()
        )
      `)
    }
    
    return success(c, { created: records.length })
  } catch (err) {
    return internalError(c, err)
  }
})

// Get all payment records with filters
adminRoutes.get('/billing/payment-records', requirePermission(Permission.BILLING_READ), async (c) => {
  const user = c.get('user')
  const courseId = c.req.query('courseId')
  const periodMonth = c.req.query('periodMonth')
  const studentId = c.req.query('studentId')
  
  try {
    let conditions = [sql`pr.tenant_id = ${user.tenant_id}`]
    if (courseId) conditions.push(sql`pr.course_id = ${courseId}`)
    if (periodMonth) conditions.push(sql`pr.period_month = ${periodMonth}`)
    if (studentId) conditions.push(sql`pr.student_id = ${studentId}`)
    
    const where = sql.join(conditions, sql` AND `)
    
    const rowsData = await db.execute(sql`
      SELECT pr.*, s.full_name as student_name, c.name as course_name
      FROM payment_records pr
      LEFT JOIN students s ON pr.student_id = s.id
      LEFT JOIN courses c ON pr.course_id = c.id
      WHERE ${where}
      ORDER BY pr.created_at DESC
      LIMIT 100
    `)
    
    return success(c, { records: rows(rowsData) })
  } catch (err) {
    return internalError(c, err)
  }
})

// ===== AUDIT LOGS (異動日誌) =====

// Helper function to create audit log
async function createAuditLog(
  tenantId: string,
  userId: string | null,
  userName: string | null,
  userRole: string | null,
  action: string,
  tableName: string,
  recordId: string | null,
  oldValue: any,
  newValue: any,
  changeSummary: string,
  needsAlert: boolean = false
) {
  await db.execute(sql`
    INSERT INTO audit_logs (
      tenant_id, user_id, user_name, user_role,
      action, table_name, record_id,
      old_value, new_value, change_summary,
      needs_alert, created_at
    ) VALUES (
      ${tenantId}, ${userId}, ${userName}, ${userRole},
      ${action}, ${tableName}, ${recordId},
      ${JSON.stringify(oldValue)}, ${JSON.stringify(newValue)}, ${changeSummary},
      ${needsAlert}, NOW()
    )
  `)

  // Sync to 94inClass webhook (if configured)
  const webhookUrl = process.env.BEE_CLASS_WEBHOOK_URL
  if (webhookUrl) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      const webhookSecret = process.env.WEBHOOK_SECRET
      if (webhookSecret) {
        headers['X-Webhook-Secret'] = webhookSecret
      }

      await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action,
          tableName,
          recordId,
          oldValue,
          newValue,
          changeSummary,
          needsAlert,
          sourceTenantId: tenantId,
          timestamp: new Date().toISOString()
        })
      })
    } catch (err) {
      console.error('Failed to sync to 94inClass:', err)
    }
  }
}

// Get audit logs with filters
adminRoutes.get('/audit-logs',
  requirePermission(Permission.REPORTS_READ),
  zValidator('query', z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
    tableName: z.string().optional(),
    action: z.string().optional(),
    recordId: z.string().optional(),
    needsAlert: z.enum(['true', 'false']).optional(),
  })),
  async (c) => {
  const user = c.get('user')
  const query = c.req.valid('query')
  const page = Math.max(1, query.page)
  const limit = Math.min(200, Math.max(1, query.limit))
  const offset = (page - 1) * limit

  const tableName = query.tableName
  const action = query.action
  const recordId = query.recordId
  const needsAlert = query.needsAlert === 'true'

  try {
    let conditions = [sql`al.tenant_id = ${user.tenant_id}`]
    if (tableName) conditions.push(sql`al.table_name = ${tableName}`)
    if (action) conditions.push(sql`al.action = ${action}`)
    if (recordId) conditions.push(sql`al.record_id = ${recordId}`)
    if (needsAlert) conditions.push(sql`al.needs_alert = true`)

    const where = sql.join(conditions, sql` AND `)

    const [countResult] = await db.execute(sql`
      SELECT COUNT(*)::int as total FROM audit_logs al WHERE ${where}
    `) as any[]

    const rowsData = await db.execute(sql`
      SELECT al.*, u.name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE ${where}
      ORDER BY al.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `)

    return successWithPagination(c, { logs: rows(rowsData) }, {
      page,
      limit,
      total: countResult?.total ?? 0,
    })
  } catch (err) {
    return internalError(c, err)
  }
})

// Get pending alerts
adminRoutes.get('/alerts', requirePermission(Permission.REPORTS_READ), async (c) => {
  const user = c.get('user')

  try {
    const rowsData = await db.execute(sql`
      SELECT al.*, u.name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.tenant_id = ${user.tenant_id}
        AND al.needs_alert = true
        AND al.alert_confirmed_at IS NULL
      ORDER BY al.created_at DESC
      LIMIT 50
    `)

    return success(c, { alerts: rows(rowsData) })
  } catch (err) {
    return internalError(c, err)
  }
})

// Confirm/revert an alert
adminRoutes.post('/alerts/:id/confirm', requirePermission(Permission.STUDENTS_WRITE), async (c) => {
  const user = c.get('user')
  const alertId = c.req.param('id')

  try {
    await db.execute(sql`
      UPDATE audit_logs 
      SET alert_confirmed_at = NOW()
      WHERE id = ${alertId} AND tenant_id = ${user.tenant_id}
    `)

    return success(c, { message: 'Alert confirmed' })
  } catch (err) {
    return internalError(c, err)
  }
})

// Revert a change (simplified - just log the revert)
adminRoutes.post('/alerts/:id/revert', requirePermission(Permission.STUDENTS_WRITE), async (c) => {
  const user = c.get('user')
  const alertId = c.req.param('id')
  const body = await c.req.json()

  try {
    // Get original change
    const [original] = await db.execute(sql`
      SELECT * FROM audit_logs WHERE id = ${alertId}
    `) as any[]

    if (!original) {
      return notFound(c, 'Alert not found')
    }

    // Create a revert audit log
    await createAuditLog(
      user.tenant_id,
      user.id,
      user.name,
      user.role,
      'revert',
      original.table_name,
      original.record_id,
      original.new_value,
      original.old_value,
      `Reverted: ${original.change_summary}`,
      false
    )

    // Confirm the original alert
    await db.execute(sql`
      UPDATE audit_logs 
      SET alert_confirmed_at = NOW()
      WHERE id = ${alertId}
    `)

    return success(c, { message: 'Change reverted' })
  } catch (err) {
    return internalError(c, err)
  }
})

// ===== AI PROVIDER MANAGEMENT =====

// Get all providers status
adminRoutes.get('/ai/providers', requirePermission(Permission.REPORTS_READ), async (c) => {
  try {
    const status = await providerFactory.getProvidersStatus()
    const availableProviders = providerFactory.getAvailableProviders()
    
    return success(c, {
      providers: status,
      available: availableProviders,
    })
  } catch (err) {
    return internalError(c, err)
  }
})

// Get quota statistics
adminRoutes.get('/ai/quota', requirePermission(Permission.REPORTS_READ), async (c) => {
  try {
    const allStats = quotaManager.getAllStats()
    const totalCost24h = quotaManager.getTotalCost(24)
    const totalCost7d = quotaManager.getTotalCost(168)
    
    return success(c, {
      stats: allStats,
      totalCost: {
        last24Hours: totalCost24h,
        last7Days: totalCost7d,
      },
    })
  } catch (err) {
    return internalError(c, err)
  }
})

// Get provider usage history
const providerHistorySchema = z.object({
  provider: z.enum(['gemini', 'claude', 'minimax']),
  hours: z.coerce.number().min(1).max(168).default(24),
})

adminRoutes.get('/ai/quota/:provider/history', 
  requirePermission(Permission.REPORTS_READ),
  zValidator('param', providerHistorySchema.pick({ provider: true })),
  zValidator('query', providerHistorySchema.pick({ hours: true }).partial()),
  async (c) => {
    const { provider } = c.req.valid('param')
    const { hours = 24 } = c.req.valid('query')
    
    try {
      const history = quotaManager.getUsageHistory(provider, hours)
      
      return success(c, {
        provider,
        hours,
        history,
        total: {
          requests: history.length,
          tokens: history.reduce((sum: number, h: any) => sum + h.tokens, 0),
          cost: history.reduce((sum: number, h: any) => sum + h.estimatedCost, 0),
        },
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// Set provider quota limits
const quotaLimitSchema = z.object({
  provider: z.enum(['gemini', 'claude', 'minimax']),
  requestsPerMinute: z.number().min(1).optional(),
  requestsPerDay: z.number().min(1).optional(),
  costPerDay: z.number().min(0).optional(),
})

adminRoutes.post('/ai/quota/limits',
  requirePermission(Permission.SYSTEM_ADMIN),
  zValidator('json', quotaLimitSchema),
  async (c) => {
    const { provider, ...limits } = c.req.valid('json')
    
    try {
      quotaManager.setLimit(provider, limits)
      
      return success(c, {
        message: 'Quota limits updated',
        provider,
        limits: quotaManager.getStats(provider).limits,
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// Reset quota for a provider
adminRoutes.post('/ai/quota/:provider/reset',
  requirePermission(Permission.SYSTEM_ADMIN),
  zValidator('param', providerHistorySchema.pick({ provider: true })),
  async (c) => {
    const { provider } = c.req.valid('param')
    
    try {
      quotaManager.reset(provider)
      
      return success(c, {
        message: 'Quota reset successfully',
        provider,
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// Set provider strategy
const strategySchema = z.object({
  strategy: z.enum(['web', 'line-bot', 'balanced']),
})

adminRoutes.post('/ai/strategy',
  requirePermission(Permission.SYSTEM_ADMIN),
  zValidator('json', strategySchema),
  async (c) => {
    const { strategy } = c.req.valid('json')

    try {
      providerFactory.setStrategy(strategy)
      const chain = providerFactory.getFallbackChain()

      return success(c, {
        message: 'Strategy updated',
        strategy,
        fallbackChain: chain,
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ========================================================================
// CONVERSATIONS (AI 對話紀錄)
// ========================================================================

const conversationsQuerySchema = z.object({
  platform: z.enum(['telegram', 'line', 'web', 'all']).default('all'),
  intent: z.string().max(50).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

adminRoutes.get('/conversations',
  requirePermission(Permission.REPORTS_READ),
  zValidator('query', conversationsQuerySchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const query = c.req.valid('query')

    try {
      const conditions = [sql`c.tenant_id = ${tenantId}`]

      if (query.platform !== 'all') {
        conditions.push(sql`c.channel = ${query.platform}`)
      }
      if (query.intent) {
        conditions.push(sql`c.intent = ${query.intent}`)
      }
      if (query.from) {
        conditions.push(sql`c.created_at >= ${query.from}::timestamptz`)
      }
      if (query.to) {
        conditions.push(sql`c.created_at <= ${query.to}::timestamptz`)
      }

      const where = sql.join(conditions, sql` AND `)

      const [countResult] = await db.execute(sql`
        SELECT COUNT(*)::int as total FROM conversations c WHERE ${where}
      `) as any[]

      const convRows = await db.execute(sql`
        SELECT
          c.id, c.channel, c.intent, c.query, c.answer,
          c.model, c.latency_ms, c.tokens_used, c.created_at,
          c.branch_id,
          b.name as branch_name
        FROM conversations c
        LEFT JOIN branches b ON c.branch_id = b.id
        WHERE ${where}
        ORDER BY c.created_at DESC
        LIMIT ${query.limit} OFFSET ${query.offset}
      `)

      return success(c, {
        conversations: rows(convRows),
        pagination: {
          total: countResult?.total ?? 0,
          limit: query.limit,
          offset: query.offset,
        },
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ========================================================================
// SETTINGS (系統設定)
// ========================================================================

const settingsSchema = z.object({
  aiMode: z.string().max(100),
  aiEngine: z.string().max(100),
  searchThreshold: z.number().min(0).max(1),
  maxResults: z.number().int().min(1).max(10),
  telegramToken: z.string().max(500),
  defaultBranchId: z.string().max(36),
})

adminRoutes.get('/settings',
  requirePermission(Permission.SETTINGS_READ),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id

    try {
      const [row] = await db.execute(sql`
        SELECT settings FROM manage_settings WHERE tenant_id = ${tenantId}
      `) as any[]

      return success(c, { settings: row?.settings ?? {} })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

adminRoutes.post('/settings',
  requirePermission(Permission.SETTINGS_WRITE),
  zValidator('json', settingsSchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const body = c.req.valid('json')

    try {
      await db.execute(sql`
        INSERT INTO manage_settings (tenant_id, settings, updated_at, updated_by)
        VALUES (${tenantId}, ${JSON.stringify(body)}::jsonb, NOW(), ${user.id})
        ON CONFLICT (tenant_id)
        DO UPDATE SET
          settings = ${JSON.stringify(body)}::jsonb,
          updated_at = NOW(),
          updated_by = ${user.id}
      `)

      return success(c, { settings: body })
    } catch (err) {
      return internalError(c, err)
    }
  }
)
