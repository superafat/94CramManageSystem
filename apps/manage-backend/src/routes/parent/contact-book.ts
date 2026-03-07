/**
 * 家長端聯絡簿 API
 * 認證：JWT（authMiddleware 已在 parent/index.ts 套用）
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { eq, and, inArray, desc, sql } from 'drizzle-orm'
import { db } from '../../db'
import {
  manageContactBookEntries,
  manageContactBookScores,
  manageContactBookPhotos,
  manageContactBookFeedback,
  manageContactBookAiAnalysis,
  manageCourses,
  manageStudents,
  users,
} from '@94cram/shared/db'
import type { RBACVariables } from '../../middleware/rbac'
import { logger } from '../../utils/logger'

type Variables = RBACVariables & { tenantId: string }

export const contactBookRoutes = new Hono<{ Variables: Variables }>()

// ─── Query schemas ────────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  studentId: z.string().uuid('studentId 必須是有效的 UUID'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

const feedbackBodySchema = z.object({
  rating: z.number().int().min(1).max(5, 'rating 必須介於 1 到 5'),
  comment: z.string().max(1000).optional(),
})

type RelationRow = { allowed: boolean }

function getSqlRows<T>(result: T[] | { rows: T[] }): T[] {
  return Array.isArray(result) ? result : result.rows
}

async function verifyParentOwnsStudent(
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
        eq(users.role, 'parent'),
        eq(users.isActive, true)
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
    logger.warn({ err: error instanceof Error ? error : new Error(String(error)), tenantId, parentUserId, studentId }, '[parent/contact-book] parent_students lookup failed, fallback to guardian phone check')
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

// ─── GET /parent/contact-book ─────────────────────────────────────────────────

contactBookRoutes.get(
  '/',
  zValidator('query', listQuerySchema),
  async (c) => {
    const tenantId = c.get('tenantId')
    const user = c.get('user')
    const { studentId, limit, offset } = c.req.valid('query')

    const studentExists = await verifyParentOwnsStudent(tenantId, user.id, studentId)
    if (!studentExists) {
      return c.json({ success: false, error: 'not_found', message: '找不到該學生' }, 404)
    }

    const entries = await db
      .select({
        id: manageContactBookEntries.id,
        entryDate: manageContactBookEntries.entryDate,
        status: manageContactBookEntries.status,
        groupProgress: manageContactBookEntries.groupProgress,
        groupHomework: manageContactBookEntries.groupHomework,
        individualNote: manageContactBookEntries.individualNote,
        individualHomework: manageContactBookEntries.individualHomework,
        teacherTip: manageContactBookEntries.teacherTip,
        sentAt: manageContactBookEntries.sentAt,
        readAt: manageContactBookEntries.readAt,
        courseId: manageContactBookEntries.courseId,
        courseName: manageCourses.name,
      })
      .from(manageContactBookEntries)
      .leftJoin(manageCourses, eq(manageContactBookEntries.courseId, manageCourses.id))
      .where(
        and(
          eq(manageContactBookEntries.tenantId, tenantId),
          eq(manageContactBookEntries.studentId, studentId),
          inArray(manageContactBookEntries.status, ['sent', 'read'])
        )
      )
      .orderBy(desc(manageContactBookEntries.entryDate))
      .limit(limit)
      .offset(offset)

    // 取各 entry 的成績摘要
    const entryIds = entries.map((e) => e.id)
    const scoresMap: Record<string, { subject: string; score: string }[]> = {}

    if (entryIds.length > 0) {
      const scores = await db
        .select({
          entryId: manageContactBookScores.entryId,
          subject: manageContactBookScores.subject,
          score: manageContactBookScores.score,
        })
        .from(manageContactBookScores)
        .where(inArray(manageContactBookScores.entryId, entryIds))

      for (const s of scores) {
        if (!scoresMap[s.entryId]) scoresMap[s.entryId] = []
        scoresMap[s.entryId].push({ subject: s.subject, score: s.score })
      }
    }

    const data = entries.map((e) => ({
      id: e.id,
      entryDate: e.entryDate,
      status: e.status,
      isRead: e.status === 'read',
      readAt: e.readAt,
      sentAt: e.sentAt,
      courseId: e.courseId,
      courseName: e.courseName ?? null,
      groupProgress: e.groupProgress,
      groupHomework: e.groupHomework,
      individualNote: e.individualNote,
      individualHomework: e.individualHomework,
      teacherTip: e.teacherTip,
      scores: scoresMap[e.id] ?? [],
    }))

    return c.json({ success: true, data })
  }
)

// ─── GET /parent/contact-book/:id ─────────────────────────────────────────────

contactBookRoutes.get('/:id', async (c) => {
  const tenantId = c.get('tenantId')
  const user = c.get('user')
  const { id } = c.req.param()

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
        eq(manageContactBookEntries.id, id),
        eq(manageContactBookEntries.tenantId, tenantId),
        inArray(manageContactBookEntries.status, ['sent', 'read'])
      )
    )
    .limit(1)

  if (!entry) {
    return c.json({ success: false, error: 'not_found', message: '找不到該聯絡簿' }, 404)
  }

  const allowed = await verifyParentOwnsStudent(tenantId, user.id, entry.studentId)
  if (!allowed) {
    return c.json({ success: false, error: 'forbidden', message: '無權查看該學生的聯絡簿' }, 403)
  }

  // 首次查看：更新 readAt 和 status='read'
  if (entry.status === 'sent') {
    await db
      .update(manageContactBookEntries)
      .set({ status: 'read', readAt: new Date() })
      .where(eq(manageContactBookEntries.id, id))
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
      .where(eq(manageContactBookScores.entryId, id)),

    db
      .select({
        id: manageContactBookPhotos.id,
        url: manageContactBookPhotos.url,
        caption: manageContactBookPhotos.caption,
        sortOrder: manageContactBookPhotos.sortOrder,
      })
      .from(manageContactBookPhotos)
      .where(eq(manageContactBookPhotos.entryId, id)),

    db
      .select({
        id: manageContactBookFeedback.id,
        parentUserId: manageContactBookFeedback.parentUserId,
        rating: manageContactBookFeedback.rating,
        comment: manageContactBookFeedback.comment,
        createdAt: manageContactBookFeedback.createdAt,
      })
      .from(manageContactBookFeedback)
      .where(eq(manageContactBookFeedback.entryId, id)),

    db
      .select({
        id: manageContactBookAiAnalysis.id,
        weaknessSummary: manageContactBookAiAnalysis.weaknessSummary,
        recommendedCourseName: manageContactBookAiAnalysis.recommendedCourseName,
        recommendedCourseDesc: manageContactBookAiAnalysis.recommendedCourseDesc,
        createdAt: manageContactBookAiAnalysis.createdAt,
      })
      .from(manageContactBookAiAnalysis)
      .where(eq(manageContactBookAiAnalysis.entryId, id)),
  ])

  return c.json({
    success: true,
    data: {
      ...entry,
      isRead: entry.status === 'read' || entry.status === 'sent', // 已被 'read' 更新
      scores,
      photos,
      feedbacks,
      aiAnalysis: aiAnalysis[0] ?? null,
    },
  })
})

// ─── POST /parent/contact-book/:id/feedback ───────────────────────────────────

contactBookRoutes.post(
  '/:id/feedback',
  zValidator('json', feedbackBodySchema),
  async (c) => {
    const tenantId = c.get('tenantId')
    const user = c.get('user')
    const { id } = c.req.param()
    const { rating, comment } = c.req.valid('json')

    // 確認 entry 存在且屬於該 tenant（且已 sent/read）
    const [entry] = await db
      .select({ id: manageContactBookEntries.id, studentId: manageContactBookEntries.studentId })
      .from(manageContactBookEntries)
      .where(
        and(
          eq(manageContactBookEntries.id, id),
          eq(manageContactBookEntries.tenantId, tenantId),
          inArray(manageContactBookEntries.status, ['sent', 'read'])
        )
      )
      .limit(1)

    if (!entry) {
      return c.json({ success: false, error: 'not_found', message: '找不到該聯絡簿' }, 404)
    }

    const allowed = await verifyParentOwnsStudent(tenantId, user.id, entry.studentId)
    if (!allowed) {
      return c.json({ success: false, error: 'forbidden', message: '無權回覆該學生的聯絡簿' }, 403)
    }

    // 檢查是否已有同一家長對同一 entry 的反饋
    const [existing] = await db
      .select({ id: manageContactBookFeedback.id })
      .from(manageContactBookFeedback)
      .where(
        and(
          eq(manageContactBookFeedback.entryId, id),
          eq(manageContactBookFeedback.parentUserId, user.id)
        )
      )
      .limit(1)

    if (existing) {
      // UPSERT：更新既有反饋
      await db
        .update(manageContactBookFeedback)
        .set({ rating, comment: comment ?? null })
        .where(eq(manageContactBookFeedback.id, existing.id))

      return c.json({ success: true, data: { message: '反饋已更新' } })
    }

    // INSERT 新反饋
    const [created] = await db
      .insert(manageContactBookFeedback)
      .values({
        entryId: id,
        parentUserId: user.id,
        rating,
        comment: comment ?? null,
      })
      .returning({ id: manageContactBookFeedback.id })

    return c.json({ success: true, data: { id: created.id, message: '反饋已提交' } }, 201)
  }
)
