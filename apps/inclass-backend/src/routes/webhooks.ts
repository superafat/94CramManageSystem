import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db/index.js'
import { auditLogs } from '@94cram/shared/db'
import { logger } from '../utils/logger.js'

const webhookRouter = new Hono()
const webhookSyncSchema = z.object({
  action: z.string().min(1).optional(),
  tableName: z.string().min(1).optional(),
  recordId: z.string().optional().nullable(),
  changeSummary: z.string().min(1).optional(),
  sourceSchoolId: z.string().min(1),
})

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET
if (!WEBHOOK_SECRET) logger.warn('[Warning] WEBHOOK_SECRET not set, webhook endpoints will be disabled')

webhookRouter.post('/sync', async (c) => {
  if (!WEBHOOK_SECRET) return c.json({ error: 'Webhook not configured' }, 503)
  const incoming = c.req.header('X-Webhook-Secret') ?? ''
  const { timingSafeEqual } = await import('crypto')
  if (incoming.length !== WEBHOOK_SECRET.length || !timingSafeEqual(Buffer.from(incoming), Buffer.from(WEBHOOK_SECRET))) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const payload = webhookSyncSchema.safeParse(await c.req.json())
    if (!payload.success) return c.json({ error: 'Invalid webhook payload', details: payload.error.flatten() }, 400)
    const { action, tableName, recordId, changeSummary, sourceSchoolId } = payload.data
    await db.insert(auditLogs).values({
      tenantId: sourceSchoolId,
      userId: null,
      action: action || 'sync',
      resource: tableName || 'unknown',
      resourceId: recordId || null,
      details: changeSummary || null,
      ipAddress: c.req.header('x-forwarded-for') || null,
    })
    return c.json({ ok: true, message: 'Sync received' })
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, '[Webhook Error] Failed to process sync')
    return c.json({ error: 'Failed to process sync' }, 500)
  }
})

export default webhookRouter
