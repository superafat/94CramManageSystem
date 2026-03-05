/**
 * Public binding routes — no JWT auth required.
 * Handles QR code binding verification and execution.
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db, sql, first, rows } from './admin/_helpers'

const bindRoutes = new Hono()

// GET /bind/:token — 驗證 token 有效性
bindRoutes.get('/bind/:token', async (c) => {
  const { token } = c.req.param()

  try {
    const result = await db.execute(sql`
      SELECT bt.id, bt.student_id, bt.expires_at, bt.used_at, bt.used_by_line_id,
             s.full_name as student_name, t.name as tenant_name
      FROM manage_binding_tokens bt
      JOIN students s ON s.id = bt.student_id
      JOIN tenants t ON t.id = bt.tenant_id
      WHERE bt.token = ${token}
      LIMIT 1
    `)

    const row = first(result)
    if (!row) {
      return c.json({ valid: false, reason: 'not_found' })
    }
    if (row.used_at) {
      return c.json({ valid: false, reason: 'used' })
    }
    if (row.expires_at && new Date(row.expires_at as string) < new Date()) {
      return c.json({ valid: false, reason: 'expired' })
    }

    return c.json({ valid: true, studentName: row.student_name, tenantName: row.tenant_name })
  } catch (_e) {
    return c.json({ valid: false, reason: 'error' }, 500)
  }
})

// POST /bind/:token — 執行綁定
bindRoutes.post(
  '/bind/:token',
  zValidator('json', z.object({ lineUserId: z.string().min(1) })),
  async (c) => {
    const { token } = c.req.param()
    const { lineUserId } = c.req.valid('json')

    try {
      // Atomic update — only succeeds if token is unused and not expired
      const updateResult = await db.execute(sql`
        UPDATE manage_binding_tokens
        SET used_at = NOW(), used_by_line_id = ${lineUserId}
        WHERE token = ${token}
          AND used_at IS NULL
          AND (expires_at IS NULL OR expires_at > NOW())
        RETURNING id, student_id, tenant_id
      `)

      const row = first(updateResult)
      if (!row) {
        return c.json({ success: false, reason: 'invalid_or_expired' }, 400)
      }

      // Get student name for response
      const studentResult = await db.execute(sql`
        SELECT full_name FROM students WHERE id = ${row.student_id} LIMIT 1
      `)
      const studentName = (first(studentResult)?.full_name as string) || ''

      return c.json({ success: true, studentName })
    } catch (_e) {
      return c.json({ success: false, reason: 'error' }, 500)
    }
  },
)

export { bindRoutes }
