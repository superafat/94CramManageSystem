import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { RBACVariables } from '../../middleware/rbac'
import { requirePermission, Permission } from '../../middleware/rbac'
import { db, sql, success, successWithPagination, notFound, internalError, rows, first, logger } from './_helpers'

const auditRoutes = new Hono<{ Variables: RBACVariables }>()

// Helper function to create audit log
export async function createAuditLog(
  tenantId: string,
  userId: string | null,
  userName: string | null,
  userRole: string | null,
  action: string,
  tableName: string,
  recordId: string | null,
  oldValue: unknown,
  newValue: unknown,
  changeSummary: string,
  needsAlert: boolean = false,
  ipAddress: string | null = null
) {
  await db.execute(sql`
    INSERT INTO audit_logs (
      tenant_id, user_id, user_name, user_role,
      action, table_name, record_id,
      old_value, new_value, change_summary,
      needs_alert, ip_address, created_at
    ) VALUES (
      ${tenantId}, ${userId}, ${userName}, ${userRole},
      ${action}, ${tableName}, ${recordId},
      ${JSON.stringify(oldValue)}, ${JSON.stringify(newValue)}, ${changeSummary},
      ${needsAlert}, ${ipAddress}, NOW()
    )
  `)

  // Sync to 94inClass webhook (if configured)
  const webhookUrl = process.env.BEE_CLASS_WEBHOOK_URL
  if (webhookUrl) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
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
          ipAddress,
          timestamp: new Date().toISOString(),
        }),
      })
    } catch (err) {
      logger.error({ err: err }, 'Failed to sync to 94inClass:')
    }
  }
}

// Get audit logs with filters
auditRoutes.get('/audit-logs',
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
      const conditions = [sql`al.tenant_id = ${user.tenant_id}`]
      if (tableName) conditions.push(sql`al.table_name = ${tableName}`)
      if (action) conditions.push(sql`al.action = ${action}`)
      if (recordId) conditions.push(sql`al.record_id = ${recordId}`)
      if (needsAlert) conditions.push(sql`al.needs_alert = true`)

      const where = sql.join(conditions, sql` AND `)

      const countResult = first(await db.execute(sql`
        SELECT COUNT(*)::int as total FROM audit_logs al WHERE ${where}
      `))

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
        total: Number(countResult?.total) || 0,
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// Get pending alerts
auditRoutes.get('/alerts', requirePermission(Permission.REPORTS_READ), async (c) => {
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

// Confirm an alert
auditRoutes.post('/alerts/:id/confirm', requirePermission(Permission.STUDENTS_WRITE), async (c) => {
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
auditRoutes.post('/alerts/:id/revert', requirePermission(Permission.STUDENTS_WRITE), async (c) => {
  const user = c.get('user')
  const alertId = c.req.param('id')

  try {
    // Get original change
    const original = first(await db.execute(sql`
      SELECT * FROM audit_logs WHERE id = ${alertId}
    `))

    if (!original) {
      return notFound(c, 'Alert not found')
    }

    // Create a revert audit log
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || null
    await createAuditLog(
      user.tenant_id,
      user.id,
      user.name,
      user.role,
      'revert',
      String(original.table_name),
      String(original.record_id),
      original.new_value,
      original.old_value,
      `Reverted: ${String(original.change_summary)}`,
      false,
      ip
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

export { auditRoutes }
