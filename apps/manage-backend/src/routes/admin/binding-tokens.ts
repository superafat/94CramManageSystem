import { randomBytes } from 'node:crypto'
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { RBACVariables } from '../../middleware/rbac'
import { requirePermission, Permission } from '../../middleware/rbac'
import { db, sql, success, internalError, first } from './_helpers'

const bindingTokensRoutes = new Hono<{ Variables: RBACVariables }>()

// ── Zod schemas ──

const createTokenSchema = z.object({
  expiresIn: z.enum(['7d', '30d', 'forever']),
})

// ── POST /students/:id/binding-token ──

bindingTokensRoutes.post('/students/:id/binding-token',
  requirePermission(Permission.STUDENTS_WRITE),
  zValidator('json', createTokenSchema),
  async (c) => {
    const tenantId = c.get('user').tenant_id
    const studentId = c.req.param('id')
    const { expiresIn } = c.req.valid('json')

    try {
      // Invalidate any existing unused tokens for this student
      await db.execute(sql`
        UPDATE manage_binding_tokens
        SET used_at = NOW(), used_by_line_id = 'superseded'
        WHERE student_id = ${studentId}
          AND tenant_id = ${tenantId}
          AND used_at IS NULL
      `)

      // Generate token
      const token = randomBytes(32).toString('hex')

      // Calculate expires_at
      const expiresAtExpr =
        expiresIn === '7d' ? sql`NOW() + INTERVAL '7 days'` :
        expiresIn === '30d' ? sql`NOW() + INTERVAL '30 days'` :
        sql`NULL`

      const result = await db.execute(sql`
        INSERT INTO manage_binding_tokens (tenant_id, student_id, token, expires_at)
        VALUES (${tenantId}, ${studentId}, ${token}, ${expiresAtExpr})
        RETURNING token, expires_at, created_at
      `)

      const row = first(result)
      const expiresAt = row?.expires_at ?? null
      const qrUrl = `https://94cram.com/bind/${token}`

      return success(c, { token, expiresAt, qrUrl }, 201)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ── GET /students/:id/binding-token ──

bindingTokensRoutes.get('/students/:id/binding-token',
  requirePermission(Permission.STUDENTS_READ),
  async (c) => {
    const tenantId = c.get('user').tenant_id
    const studentId = c.req.param('id')

    try {
      const result = await db.execute(sql`
        SELECT token, expires_at, created_at
        FROM manage_binding_tokens
        WHERE student_id = ${studentId}
          AND tenant_id = ${tenantId}
          AND used_at IS NULL
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC
        LIMIT 1
      `)

      const row = first(result)

      if (!row) {
        return success(c, null)
      }

      return success(c, {
        token: row.token,
        expiresAt: row.expires_at ?? null,
        createdAt: row.created_at,
        qrUrl: `https://94cram.com/bind/${row.token}`,
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ── DELETE /students/:id/binding-token ──

bindingTokensRoutes.delete('/students/:id/binding-token',
  requirePermission(Permission.STUDENTS_WRITE),
  async (c) => {
    const tenantId = c.get('user').tenant_id
    const studentId = c.req.param('id')

    try {
      await db.execute(sql`
        UPDATE manage_binding_tokens
        SET used_at = NOW(), used_by_line_id = 'revoked'
        WHERE student_id = ${studentId}
          AND tenant_id = ${tenantId}
          AND used_at IS NULL
      `)

      return success(c, { message: '已撤銷' })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

export { bindingTokensRoutes }
