/**
 * Internal API Routes (for BeeClass integration)
 * Authentication: Simple Bearer token check
 * 
 * 修復項目：
 * 1. ✅ 增加 Input Validation (Zod)
 * 2. ✅ 統一 API Response Format
 * 3. ✅ 防止 SQL Injection (已使用 parameterized queries)
 * 4. ✅ 改善 Error Handling
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db'
import { sql } from 'drizzle-orm'

const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN || 'dev-internal-secret'

export const internalRoutes = new Hono()

// Simple auth middleware
internalRoutes.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (authHeader !== `Bearer ${INTERNAL_API_TOKEN}`) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, 401)
  }
  await next()
})

// ===== Validation Schemas =====
const notificationSchema = z.object({
  type: z.string().min(1).max(50),
  studentId: z.string().uuid('Invalid student ID'),
  title: z.string().min(1).max(255),
  body: z.string().min(1).max(2000),
  channel: z.enum(['line', 'telegram', 'email']).default('line'),
})

const studentsQuerySchema = z.object({
  tenantId: z.string().uuid('Invalid tenant ID'),
})

/**
 * POST /internal/notifications
 * Receive notification triggers from BeeClass
 */
internalRoutes.post('/notifications', zValidator('json', notificationSchema), async (c) => {
  try {
    const { type, studentId, title, body, channel } = c.req.valid('json')

    console.log(`📥 Internal notification: ${type} for student ${studentId}`)

    // 1. Find student and parent
    const studentQuery = await db.execute(sql`
      SELECT s.id, s.full_name, s.tenant_id, ps.parent_id
      FROM students s
      LEFT JOIN parent_students ps ON s.id = ps.student_id
      WHERE s.id = ${studentId}
        AND s.deleted_at IS NULL
      LIMIT 1
    `) as any[]

    const student = studentQuery[0]
    if (!student) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Student not found' } }, 404)
    }

    if (!student.parent_id) {
      console.log(`⚠️ No parent linked for student ${studentId}`)
      return c.json({ success: true, data: { sent: false, message: 'No parent linked' } }, 200)
    }

    // 2. Find parent's contact info
    const parentQuery = await db.execute(sql`
      SELECT id, name, line_user_id, telegram_id
      FROM users
      WHERE id = ${student.parent_id}
      LIMIT 1
    `) as any[]

    const parent = parentQuery[0]
    if (!parent) {
      return c.json({ success: true, data: { sent: false, message: 'Parent user not found' } }, 200)
    }

    // 3. Send notification based on channel
    let sent = false
    
    if (channel === 'line' && parent.line_user_id) {
      // 發送 LINE 訊息
      const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN
      if (LINE_TOKEN) {
        try {
          const lineResp = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LINE_TOKEN}`
            },
            body: JSON.stringify({
              to: parent.line_user_id,
              messages: [{ type: 'text', text: `【${title}】\n\n${body}` }]
            })
          })
          sent = lineResp.ok
          console.log(`📱 LINE sent to ${parent.line_user_id}: ${sent ? 'OK' : 'FAILED'}`)
        } catch (err) {
          console.error('LINE send error:', err)
        }
      } else {
        console.warn('⚠️ LINE_CHANNEL_ACCESS_TOKEN not configured')
      }
    } else if (channel === 'telegram' && parent.telegram_id) {
      // 發送 Telegram 訊息
      const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN
      if (TG_TOKEN) {
        try {
          const tgResp = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: parent.telegram_id,
              text: `【${title}】\n\n${body}`,
              parse_mode: 'Markdown'
            })
          })
          sent = tgResp.ok
          console.log(`📱 Telegram sent to ${parent.telegram_id}: ${sent ? 'OK' : 'FAILED'}`)
        } catch (err) {
          console.error('Telegram send error:', err)
        }
      } else {
        console.warn('⚠️ TELEGRAM_BOT_TOKEN not configured')
      }
    }

    // 4. Log notification
    try {
      await db.execute(sql`
        INSERT INTO notifications (tenant_id, type, recipient_id, student_id, title, body, channel, status, sent_at)
        VALUES (
          ${student.tenant_id},
          ${type}::notification_type,
          ${student.parent_id},
          ${studentId},
          ${title},
          ${body},
          ${channel}::notification_channel,
          ${sent ? 'sent' : 'failed'}::notification_status,
          ${sent ? new Date().toISOString() : null}
        )
      `)
    } catch (e) {
      console.error('Failed to log notification (non-fatal):', e)
    }

    return c.json({ success: true, data: { sent, message: 'Notification processed' } })
  } catch (err: any) {
    console.error('Internal notification error:', err)
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500)
  }
})

/**
 * GET /internal/students?tenantId=xxx
 * Provide student list to BeeClass for sync
 */
internalRoutes.get('/students', zValidator('query', studentsQuerySchema), async (c) => {
  try {
    const { tenantId } = c.req.valid('query')

    const students = await db.execute(sql`
      SELECT 
        id,
        full_name as name,
        student_code,
        grade_level,
        active,
        created_at
      FROM students
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
      ORDER BY full_name
    `) as any[]

    return c.json({ success: true, data: { students, count: students.length } })
  } catch (err: any) {
    console.error('Internal students query error:', err)
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500)
  }
})

/**
 * GET /internal/health
 * Health check for internal API
 */
internalRoutes.get('/health', (c) => {
  return c.json({ 
    success: true,
    data: { 
      service: 'imStudy-internal-api',
      timestamp: new Date().toISOString() 
    }
  })
})
