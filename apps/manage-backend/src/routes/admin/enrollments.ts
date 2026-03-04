import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { RBACVariables } from '../../middleware/rbac'
import { requirePermission, Permission } from '../../middleware/rbac'
import { db, sql, logger, success, badRequest, internalError } from './_helpers'

export const enrollmentRoutes = new Hono<{ Variables: RBACVariables }>()

// ── Zod schemas ──

const batchEnrollSchema = z.object({
  courseId: z.string().uuid(),
  studentIds: z.array(z.string().uuid()).min(1).max(100),
})

// POST /enrollments/batch — 批量報名
enrollmentRoutes.post(
  '/enrollments/batch',
  requirePermission(Permission.ATTENDANCE_WRITE),
  zValidator('json', batchEnrollSchema),
  async (c) => {
    try {
      const { courseId, studentIds } = c.req.valid('json')
      const user = c.get('user')
      if (!user?.tenant_id) {
        return badRequest(c, 'Missing tenant context')
      }
      const tenantId = user.tenant_id as string

      const values = studentIds.map(
        (sid) =>
          sql`(${tenantId}, ${sid}, ${courseId}, 'active', NOW())`
      )
      const valuesList = sql.join(values, sql`, `)

      const result = await db.execute(sql`
        INSERT INTO manage_enrollments (tenant_id, student_id, course_id, status, start_date)
        VALUES ${valuesList}
        ON CONFLICT (tenant_id, student_id, course_id) WHERE deleted_at IS NULL DO NOTHING
      `)

      // rowCount may be on result directly or on result.rowCount
      const enrolled =
        typeof (result as unknown as { rowCount?: number }).rowCount === 'number'
          ? (result as unknown as { rowCount: number }).rowCount
          : Array.isArray(result)
            ? result.length
            : 0

      return success(c, { enrolled })
    } catch (error) {
      logger.error({ err: error }, 'Error batch enrolling students')
      // If ON CONFLICT syntax isn't supported due to missing unique constraint, fall back gracefully
      if (error instanceof Error && error.message.includes('there is no unique or exclusion constraint')) {
        // Fallback: insert one by one, ignoring duplicates
        try {
          const { courseId, studentIds } = c.req.valid('json')
          const user = c.get('user')
          const tenantId = user.tenant_id as string
          let enrolled = 0
          for (const sid of studentIds) {
            try {
              await db.execute(sql`
                INSERT INTO manage_enrollments (tenant_id, student_id, course_id, status, start_date)
                VALUES (${tenantId}, ${sid}, ${courseId}, 'active', NOW())
              `)
              enrolled++
            } catch {
              // duplicate or FK error — skip
            }
          }
          return success(c, { enrolled })
        } catch (fallbackError) {
          logger.error({ err: fallbackError }, 'Error in batch enroll fallback')
          return internalError(c, fallbackError)
        }
      }
      return internalError(c, error)
    }
  }
)

// DELETE /enrollments/batch — 批量取消報名
enrollmentRoutes.delete(
  '/enrollments/batch',
  requirePermission(Permission.ATTENDANCE_WRITE),
  zValidator('json', batchEnrollSchema),
  async (c) => {
    try {
      const { courseId, studentIds } = c.req.valid('json')
      const user = c.get('user')
      if (!user?.tenant_id) {
        return badRequest(c, 'Missing tenant context')
      }
      const tenantId = user.tenant_id as string

      const result = await db.execute(sql`
        UPDATE manage_enrollments
        SET status = 'cancelled', deleted_at = NOW()
        WHERE course_id = ${courseId}
          AND student_id = ANY(ARRAY[${sql.join(studentIds.map((id) => sql`${id}`), sql`, `)}]::uuid[])
          AND tenant_id = ${tenantId}
          AND deleted_at IS NULL
      `)

      const removed =
        typeof (result as unknown as { rowCount?: number }).rowCount === 'number'
          ? (result as unknown as { rowCount: number }).rowCount
          : 0

      return success(c, { removed })
    } catch (error) {
      logger.error({ err: error }, 'Error batch removing enrollments')
      return internalError(c, error)
    }
  }
)
