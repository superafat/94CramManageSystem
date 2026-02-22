/**
 * Webhook routes (for 94Manage sync)
 * These routes use webhook secret auth, NOT JWT
 */
import { Hono } from 'hono'
import { db } from '../db/index.js'
import { auditLogs } from '../db/schema.js'

const webhookRouter = new Hono()

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET
if (!WEBHOOK_SECRET) {
  console.warn('[Warning] WEBHOOK_SECRET not set, webhook endpoints will be disabled')
}

webhookRouter.post('/sync', async (c) => {
  if (!WEBHOOK_SECRET) {
    return c.json({ error: 'Webhook not configured' }, 503)
  }

  const webhookSecret = c.req.header('X-Webhook-Secret')
  if (webhookSecret !== WEBHOOK_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const body = await c.req.json()
    const { action, tableName, recordId, oldValue, newValue, changeSummary, needsAlert, sourceSchoolId } = body

    if (!sourceSchoolId) {
      return c.json({ error: 'sourceSchoolId is required' }, 400)
    }

    await db.insert(auditLogs).values({
      schoolId: sourceSchoolId,
      userId: null,
      userName: '94Manage 同步',
      userRole: 'system',
      action: action || 'sync',
      tableName: tableName || 'unknown',
      recordId: recordId || null,
      oldValue: oldValue || null,
      newValue: newValue || null,
      changeSummary: changeSummary || `[從 94Manage 同步] ${tableName}`,
      needsAlert: needsAlert !== undefined ? needsAlert : true,
      alertSent: false,
      parentNotified: false,
      createdAt: new Date(),
    })

    return c.json({ ok: true, message: 'Sync received' })
  } catch (e) {
    console.error('[Webhook Error] Failed to process sync:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to process sync' }, 500)
  }
})

export default webhookRouter
