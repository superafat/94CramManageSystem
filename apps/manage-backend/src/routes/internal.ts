/**
 * Internal API Routes — 跨系統內部呼叫
 * 認證：X-Internal-Key header
 */
import { timingSafeEqual, createHash } from 'crypto';
import { Hono } from 'hono';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger'
import {
  notifyAttendance,
  notifyCheckout,
  notifyBillingOverdue,
  notifyScheduleChange,
  notifyMonthlyAiSummary,
  notifyParent,
} from '../services/notify-helper'

const app = new Hono();

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
if (!INTERNAL_API_KEY) {
  throw new Error('INTERNAL_API_KEY is required for internal routes');
}

const INTERNAL_API_KEY_BUFFER = Buffer.from(INTERNAL_API_KEY);

function safeCompare(key: string): boolean {
  const keyBuffer = Buffer.from(key);

  if (keyBuffer.length !== INTERNAL_API_KEY_BUFFER.length) {
    return false;
  }

  return timingSafeEqual(keyBuffer, INTERNAL_API_KEY_BUFFER);
}

// Internal key 驗證
app.use('*', async (c, next) => {
  const key = c.req.header('X-Internal-Key');
  if (!key || !safeCompare(key)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
});

app.get('/health', (c) => {
  return c.json({ service: '94manage', status: 'ok', timestamp: Date.now() });
});

// Seed database - creates initial data
app.post('/seed', async (c) => {
  try {
    // Create default tenant if not exists
    let tenantId: string | null = null
    
    const tenantResult = await db.execute(sql`SELECT id FROM tenants LIMIT 1`)
    const tenants = Array.isArray(tenantResult) ? tenantResult : (tenantResult as any).rows || []
    
    if (tenants.length === 0) {
      tenantId = crypto.randomUUID()
      await db.execute(sql`
        INSERT INTO tenants (id, name, status, created_at)
        VALUES (${tenantId}, 'Default Tenant', 'active', NOW())
      `)
    } else {
      tenantId = tenants[0].id
    }
    
    // Create admin user if not exists
    const userResult = await db.execute(sql`SELECT id FROM users WHERE username = 'admin' LIMIT 1`)
    const users = Array.isArray(userResult) ? userResult : (userResult as any).rows || []
    
    if (users.length === 0) {
      const userId = crypto.randomUUID()
      const { randomBytes } = await import('crypto')
      const bcrypt = await import('bcryptjs')
      const oneTimePassword = randomBytes(16).toString('hex')
      const passwordHash = await bcrypt.default.hash(oneTimePassword, 12)
      logger.info(`[SEED] 臨時管理員密碼: ${oneTimePassword} — 請立即更改`)

      await db.execute(sql`
        INSERT INTO users (id, tenant_id, username, full_name, email, role, password_hash, is_active, created_at)
        VALUES (${userId}, ${tenantId}, 'admin', '系統管理員', 'admin@94cram.com', 'superadmin', ${passwordHash}, true, NOW())
      `)
      return c.json({ success: true, message: 'Admin user created', tenantId, userId })
    }
    
    return c.json({ success: true, message: 'Admin user already exists', tenantId })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// Helper：統一取得 query 結果列
const rows = (result: unknown): unknown[] =>
  Array.isArray(result) ? result : ((result as any)?.rows ?? [])

// ─── 帳款相關 ────────────────────────────────────────────────────────────────

// GET /billing/unpaid-all — 所有未繳費學生（分校用）
app.get('/billing/unpaid-all', async (c) => {
  try {
    const result = await db.execute(sql`
      SELECT
        p.id, p.tenant_id, p.amount, p.status, p.created_at,
        s.name        AS student_name,
        s.guardian_name,
        s.guardian_phone,
        c.name        AS course_name,
        t.name        AS tenant_name,
        EXTRACT(DAY FROM NOW() - p.created_at) AS overdue_days
      FROM manage_payments p
      JOIN manage_enrollments e ON p.enrollment_id = e.id
      JOIN manage_students   s ON e.student_id = s.id
      JOIN manage_courses    c ON e.course_id  = c.id
      JOIN tenants           t ON p.tenant_id  = t.id
      WHERE p.status IN ('pending', 'overdue')
        AND p.deleted_at IS NULL
        AND s.deleted_at IS NULL
      ORDER BY p.tenant_id, p.created_at
    `)
    return c.json({ success: true, data: rows(result) })
  } catch (error) {
    logger.error({ error }, 'GET /billing/unpaid-all failed')
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// GET /billing/unpaid-with-parent-binding — 有 Bot 綁定的未繳費家長
app.get('/billing/unpaid-with-parent-binding', async (c) => {
  try {
    const result = await db.execute(sql`
      SELECT
        p.id, p.tenant_id, p.amount, p.status,
        s.name        AS student_name,
        s.guardian_name,
        s.guardian_phone,
        c.name        AS course_name,
        u.id          AS parent_user_id,
        u.email       AS parent_email
      FROM manage_payments p
      JOIN manage_enrollments e ON p.enrollment_id = e.id
      JOIN manage_students   s ON e.student_id = s.id
      JOIN manage_courses    c ON e.course_id  = c.id
      LEFT JOIN users u
        ON  u.tenant_id  = p.tenant_id
        AND u.role       = 'parent'
        AND u.is_active  = true
        AND u.deleted_at IS NULL
      WHERE p.status IN ('pending', 'overdue')
        AND p.deleted_at IS NULL
        AND s.deleted_at IS NULL
      ORDER BY p.tenant_id
    `)
    return c.json({ success: true, data: rows(result) })
  } catch (error) {
    logger.error({ error }, 'GET /billing/unpaid-with-parent-binding failed')
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ─── 課程相關 ────────────────────────────────────────────────────────────────

// POST /courses/recommend — 依弱科推薦課程
app.post('/courses/recommend', async (c) => {
  try {
    const body = await c.req.json<{ tenantId: string; weakSubjects: string[] }>()

    if (!body.tenantId || !Array.isArray(body.weakSubjects) || body.weakSubjects.length === 0) {
      return c.json({ success: false, error: 'tenantId and weakSubjects are required' }, 400)
    }

    const result = await db.execute(sql`
      SELECT id, name, subject, grade, course_type, fee_monthly, fee_per_session
      FROM manage_courses
      WHERE tenant_id  = ${body.tenantId}
        AND subject    = ANY(${body.weakSubjects})
        AND deleted_at IS NULL
      ORDER BY name
    `)
    return c.json({ success: true, data: rows(result) })
  } catch (error) {
    logger.error({ error }, 'POST /courses/recommend failed')
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ─── 聯絡簿相關 ──────────────────────────────────────────────────────────────

// GET /contact-book/pending-push — 待 AI 推播的聯絡簿
app.get('/contact-book/pending-push', async (c) => {
  try {
    const result = await db.execute(sql`
      SELECT
        cm.id, cm.tenant_id, cm.student_id, cm.course_id,
        cm.type, cm.title, cm.content,
        cm.exam_scores, cm.created_at,
        s.name AS student_name
      FROM manage_contact_messages cm
      JOIN manage_students s ON cm.student_id = s.id
      WHERE cm.type IN ('tip', 'progress')
        AND cm.created_at >= NOW() - INTERVAL '1 day'
        AND cm.student_id IS NOT NULL
      ORDER BY cm.created_at DESC
    `)
    return c.json({ success: true, data: rows(result) })
  } catch (error) {
    logger.error({ error }, 'GET /contact-book/pending-push failed')
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// POST /contact-book/mark-pushed — 標記已推播
app.post('/contact-book/mark-pushed', async (c) => {
  try {
    const body = await c.req.json<{ messageIds: string[] }>()

    if (!Array.isArray(body.messageIds) || body.messageIds.length === 0) {
      return c.json({ success: false, error: 'messageIds array is required' }, 400)
    }

    // manage_contact_messages 目前無 pushed_at 欄位，先記錄 log
    // 後續可執行 ALTER TABLE manage_contact_messages ADD COLUMN pushed_at TIMESTAMPTZ
    logger.info({ messageIds: body.messageIds }, 'Marked messages as pushed')
    return c.json({ success: true, count: body.messageIds.length })
  } catch (error) {
    logger.error({ error }, 'POST /contact-book/mark-pushed failed')
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ─── 通知相關 ────────────────────────────────────────────────────────────────

// POST /notify/attendance — 學生出缺勤通知（inclass-backend 呼叫）
app.post('/notify/attendance', async (c) => {
  try {
    const body = await c.req.json<{
      tenantId: string
      studentId: string
      studentName: string
      status: 'present' | 'late' | 'absent' | 'leave'
      time?: string
    }>()

    if (!body.tenantId || !body.studentId || !body.status) {
      return c.json({ success: false, error: 'tenantId, studentId, status are required' }, 400)
    }

    void notifyAttendance(body.tenantId, body.studentId, body.studentName, body.status, body.time)
    return c.json({ success: true, message: 'Notification dispatched' })
  } catch (error) {
    logger.error({ error }, 'POST /notify/attendance failed')
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// POST /notify/checkout — 學生簽退通知
app.post('/notify/checkout', async (c) => {
  try {
    const body = await c.req.json<{
      tenantId: string; studentId: string; studentName: string; time: string
    }>()

    if (!body.tenantId || !body.studentId) {
      return c.json({ success: false, error: 'tenantId, studentId are required' }, 400)
    }

    void notifyCheckout(body.tenantId, body.studentId, body.studentName, body.time)
    return c.json({ success: true, message: 'Notification dispatched' })
  } catch (error) {
    logger.error({ error }, 'POST /notify/checkout failed')
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// POST /notify/billing-overdue — 催繳通知（bot-gateway scheduler 呼叫）
app.post('/notify/billing-overdue', async (c) => {
  try {
    const body = await c.req.json<{
      tenantId: string
      studentId: string
      studentName: string
      unpaidItems: Array<{ courseName: string; amount: number }>
    }>()

    if (!body.tenantId || !body.studentId || !body.unpaidItems?.length) {
      return c.json({ success: false, error: 'tenantId, studentId, unpaidItems required' }, 400)
    }

    void notifyBillingOverdue(body.tenantId, body.studentId, body.studentName, body.unpaidItems)
    return c.json({ success: true, message: 'Notification dispatched' })
  } catch (error) {
    logger.error({ error }, 'POST /notify/billing-overdue failed')
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// POST /notify/schedule-change — 調課/補課/停課通知
app.post('/notify/schedule-change', async (c) => {
  try {
    const body = await c.req.json<{
      tenantId: string
      studentId: string
      studentName: string
      changeType: 'reschedule' | 'makeup' | 'cancel'
      details: {
        courseName: string
        originalDate?: string
        originalTime?: string
        newDate?: string
        newTime?: string
        teacherName?: string
        room?: string
        reason?: string
      }
    }>()

    if (!body.tenantId || !body.studentId || !body.changeType) {
      return c.json({ success: false, error: 'tenantId, studentId, changeType required' }, 400)
    }

    void notifyScheduleChange(body.tenantId, body.studentId, body.studentName, body.changeType, body.details)
    return c.json({ success: true, message: 'Notification dispatched' })
  } catch (error) {
    logger.error({ error }, 'POST /notify/schedule-change failed')
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// POST /notify/monthly-summary — 月度 AI 學習總結（bot-gateway scheduler 呼叫）
app.post('/notify/monthly-summary', async (c) => {
  try {
    const body = await c.req.json<{ tenantId?: string; month?: string }>()
    const month = body.month || new Date().toISOString().slice(0, 7)
    const tenantFilter = body.tenantId ? sql`AND s.tenant_id = ${body.tenantId}` : sql``

    // 取得所有在當月有上課紀錄的學生
    const studentsResult = await db.execute(sql`
      SELECT DISTINCT s.id, s.full_name, s.tenant_id
      FROM manage_students s
      JOIN manage_enrollments e ON e.student_id = s.id AND e.status = 'active'
      WHERE s.deleted_at IS NULL ${tenantFilter}
      ORDER BY s.tenant_id, s.full_name
    `)
    const students = rows(studentsResult)
    if (students.length === 0) return c.json({ success: true, dispatched: 0 })

    const studentIds = (students as Array<{ id: string }>).map(s => s.id)

    // Batch: 一次取得所有學生當月成績（避免 N+1）
    const allScoresResult = await db.execute(sql`
      SELECT ce.student_id, cs.subject, cs.score, cs.full_score, c.name as course_name
      FROM manage_contact_book_scores cs
      JOIN manage_contact_book_entries ce ON cs.entry_id = ce.id
      LEFT JOIN manage_courses c ON ce.course_id = c.id
      WHERE ce.student_id = ANY(${studentIds})
        AND ce.entry_date >= ${month + '-01'}
        AND ce.entry_date < (${month + '-01'}::date + INTERVAL '1 month')
        AND ce.status = 'sent'
      ORDER BY ce.entry_date
    `)
    const allScores = rows(allScoresResult) as Array<{ student_id: string; subject: string; score: string; full_score: string; course_name: string }>

    // Group scores by student
    const scoresByStudent = new Map<string, typeof allScores>()
    for (const score of allScores) {
      const list = scoresByStudent.get(score.student_id) || []
      list.push(score)
      scoresByStudent.set(score.student_id, list)
    }

    let dispatched = 0
    for (const student of students as any[]) {
      const scores = scoresByStudent.get(student.id) || []

      if (scores.length === 0) continue

      // 簡易分析：計算各科平均分數 + 辨別弱科
      const subjectMap: Record<string, { total: number; count: number; full: number }> = {}
      for (const s of scores) {
        const key = s.subject || s.course_name || '未知'
        if (!subjectMap[key]) subjectMap[key] = { total: 0, count: 0, full: Number(s.full_score) || 100 }
        subjectMap[key].total += Number(s.score) || 0
        subjectMap[key].count++
      }

      const lines: string[] = []
      const weakSubjects: string[] = []
      for (const [subject, data] of Object.entries(subjectMap)) {
        const avg = Math.round(data.total / data.count)
        const pct = Math.round((avg / data.full) * 100)
        lines.push(`${subject}：平均 ${avg} 分（${data.count} 次測驗）`)
        if (pct < 70) weakSubjects.push(subject)
      }

      let summary = lines.join('\n')
      if (weakSubjects.length > 0) {
        summary += `\n\n需加強科目：${weakSubjects.join('、')}，建議增加練習頻率或考慮補強課程。`
      } else {
        summary += '\n\n整體表現良好，請繼續保持！'
      }

      void notifyMonthlyAiSummary(student.tenant_id, student.id, student.full_name, month, summary)
      dispatched++

      // Rate limit
      await new Promise(r => setTimeout(r, 200))
    }

    return c.json({ success: true, dispatched })
  } catch (error) {
    logger.error({ error }, 'POST /notify/monthly-summary failed')
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// GET /billing/overdue-by-student — 按學生分組的欠繳清單（bot-gateway 催繳用）
app.get('/billing/overdue-by-student', async (c) => {
  try {
    const result = await db.execute(sql`
      SELECT
        s.id AS student_id, s.full_name AS student_name, s.tenant_id,
        c.name AS course_name,
        pr.amount,
        pr.period_month
      FROM manage_payments pr
      JOIN manage_students s ON pr.student_id = s.id
      JOIN manage_courses c ON pr.course_id = c.id
      WHERE pr.status IN ('pending', 'overdue')
        AND s.deleted_at IS NULL
      ORDER BY s.tenant_id, s.full_name
    `)
    return c.json({ success: true, data: rows(result) })
  } catch (error) {
    logger.error({ error }, 'GET /billing/overdue-by-student failed')
    return c.json({ success: false, error: String(error) }, 500)
  }
})

export default app;

