/**
 * LINE LIFF 聯絡簿 API
 * 認證方式：LINE LIFF access token（呼叫 LINE profile API 驗證）
 *
 * GET  /api/line/contact-book/:id          — 取得完整聯絡簿
 * POST /api/line/contact-book/:id/feedback — 提交家長反饋
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { db } from '../../db'
import { users } from '../../db/schema'
import {
  manageContactBookEntries,
  manageContactBookScores,
  manageContactBookPhotos,
  manageContactBookFeedback,
  manageContactBookAiAnalysis,
  manageCourses,
  manageStudents,
} from '@94cram/shared/db'
import { logger } from '../../utils/logger'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineProfile {
  userId: string
  displayName: string
  pictureUrl?: string
}

interface LiffUser {
  id: string
  tenantId: string
  role: string
  lineUserId: string
}

type LiffVariables = {
  liffUser: LiffUser
}

type RelationRow = { allowed: boolean }

function getSqlRows<T>(result: T[] | { rows: T[] }): T[] {
  return Array.isArray(result) ? result : result.rows
}

async function verifyLineParentOwnsStudent(
  tenantId: string,
  parentUserId: string,
  studentId: string
): Promise<boolean> {
  const [parent] = await db
    .select({ id: users.id, phone: users.phone })
    .from(users)
    .where(
      and(
        eq(users.id, parentUserId),
        eq(users.tenantId, tenantId),
        eq(users.role, 'parent')
      )
    )
    .limit(1)

  if (!parent) return false

  try {
    const relationResult = await db.execute(sql`
      SELECT EXISTS(
        SELECT 1
        FROM parent_students
        WHERE parent_id = ${parentUserId}
          AND student_id = ${studentId}
      ) AS allowed
    `) as unknown as RelationRow[] | { rows: RelationRow[] }

    if (getSqlRows(relationResult)[0]?.allowed) {
      return true
    }
  } catch (error) {
    logger.warn(
      { err: error instanceof Error ? error : new Error(String(error)), tenantId, parentUserId, studentId },
      '[LIFF/contact-book] parent_students lookup failed, fallback to guardian phone check'
    )
  }

  if (!parent.phone) return false

  const [student] = await db
    .select({ id: manageStudents.id })
    .from(manageStudents)
    .where(
      and(
        eq(manageStudents.id, studentId),
        eq(manageStudents.tenantId, tenantId),
        eq(manageStudents.guardianPhone, parent.phone)
      )
    )
    .limit(1)

  return !!student
}

// ─── LIFF Auth Middleware ──────────────────────────────────────────────────────

async function verifyLiffToken(accessToken: string): Promise<LineProfile | null> {
  try {
    const response = await fetch('https://api.line.me/v2/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!response.ok) {
      logger.warn({ status: response.status }, '[LIFF] Profile verification failed')
      return null
    }
    const profile = (await response.json()) as LineProfile
    return profile
  } catch (error) {
    logger.warn({ err: error }, '[LIFF] Profile API error')
    return null
  }
}

const app = new Hono<{ Variables: LiffVariables }>()

// LIFF 認證 middleware
app.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'unauthorized', message: '缺少 Authorization header' }, 401)
  }

  const accessToken = authHeader.slice(7)
  const profile = await verifyLiffToken(accessToken)
  if (!profile) {
    return c.json({ success: false, error: 'unauthorized', message: 'LINE token 驗證失敗' }, 401)
  }

  // 用 lineUserId 查找對應的 user
  try {
    const [user] = await db
      .select({
        id: users.id,
        tenantId: users.tenantId,
        role: users.role,
        lineUserId: users.lineUserId,
      })
      .from(users)
      .where(and(eq(users.lineUserId, profile.userId), eq(users.role, 'parent')))
      .limit(1)

    if (!user || !user.tenantId) {
      return c.json({ success: false, error: 'not_found', message: '找不到對應的帳號，請先完成帳號綁定' }, 404)
    }

    c.set('liffUser', {
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
      lineUserId: profile.userId,
    })
  } catch (error) {
    logger.error({ err: error }, '[LIFF] DB lookup error')
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }

  await next()
})

// ─── GET /line/contact-book/:id ───────────────────────────────────────────────

const uuidParam = z.string().uuid()

app.get('/:id', async (c) => {
  const liffUser = c.get('liffUser')
  const { id } = c.req.param()

  const parsed = uuidParam.safeParse(id)
  if (!parsed.success) {
    return c.json({ success: false, error: 'bad_request', message: '無效的聯絡簿 ID' }, 400)
  }

  try {
    const [entry] = await db
      .select({
        id: manageContactBookEntries.id,
        tenantId: manageContactBookEntries.tenantId,
        studentId: manageContactBookEntries.studentId,
        courseId: manageContactBookEntries.courseId,
        entryDate: manageContactBookEntries.entryDate,
        status: manageContactBookEntries.status,
        groupProgress: manageContactBookEntries.groupProgress,
        groupHomework: manageContactBookEntries.groupHomework,
        individualNote: manageContactBookEntries.individualNote,
        individualHomework: manageContactBookEntries.individualHomework,
        teacherTip: manageContactBookEntries.teacherTip,
        sentAt: manageContactBookEntries.sentAt,
        readAt: manageContactBookEntries.readAt,
        createdAt: manageContactBookEntries.createdAt,
        courseName: manageCourses.name,
      })
      .from(manageContactBookEntries)
      .leftJoin(manageCourses, eq(manageContactBookEntries.courseId, manageCourses.id))
      .where(
        and(
          eq(manageContactBookEntries.id, parsed.data),
          eq(manageContactBookEntries.tenantId, liffUser.tenantId),
          inArray(manageContactBookEntries.status, ['sent', 'read'])
        )
      )
      .limit(1)

    if (!entry) {
      return c.json({ success: false, error: 'not_found', message: '找不到該聯絡簿' }, 404)
    }

    const allowed = await verifyLineParentOwnsStudent(liffUser.tenantId, liffUser.id, entry.studentId)
    if (!allowed) {
      return c.json({ success: false, error: 'forbidden', message: '無權查看該學生的聯絡簿' }, 403)
    }

    // 首次查看：更新 readAt 和 status='read'
    if (entry.status === 'sent') {
      await db
        .update(manageContactBookEntries)
        .set({ status: 'read', readAt: new Date() })
        .where(eq(manageContactBookEntries.id, parsed.data))
    }

    // 並行拉取所有子表
    const [scores, photos, feedbacks, aiAnalysis] = await Promise.all([
      db
        .select({
          id: manageContactBookScores.id,
          subject: manageContactBookScores.subject,
          score: manageContactBookScores.score,
          classAvg: manageContactBookScores.classAvg,
          fullScore: manageContactBookScores.fullScore,
        })
        .from(manageContactBookScores)
        .where(eq(manageContactBookScores.entryId, parsed.data)),

      db
        .select({
          id: manageContactBookPhotos.id,
          url: manageContactBookPhotos.url,
          caption: manageContactBookPhotos.caption,
          sortOrder: manageContactBookPhotos.sortOrder,
        })
        .from(manageContactBookPhotos)
        .where(eq(manageContactBookPhotos.entryId, parsed.data)),

      db
        .select({
          id: manageContactBookFeedback.id,
          parentUserId: manageContactBookFeedback.parentUserId,
          rating: manageContactBookFeedback.rating,
          comment: manageContactBookFeedback.comment,
          createdAt: manageContactBookFeedback.createdAt,
        })
        .from(manageContactBookFeedback)
        .where(eq(manageContactBookFeedback.entryId, parsed.data)),

      db
        .select({
          id: manageContactBookAiAnalysis.id,
          weaknessSummary: manageContactBookAiAnalysis.weaknessSummary,
          recommendedCourseName: manageContactBookAiAnalysis.recommendedCourseName,
          recommendedCourseDesc: manageContactBookAiAnalysis.recommendedCourseDesc,
          createdAt: manageContactBookAiAnalysis.createdAt,
        })
        .from(manageContactBookAiAnalysis)
        .where(eq(manageContactBookAiAnalysis.entryId, parsed.data)),
    ])

    return c.json({
      success: true,
      data: {
        ...entry,
        isRead: entry.status === 'read' || entry.status === 'sent',
        scores,
        photos,
        feedbacks,
        aiAnalysis: aiAnalysis[0] ?? null,
      },
    })
  } catch (error) {
    logger.error({ err: error }, '[LIFF/ContactBook] GET error')
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

// ─── POST /line/contact-book/:id/feedback ─────────────────────────────────────

const feedbackBodySchema = z.object({
  rating: z.number().int().min(1).max(5, 'rating 必須介於 1 到 5'),
  comment: z.string().max(1000).optional(),
})

app.post(
  '/:id/feedback',
  zValidator('json', feedbackBodySchema),
  async (c) => {
    const liffUser = c.get('liffUser')
    const { id } = c.req.param()
    const { rating, comment } = c.req.valid('json')

    const parsed = uuidParam.safeParse(id)
    if (!parsed.success) {
      return c.json({ success: false, error: 'bad_request', message: '無效的聯絡簿 ID' }, 400)
    }

    try {
      // 確認 entry 存在且屬於該 tenant（且已 sent/read）
      const [entry] = await db
        .select({ id: manageContactBookEntries.id, studentId: manageContactBookEntries.studentId })
        .from(manageContactBookEntries)
        .where(
          and(
            eq(manageContactBookEntries.id, parsed.data),
            eq(manageContactBookEntries.tenantId, liffUser.tenantId),
            inArray(manageContactBookEntries.status, ['sent', 'read'])
          )
        )
        .limit(1)

      if (!entry) {
        return c.json({ success: false, error: 'not_found', message: '找不到該聯絡簿' }, 404)
      }

      const allowed = await verifyLineParentOwnsStudent(liffUser.tenantId, liffUser.id, entry.studentId)
      if (!allowed) {
        return c.json({ success: false, error: 'forbidden', message: '無權回覆該學生的聯絡簿' }, 403)
      }

      // 檢查是否已有同一家長對同一 entry 的反饋
      const [existing] = await db
        .select({ id: manageContactBookFeedback.id })
        .from(manageContactBookFeedback)
        .where(
          and(
            eq(manageContactBookFeedback.entryId, parsed.data),
            eq(manageContactBookFeedback.parentUserId, liffUser.id)
          )
        )
        .limit(1)

      if (existing) {
        await db
          .update(manageContactBookFeedback)
          .set({ rating, comment: comment ?? null })
          .where(eq(manageContactBookFeedback.id, existing.id))

        return c.json({ success: true, data: { message: '反饋已更新' } })
      }

      const [created] = await db
        .insert(manageContactBookFeedback)
        .values({
          entryId: parsed.data,
          parentUserId: liffUser.id,
          rating,
          comment: comment ?? null,
        })
        .returning({ id: manageContactBookFeedback.id })

      return c.json({ success: true, data: { id: created.id, message: '反饋已提交' } }, 201)
    } catch (error) {
      logger.error({ err: error }, '[LIFF/ContactBook] POST feedback error')
      return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
    }
  }
)

export default app
