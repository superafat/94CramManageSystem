import { Hono } from 'hono'
import { db } from '../../db'
import { users } from '../../db/schema'
import { eq, sql, and, ilike } from 'drizzle-orm'
import { logger } from '../../utils/logger'

type BotExtVariables = { tenantId: string; botRequest: boolean; botBody: Record<string, unknown> }

const app = new Hono<{ Variables: BotExtVariables }>()

// POST /line/user-by-line-id
app.post('/user-by-line-id', async (c) => {
  try {
    const { line_user_id } = c.get('botBody') as { line_user_id?: string }

    if (!line_user_id || typeof line_user_id !== 'string') {
      return c.json({ success: false, error: 'missing_param', message: '缺少 line_user_id' }, 400)
    }

    const rows = await db
      .select({
        id: users.id,
        username: users.name,
        email: users.email,
        role: users.role,
        tenant_id: users.tenantId,
        branch_id: users.branchId,
      })
      .from(users)
      .where(eq(users.lineUserId, line_user_id))
      .limit(1)

    return c.json({ success: true, data: { user: rows[0] ?? null } })
  } catch (error) {
    logger.error({ err: error }, '[BotExt/line] user-by-line-id error')
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

// POST /line/bind
app.post('/bind', async (c) => {
  try {
    const { line_user_id, student_name, phone_last_4 } = c.get('botBody') as {
      line_user_id?: string
      student_name?: string
      phone_last_4?: string
    }

    if (!line_user_id || !student_name || !phone_last_4) {
      return c.json({ success: false, error: 'missing_param', message: '缺少必要參數' }, 400)
    }

    // Check if this LINE ID is already bound to any user (cross-tenant check)
    const alreadyBound = await db
      .select({ id: users.id, tenantId: users.tenantId, name: users.name })
      .from(users)
      .where(eq(users.lineUserId, line_user_id))
      .limit(1)

    if (alreadyBound.length > 0) {
      return c.json({ success: false, error: 'already_bound', message: '此 LINE 帳號已綁定其他帳號，請聯繫客服協助' })
    }

    // Search for matching users by name (case-insensitive) and phone last 4 digits, unbound only
    const candidates = await db
      .select({ id: users.id, name: users.name, phone: users.phone, tenantId: users.tenantId })
      .from(users)
      .where(
        and(
          ilike(users.name, student_name),
          sql`${users.phone} LIKE ${'%' + phone_last_4}`,
          sql`${users.lineUserId} IS NULL`
        )
      )
      .limit(5)

    if (candidates.length === 0) {
      return c.json({ success: false, error: 'not_found', message: '找不到符合的帳號' })
    }

    if (candidates.length > 1) {
      return c.json({ success: false, error: 'multiple_matches', message: '找到多筆符合的帳號，請提供更精確的資訊' })
    }

    const matched = candidates[0]

    // Atomic bind: only if still unbound (prevents TOCTOU race)
    const bindResult = await db.execute(sql`
      UPDATE users
      SET line_user_id = ${line_user_id}, updated_at = NOW()
      WHERE id = ${matched.id} AND line_user_id IS NULL
      RETURNING id
    `)
    const bound = Array.isArray(bindResult) ? bindResult : []
    if (bound.length === 0) {
      return c.json({ success: false, error: 'race_condition', message: '綁定失敗，帳號已被綁定，請重試' })
    }

    return c.json({
      success: true,
      data: {
        user_id: matched.id,
        username: matched.name,
        tenant_id: matched.tenantId,
      },
    })
  } catch (error) {
    logger.error({ err: error }, '[BotExt/line] bind error')
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

// GET /line/conversations
app.get('/conversations', async (c) => {
  try {
    const line_user_id = c.req.query('line_user_id')
    const limitParam = c.req.query('limit')

    if (!line_user_id) {
      return c.json({ success: false, error: 'missing_param', message: '缺少 line_user_id' }, 400)
    }

    const limit = Math.min(Math.max(1, Number(limitParam) || 10), 50)

    const rows = await db.execute(sql`
      SELECT id, line_user_id, user_name, user_role, user_message, bot_reply, intent, model, latency_ms, created_at
      FROM line_conversations
      WHERE line_user_id = ${line_user_id}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `)

    const conversations = Array.isArray(rows) ? rows : []

    return c.json({ success: true, data: { conversations } })
  } catch (error) {
    logger.error({ err: error }, '[BotExt/line] conversations GET error')
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

// POST /line/conversations
app.post('/conversations', async (c) => {
  try {
    const {
      line_user_id,
      user_name,
      user_role,
      user_message,
      bot_reply,
      intent,
      model,
      latency_ms,
    } = c.get('botBody') as {
      line_user_id?: string
      user_name?: string
      user_role?: string
      user_message?: string
      bot_reply?: string
      intent?: string
      model?: string
      latency_ms?: number
    }

    if (!line_user_id || !user_message || !bot_reply) {
      return c.json({ success: false, error: 'missing_param', message: '缺少必要參數 (line_user_id, user_message, bot_reply)' }, 400)
    }

    await db.execute(sql`
      INSERT INTO line_conversations
        (line_user_id, user_name, user_role, user_message, bot_reply, intent, model, latency_ms, created_at)
      VALUES
        (${line_user_id}, ${user_name ?? ''}, ${user_role ?? 'guest'}, ${user_message},
         ${bot_reply}, ${intent ?? null}, ${model ?? null}, ${latency_ms ?? null}, NOW())
    `)

    return c.json({ success: true })
  } catch (error) {
    logger.error({ err: error }, '[BotExt/line] conversations POST error')
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

export default app
