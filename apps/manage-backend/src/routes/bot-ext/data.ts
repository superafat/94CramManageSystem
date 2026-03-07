import { Hono } from 'hono'
import { db } from '../../db'
import { manageStudents, manageCourses } from '@94cram/shared/db'
import { eq, sql } from 'drizzle-orm'
import { Firestore } from '@google-cloud/firestore'
import { randomInt, randomUUID } from 'crypto'
import { logger } from '../../utils/logger'

type BotExtVariables = { tenantId: string; botRequest: boolean; botBody: Record<string, unknown> }
type QueryResultRows<T> = T[] | { rows?: T[] }

function firstRow<T>(result: QueryResultRows<T>): T | null {
  if (Array.isArray(result)) return result[0] ?? null
  return result.rows?.[0] ?? null
}

const app = new Hono<{ Variables: BotExtVariables }>()

// POST /data/students
app.post('/students', async (c) => {
  try {
    const tenantId = c.get('tenantId') as string
    const students = await db.select().from(manageStudents)
      .where(eq(manageStudents.tenantId, tenantId))
      .limit(1000)

    return c.json({
      success: true,
      data: students.map(s => ({ student_id: s.id, name: s.name, class_name: s.grade })),
    })
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

// POST /data/classes
app.post('/classes', async (c) => {
  try {
    const tenantId = c.get('tenantId') as string
    const courses = await db.select().from(manageCourses)
      .where(eq(manageCourses.tenantId, tenantId))
      .limit(500)

    return c.json({ success: true, data: courses.map(co => co.name) })
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

// POST /data/bindcode
app.post('/bindcode', async (c) => {
  try {
    const { tenant_id, tenant_name } = c.get('botBody') as any
    const tenantId = c.get('tenantId') as string

    const code = String(randomInt(100000, 1000000))

    const firestore = new Firestore()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    await firestore.collection('bot_bind_codes').doc(code).set({
      tenant_id: tenantId,
      tenant_name: tenant_name || '',
      code,
      created_at: new Date(),
      expires_at: expiresAt,
      used: false,
    })

    return c.json({
      success: true,
      message: `綁定碼已產生，5 分鐘內有效`,
      data: { code, expires_at: expiresAt.toISOString() },
    })
  } catch (error) {
    logger.error({ err: error }, '[Bot] bindcode error:')
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

// POST /data/channel-binding
app.post('/channel-binding', async (c) => {
  try {
    const body = c.get('botBody') as Record<string, unknown>
    const tenantId = c.get('tenantId') as string
    const userId = typeof body.userId === 'string' ? body.userId : ''
    const channelType = typeof body.channelType === 'string' ? body.channelType : ''
    const externalUserId = typeof body.externalUserId === 'string' ? body.externalUserId : ''
    const metadata = typeof body.metadata === 'object' && body.metadata !== null ? body.metadata : {}

    if (!userId || !channelType || !externalUserId) {
      return c.json({ success: false, error: 'bad_request', message: 'userId, channelType, externalUserId are required' }, 400)
    }

    const userRow = firstRow(await db.execute(sql`
      SELECT id
      FROM users
      WHERE id = ${userId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
      LIMIT 1
    `) as QueryResultRows<{ id: string }>)

    if (!userRow) {
      return c.json({ success: false, error: 'not_found', message: 'User not found in tenant' }, 404)
    }

    const existing = firstRow(await db.execute(sql`
      SELECT id
      FROM user_channel_bindings
      WHERE user_id = ${userId}
        AND tenant_id = ${tenantId}
        AND channel_type = ${channelType}
        AND external_user_id = ${externalUserId}
      LIMIT 1
    `) as QueryResultRows<{ id: string }>)

    if (existing?.id) {
      await db.execute(sql`
        UPDATE user_channel_bindings
        SET status = 'active', metadata = ${JSON.stringify(metadata)}::jsonb, verified_at = NOW(), updated_at = NOW()
        WHERE id = ${existing.id}
      `)
    } else {
      await db.execute(sql`
        INSERT INTO user_channel_bindings (id, user_id, tenant_id, channel_type, external_user_id, status, metadata, verified_at, created_at, updated_at)
        VALUES (${randomUUID()}, ${userId}, ${tenantId}, ${channelType}, ${externalUserId}, 'active', ${JSON.stringify(metadata)}::jsonb, NOW(), NOW(), NOW())
      `)
    }

    return c.json({ success: true, data: { userId, tenantId, channelType, externalUserId } })
  } catch (error) {
    logger.error({ err: error }, '[Bot] channel-binding error:')
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

export default app
