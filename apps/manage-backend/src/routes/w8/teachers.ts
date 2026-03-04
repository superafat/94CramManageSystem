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

export const teacherRoutes = new Hono<{ Variables: RBACVariables }>()

// Query params schema for teachers list
const teacherQuerySchema = z.object({
  tenant_id: uuidSchema.optional(),
  branch_id: uuidSchema.optional(),
  status: z.enum(['active', 'inactive', 'resigned']).optional(),
})

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
    if (query.branch_id) conditions.push(sql`t.branch_id = ${query.branch_id}`)
    if (query.status) conditions.push(sql`t.status = ${query.status}`)

    const where = sql.join(conditions, sql` AND `)

    const result = await db.execute(sql`
      SELECT t.*, u.username, u.email
      FROM teachers t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE ${where}
      ORDER BY t.name
    `)

    return success(c, { teachers: rows(result) })
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
    const result = await db.execute(sql`
      SELECT t.*, u.username, u.email
      FROM teachers t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = ${id} AND t.tenant_id = ${user.tenant_id}
    `)

    const teacher = first(result)
    if (!teacher) {
      return notFound(c, 'Teacher')
    }

    return success(c, { teacher })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching teacher:')
    return internalError(c, error)
  }
})

teacherRoutes.post('/teachers', requireRole(Role.ADMIN, Role.MANAGER), zValidator('json', createTeacherSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const user = c.get('user')

    const result = await db.execute(sql`
      INSERT INTO teachers (
        user_id, tenant_id, branch_id, name, title, phone, email, rate_per_class,
        teacher_role, salary_type, base_salary,
        id_number, birthday, address, emergency_contact, emergency_phone,
        bank_name, bank_branch, bank_account, bank_account_name,
        subjects, grade_levels
      )
      VALUES (
        ${body.userId || null}, ${user?.tenant_id ?? body.tenantId}, ${body.branchId},
        ${sanitizeString(body.name)}, ${sanitizeString(body.title)}, ${body.phone || null}, ${body.email || null}, ${body.ratePerClass ?? null},
        ${body.teacherRole || null}, ${body.salaryType || 'per_class'}, ${body.baseSalary ?? null},
        ${body.idNumber || null}, ${body.birthday ? sql`${body.birthday}::date` : null},
        ${body.address ? sanitizeString(body.address) : null},
        ${body.emergencyContact ? sanitizeString(body.emergencyContact) : null}, ${body.emergencyPhone || null},
        ${body.bankName ? sanitizeString(body.bankName) : null}, ${body.bankBranch ? sanitizeString(body.bankBranch) : null},
        ${body.bankAccount || null}, ${body.bankAccountName ? sanitizeString(body.bankAccountName) : null},
        ${body.subjects ? sql`${body.subjects}::text[]` : null},
        ${body.gradeLevels ? sql`${body.gradeLevels}::text[]` : null}
      )
      RETURNING *
    `)

    return success(c, { teacher: first(result) }, 201)
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

      const result = await db.execute(sql`
        UPDATE teachers
        SET name = COALESCE(${body.name != null ? sanitizeString(body.name) : null}, name),
            title = COALESCE(${body.title != null ? sanitizeString(body.title) : null}, title),
            phone = COALESCE(${body.phone ?? null}, phone),
            email = COALESCE(${body.email ?? null}, email),
            rate_per_class = COALESCE(${body.ratePerClass ?? null}, rate_per_class),
            status = COALESCE(${body.status ?? null}, status),
            teacher_role = COALESCE(${body.teacherRole ?? null}, teacher_role),
            salary_type = COALESCE(${body.salaryType ?? null}, salary_type),
            base_salary = COALESCE(${body.baseSalary ?? null}, base_salary),
            id_number = COALESCE(${body.idNumber ?? null}, id_number),
            birthday = COALESCE(${body.birthday != null ? sql`${body.birthday}::date` : null}, birthday),
            address = COALESCE(${body.address != null ? sanitizeString(body.address) : null}, address),
            emergency_contact = COALESCE(${body.emergencyContact != null ? sanitizeString(body.emergencyContact) : null}, emergency_contact),
            emergency_phone = COALESCE(${body.emergencyPhone ?? null}, emergency_phone),
            bank_name = COALESCE(${body.bankName != null ? sanitizeString(body.bankName) : null}, bank_name),
            bank_branch = COALESCE(${body.bankBranch != null ? sanitizeString(body.bankBranch) : null}, bank_branch),
            bank_account = COALESCE(${body.bankAccount ?? null}, bank_account),
            bank_account_name = COALESCE(${body.bankAccountName != null ? sanitizeString(body.bankAccountName) : null}, bank_account_name),
            subjects = COALESCE(${body.subjects ? sql`${body.subjects}::text[]` : null}, subjects),
            grade_levels = COALESCE(${body.gradeLevels ? sql`${body.gradeLevels}::text[]` : null}, grade_levels),
            updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${user.tenant_id}
        RETURNING *
      `)

      const teacher = first(result)
      if (!teacher) {
        return notFound(c, 'Teacher')
      }

      return success(c, { teacher })
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
    const result = await db.execute(sql`
      UPDATE teachers SET deleted_at = NOW(), status = 'resigned'
      WHERE id = ${id} AND tenant_id = ${user.tenant_id} AND deleted_at IS NULL
      RETURNING *
    `)

    const teacher = first(result)
    if (!teacher) {
      return notFound(c, 'Teacher')
    }

    return success(c, { message: 'Teacher deleted', teacher })
  } catch (error) {
    logger.error({ err: error }, 'Error deleting teacher:')
    return internalError(c, error)
  }
})
