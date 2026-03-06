import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requirePermission, requireRole, Permission, Role, type RBACVariables } from '../../middleware/rbac'
import {
  createTeacherSchema,
  updateTeacherSchema,
  uuidSchema,
  sanitizeString,
} from '../../utils/validation'
import { db, sql, logger, success, notFound, badRequest, internalError, conflict, rows, first } from './_helpers'
import { createDefaultInsuranceConfig, normalizeTeacherInsuranceConfig } from './insurance-plan'
import { isFileSafe } from '../../lib/security'
import { deleteTeacherAvatar, uploadTeacherAvatar } from '../../services/gcs'

export const teacherRoutes = new Hono<{ Variables: RBACVariables }>()

const TEACHER_SELECT = sql`
  SELECT
    t.id,
    t.tenant_id,
    NULL::uuid AS branch_id,
    t.user_id,
    t.name,
    '教師'::varchar AS title,
    t.avatar_url,
    t.phone,
    COALESCE(t.email, u.email) AS email,
    NULL::numeric AS rate_per_class,
    'active'::varchar AS status,
    NULL::varchar AS teacher_role,
    'hourly'::varchar AS salary_type,
    NULL::numeric AS base_salary,
    t.hourly_rate,
    NULL::jsonb AS insurance_config,
    NULL::varchar AS id_number,
    NULL::date AS birthday,
    NULL::text AS address,
    NULL::varchar AS emergency_contact,
    NULL::varchar AS emergency_phone,
    NULL::varchar AS bank_name,
    NULL::varchar AS bank_branch,
    NULL::varchar AS bank_account,
    NULL::varchar AS bank_account_name,
    regexp_split_to_array(t.expertise, '、')::text[] AS subjects,
    NULL::text[] AS grade_levels,
    t.expertise,
    t.created_at,
    NULL::timestamp AS deleted_at,
    u.username
  FROM manage_teachers t
  LEFT JOIN users u ON t.user_id = u.id
`

function parsePgTextArray(value: unknown): string[] | null {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value !== 'string') return null
  if (!value.startsWith('{') || !value.endsWith('}')) return null

  const inner = value.slice(1, -1)
  if (!inner) return []

  return inner.split(',').map((item) => item.replace(/^"|"$/g, ''))
}

function normalizeTeacherRow<T extends Record<string, unknown> | null | undefined>(teacher: T): T {
  if (!teacher) return teacher

  const normalized = { ...teacher } as Record<string, unknown>
  const subjects = parsePgTextArray(normalized.subjects)
  if (subjects) normalized.subjects = subjects

  const gradeLevels = parsePgTextArray(normalized.grade_levels)
  if (gradeLevels) normalized.grade_levels = gradeLevels

  return normalized as T
}

const resolveCompensation = (
  salaryType: string,
  ratePerClass: number | null | undefined,
  hourlyRate: number | null | undefined,
  baseSalary: number | null | undefined
) => {
  if (salaryType === 'hourly') {
    return {
      ratePerClass: null,
      hourlyRate: hourlyRate ?? ratePerClass ?? null,
      baseSalary: null,
    }
  }

  if (salaryType === 'monthly') {
    return {
      ratePerClass: null,
      hourlyRate: null,
      baseSalary: baseSalary ?? null,
    }
  }

  return {
    ratePerClass: ratePerClass ?? null,
    hourlyRate: null,
    baseSalary: null,
  }
}

// Query params schema for teachers list
const teacherQuerySchema = z.object({
  tenant_id: uuidSchema.optional(),
  branch_id: uuidSchema.optional(),
  status: z.enum(['active', 'inactive', 'resigned']).optional(),
})

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const ALLOWED_AVATAR_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const
const MAX_AVATAR_SIZE = 3 * 1024 * 1024

const updateTeacherAvatarSchema = z.object({
  avatarUrl: z.string().url().max(500),
})

teacherRoutes.post('/teachers/upload-avatar', requireRole(Role.ADMIN, Role.MANAGER), async (c) => {
  try {
    const user = c.get('user')
    if (!user?.tenant_id) {
      return badRequest(c, 'Missing tenant context')
    }

    const body = await c.req.parseBody()
    const file = body.file
    if (!(file instanceof File)) return badRequest(c, 'file is required')

    if (!(ALLOWED_AVATAR_TYPES as readonly string[]).includes(file.type)) {
      return badRequest(c, `Invalid file type. Allowed: ${ALLOWED_AVATAR_TYPES.join(', ')}`)
    }

    if (!isFileSafe(file.name, [...ALLOWED_AVATAR_EXTENSIONS])) {
      return badRequest(c, 'Invalid file name')
    }

    if (file.size > MAX_AVATAR_SIZE) {
      return badRequest(c, 'File size exceeds 3MB limit')
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const url = await uploadTeacherAvatar(buffer, file.name, file.type)

    return success(c, { url }, 201)
  } catch (error) {
    logger.error({ err: error }, 'Error uploading teacher avatar:')
    return internalError(c, error)
  }
})

teacherRoutes.patch('/teachers/:id/avatar', requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('param', z.object({ id: uuidSchema })),
  zValidator('json', updateTeacherAvatarSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param')
      const body = c.req.valid('json')
      const user = c.get('user')
      if (!user?.tenant_id) {
        return badRequest(c, 'Missing tenant context')
      }

      const existingResult = await db.execute(sql`
        SELECT avatar_url
        FROM manage_teachers
        WHERE id = ${id} AND tenant_id = ${user.tenant_id}
        LIMIT 1
      `)
      const existingTeacher = first(existingResult)
      if (!existingTeacher) {
        return notFound(c, 'Teacher')
      }

      const previousAvatarUrl = typeof existingTeacher.avatar_url === 'string' ? existingTeacher.avatar_url : null

      const result = await db.execute(sql`
        UPDATE manage_teachers
        SET avatar_url = ${body.avatarUrl}
        WHERE id = ${id} AND tenant_id = ${user.tenant_id}
        RETURNING *
      `)

      const teacher = first(result)

      if (previousAvatarUrl && previousAvatarUrl !== body.avatarUrl) {
        deleteTeacherAvatar(previousAvatarUrl).catch((error) => {
          logger.warn({ err: error, teacherId: id }, 'Failed to delete previous teacher avatar')
        })
      }

      return success(c, { teacher })
    } catch (error) {
      logger.error({ err: error }, 'Error updating teacher avatar:')
      return internalError(c, error)
    }
  }
)

teacherRoutes.get('/teachers', requirePermission(Permission.SCHEDULE_READ), zValidator('query', teacherQuerySchema), async (c) => {
  try {
    const query = c.req.valid('query')
    const user = c.get('user')
    if (!user?.tenant_id && !query.tenant_id) {
      return badRequest(c, 'Missing tenant context')
    }
    const conditions = [sql`1=1`]
    // 優先使用 user 的 tenant_id，避免 query 覆寫造成跨租戶讀取
    conditions.push(sql`t.tenant_id = ${user?.tenant_id ?? query.tenant_id}`)
    if (query.status === 'inactive' || query.status === 'resigned') {
      conditions.push(sql`1 = 0`)
    }

    const where = sql.join(conditions, sql` AND `)

    const result = await db.execute(sql`${TEACHER_SELECT} WHERE ${where} ORDER BY t.name`)

    return success(c, { teachers: rows(result).map((teacher) => normalizeTeacherRow(teacher)) })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching teachers:')
    return internalError(c, error)
  }
})

teacherRoutes.get('/teachers/:id', requirePermission(Permission.SCHEDULE_READ), zValidator('param', z.object({ id: uuidSchema })), async (c) => {
  try {
    const { id } = c.req.valid('param')
    const user = c.get('user')
    if (!user?.tenant_id) {
      return badRequest(c, 'Missing tenant context')
    }
    const result = await db.execute(sql`${TEACHER_SELECT} WHERE t.id = ${id} AND t.tenant_id = ${user.tenant_id}`)

    const teacher = first(result)
    if (!teacher) {
      return notFound(c, 'Teacher')
    }

    return success(c, { teacher: normalizeTeacherRow(teacher) })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching teacher:')
    return internalError(c, error)
  }
})

teacherRoutes.post('/teachers', requireRole(Role.ADMIN, Role.MANAGER), zValidator('json', createTeacherSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const user = c.get('user')
    const salaryType = body.salaryType || 'per_class'
    const compensation = resolveCompensation(salaryType, body.ratePerClass, body.hourlyRate, body.baseSalary)
    normalizeTeacherInsuranceConfig(body.insuranceConfig, salaryType)
    const storedHourlyRate = compensation.hourlyRate ?? compensation.ratePerClass ?? compensation.baseSalary ?? null
    const derivedExpertise = body.subjects && body.subjects.length > 0 ? body.subjects.join('、') : null

    const insertResult = await db.execute(sql`
      INSERT INTO manage_teachers (
        user_id, tenant_id, name, phone, email, expertise,
        hourly_rate, avatar_url
      )
      VALUES (
        ${body.userId || null}, ${user?.tenant_id ?? body.tenantId},
        ${sanitizeString(body.name)}, ${body.phone || null}, ${body.email || null}, ${derivedExpertise},
        ${storedHourlyRate}, ${body.avatarUrl || null}
      )
      RETURNING id
    `)

    const insertedTeacher = first(insertResult)
    const result = await db.execute(sql`${TEACHER_SELECT} WHERE t.id = ${insertedTeacher?.id} AND t.tenant_id = ${user?.tenant_id ?? body.tenantId}`)

    return success(c, { teacher: normalizeTeacherRow(first(result)) }, 201)
  } catch (error) {
    logger.error({ err: error }, 'Error creating teacher:')
    if (error instanceof Error && (error as Error & { code?: string }).code === '23505') {
      return conflict(c, 'Teacher already exists')
    }
    return internalError(c, error)
  }
})

teacherRoutes.put('/teachers/:id', requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('param', z.object({ id: uuidSchema })),
  zValidator('json', updateTeacherSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param')
      const body = c.req.valid('json')
      const user = c.get('user')
      if (!user?.tenant_id) {
        return badRequest(c, 'Missing tenant context')
      }

      const existingResult = await db.execute(sql`
        SELECT hourly_rate, avatar_url
        FROM manage_teachers
        WHERE id = ${id} AND tenant_id = ${user.tenant_id}
        LIMIT 1
      `)
      const existingTeacher = first(existingResult)
      if (!existingTeacher) {
        return notFound(c, 'Teacher')
      }

      const compensation = resolveCompensation(
        body.salaryType ?? 'hourly',
        body.ratePerClass ?? null,
        body.hourlyRate ?? (existingTeacher.hourly_rate == null ? null : Number(existingTeacher.hourly_rate)),
        body.baseSalary ?? null
      )
      normalizeTeacherInsuranceConfig(body.insuranceConfig ?? createDefaultInsuranceConfig('hourly'), body.salaryType ?? 'hourly')
      const storedHourlyRate = compensation.hourlyRate ?? compensation.ratePerClass ?? null
      const previousAvatarUrl = typeof existingTeacher.avatar_url === 'string' ? existingTeacher.avatar_url : null
      const nextAvatarUrl = body.avatarUrl === undefined ? previousAvatarUrl : body.avatarUrl
      const derivedExpertise = body.subjects === undefined
        ? undefined
        : body.subjects && body.subjects.length > 0
          ? body.subjects.join('、')
          : null

      const updateResult = await db.execute(sql`
        UPDATE manage_teachers
        SET name = COALESCE(${body.name != null ? sanitizeString(body.name) : null}, name),
            phone = COALESCE(${body.phone ?? null}, phone),
            email = COALESCE(${body.email ?? null}, email),
            expertise = COALESCE(${derivedExpertise ?? null}, expertise),
            avatar_url = COALESCE(${body.avatarUrl ?? null}, avatar_url),
            hourly_rate = COALESCE(${storedHourlyRate}, hourly_rate)
        WHERE id = ${id} AND tenant_id = ${user.tenant_id}
        RETURNING id
      `)

      const updatedTeacher = first(updateResult)
      const result = await db.execute(sql`${TEACHER_SELECT} WHERE t.id = ${updatedTeacher?.id} AND t.tenant_id = ${user.tenant_id}`)
      const teacher = first(result)

      if (previousAvatarUrl && previousAvatarUrl !== nextAvatarUrl) {
        deleteTeacherAvatar(previousAvatarUrl).catch((error) => {
          logger.warn({ err: error, teacherId: id }, 'Failed to delete previous teacher avatar')
        })
      }

      return success(c, { teacher: normalizeTeacherRow(teacher) })
    } catch (error) {
      logger.error({ err: error }, 'Error updating teacher:')
      return internalError(c, error)
    }
  }
)

teacherRoutes.delete('/teachers/:id', requireRole(Role.ADMIN), zValidator('param', z.object({ id: uuidSchema })), async (c) => {
  try {
    const { id } = c.req.valid('param')
    const user = c.get('user')
    if (!user?.tenant_id) {
      return badRequest(c, 'Missing tenant context')
    }

    // Soft delete
    const deletedResult = await db.execute(sql`
      DELETE FROM manage_teachers
      WHERE id = ${id} AND tenant_id = ${user.tenant_id}
      RETURNING id, avatar_url
    `)

    const teacher = first(deletedResult)
    if (!teacher) {
      return notFound(c, 'Teacher')
    }

    if (typeof teacher.avatar_url === 'string' && teacher.avatar_url) {
      deleteTeacherAvatar(teacher.avatar_url).catch((error) => {
        logger.warn({ err: error, teacherId: id }, 'Failed to delete teacher avatar during teacher removal')
      })
    }

    return success(c, { message: 'Teacher deleted', teacher })
  } catch (error) {
    logger.error({ err: error }, 'Error deleting teacher:')
    return internalError(c, error)
  }
})
