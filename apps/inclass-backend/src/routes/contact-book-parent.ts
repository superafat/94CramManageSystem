/**
 * 家長端聯絡簿 API (inclass-backend)
 * Migrated from manage-backend with inclass_ table references
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  inclassContactBookEntries,
  inclassContactBookScores,
  inclassContactBookPhotos,
  inclassContactBookFeedback,
  inclassContactBookAiAnalysis,
  manageCourses,
  manageStudents,
} from '@94cram/shared/db'
import type { Variables } from '../middleware/auth.js'

const contactBookParentRoutes = new Hono<{ Variables: Variables }>()

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

// ─── Helper: verify parent owns this student (same tenant) ───────────────────

async function verifyStudentInTenant(
  tenantId: string,
  studentId: string
): Promise<boolean> {
  const [student] = await db
    .select({ id: manageStudents.id })
    .from(manageStudents)
    .where(
      and(
        eq(manageStudents.id, studentId),
        eq(manageStudents.tenantId, tenantId)
      )
    )
    .limit(1)
  return !!student
}

// ─── GET / ───────────────────────────────────────────────────────────────────

contactBookParentRoutes.get(
  '/',
  zValidator('query', listQuerySchema),
  async (c) => {
    const tenantId = c.get('schoolId')
    const { studentId, limit, offset } = c.req.valid('query')

    const studentExists = await verifyStudentInTenant(tenantId, studentId)
    if (!studentExists) {
      return c.json({ success: false, error: 'not_found', message: '找不到該學生' }, 404)
    }

    const entries = await db
      .select({
        id: inclassContactBookEntries.id,
        entryDate: inclassContactBookEntries.entryDate,
        status: inclassContactBookEntries.status,
        groupProgress: inclassContactBookEntries.groupProgress,
        groupHomework: inclassContactBookEntries.groupHomework,
        individualNote: inclassContactBookEntries.individualNote,
        individualHomework: inclassContactBookEntries.individualHomework,
        teacherTip: inclassContactBookEntries.teacherTip,
        sentAt: inclassContactBookEntries.sentAt,
        readAt: inclassContactBookEntries.readAt,
        courseId: inclassContactBookEntries.courseId,
        courseName: manageCourses.name,
      })
      .from(inclassContactBookEntries)
      .leftJoin(manageCourses, eq(inclassContactBookEntries.courseId, manageCourses.id))
      .where(
        and(
          eq(inclassContactBookEntries.tenantId, tenantId),
          eq(inclassContactBookEntries.studentId, studentId),
          inArray(inclassContactBookEntries.status, ['sent', 'read'])
        )
      )
      .orderBy(desc(inclassContactBookEntries.entryDate))
      .limit(limit)
      .offset(offset)

    // 取各 entry 的成績摘要
    const entryIds = entries.map((e) => e.id)
    const scoresMap: Record<string, { subject: string; score: string }[]> = {}

    if (entryIds.length > 0) {
      const scores = await db
        .select({
          entryId: inclassContactBookScores.entryId,
          subject: inclassContactBookScores.subject,
          score: inclassContactBookScores.score,
        })
        .from(inclassContactBookScores)
        .where(inArray(inclassContactBookScores.entryId, entryIds))

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

// ─── GET /:id ─────────────────────────────────────────────────────────────────

contactBookParentRoutes.get('/:id', async (c) => {
  const tenantId = c.get('schoolId')
  const { id } = c.req.param()

  const [entry] = await db
    .select({
      id: inclassContactBookEntries.id,
      tenantId: inclassContactBookEntries.tenantId,
      studentId: inclassContactBookEntries.studentId,
      courseId: inclassContactBookEntries.courseId,
      entryDate: inclassContactBookEntries.entryDate,
      status: inclassContactBookEntries.status,
      groupProgress: inclassContactBookEntries.groupProgress,
      groupHomework: inclassContactBookEntries.groupHomework,
      individualNote: inclassContactBookEntries.individualNote,
      individualHomework: inclassContactBookEntries.individualHomework,
      teacherTip: inclassContactBookEntries.teacherTip,
      sentAt: inclassContactBookEntries.sentAt,
      readAt: inclassContactBookEntries.readAt,
      createdAt: inclassContactBookEntries.createdAt,
      courseName: manageCourses.name,
    })
    .from(inclassContactBookEntries)
    .leftJoin(manageCourses, eq(inclassContactBookEntries.courseId, manageCourses.id))
    .where(
      and(
        eq(inclassContactBookEntries.id, id),
        eq(inclassContactBookEntries.tenantId, tenantId),
        inArray(inclassContactBookEntries.status, ['sent', 'read'])
      )
    )
    .limit(1)

  if (!entry) {
    return c.json({ success: false, error: 'not_found', message: '找不到該聯絡簿' }, 404)
  }

  // 首次查看：更新 readAt 和 status='read'
  if (entry.status === 'sent') {
    await db
      .update(inclassContactBookEntries)
      .set({ status: 'read', readAt: new Date() })
      .where(eq(inclassContactBookEntries.id, id))
  }

  // 並行拉取所有子表
  const [scores, photos, feedbacks, aiAnalysis] = await Promise.all([
    db
      .select({
        id: inclassContactBookScores.id,
        subject: inclassContactBookScores.subject,
        score: inclassContactBookScores.score,
        classAvg: inclassContactBookScores.classAvg,
        fullScore: inclassContactBookScores.fullScore,
      })
      .from(inclassContactBookScores)
      .where(eq(inclassContactBookScores.entryId, id)),

    db
      .select({
        id: inclassContactBookPhotos.id,
        url: inclassContactBookPhotos.url,
        caption: inclassContactBookPhotos.caption,
        sortOrder: inclassContactBookPhotos.sortOrder,
      })
      .from(inclassContactBookPhotos)
      .where(eq(inclassContactBookPhotos.entryId, id)),

    db
      .select({
        id: inclassContactBookFeedback.id,
        parentUserId: inclassContactBookFeedback.parentUserId,
        rating: inclassContactBookFeedback.rating,
        comment: inclassContactBookFeedback.comment,
        createdAt: inclassContactBookFeedback.createdAt,
      })
      .from(inclassContactBookFeedback)
      .where(eq(inclassContactBookFeedback.entryId, id)),

    db
      .select({
        id: inclassContactBookAiAnalysis.id,
        weaknessSummary: inclassContactBookAiAnalysis.weaknessSummary,
        recommendedCourseName: inclassContactBookAiAnalysis.recommendedCourseName,
        recommendedCourseDesc: inclassContactBookAiAnalysis.recommendedCourseDesc,
        createdAt: inclassContactBookAiAnalysis.createdAt,
      })
      .from(inclassContactBookAiAnalysis)
      .where(eq(inclassContactBookAiAnalysis.entryId, id)),
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

// ─── POST /:id/feedback ──────────────────────────────────────────────────────

contactBookParentRoutes.post(
  '/:id/feedback',
  zValidator('json', feedbackBodySchema),
  async (c) => {
    const tenantId = c.get('schoolId')
    const userId = c.get('userId')
    const { id } = c.req.param()
    const { rating, comment } = c.req.valid('json')

    // 確認 entry 存在且屬於該 tenant（且已 sent/read）
    const [entry] = await db
      .select({ id: inclassContactBookEntries.id })
      .from(inclassContactBookEntries)
      .where(
        and(
          eq(inclassContactBookEntries.id, id),
          eq(inclassContactBookEntries.tenantId, tenantId),
          inArray(inclassContactBookEntries.status, ['sent', 'read'])
        )
      )
      .limit(1)

    if (!entry) {
      return c.json({ success: false, error: 'not_found', message: '找不到該聯絡簿' }, 404)
    }

    // 檢查是否已有同一家長對同一 entry 的反饋
    const [existing] = await db
      .select({ id: inclassContactBookFeedback.id })
      .from(inclassContactBookFeedback)
      .where(
        and(
          eq(inclassContactBookFeedback.entryId, id),
          eq(inclassContactBookFeedback.parentUserId, userId)
        )
      )
      .limit(1)

    if (existing) {
      // UPSERT：更新既有反饋
      await db
        .update(inclassContactBookFeedback)
        .set({ rating, comment: comment ?? null })
        .where(eq(inclassContactBookFeedback.id, existing.id))

      return c.json({ success: true, data: { message: '反饋已更新' } })
    }

    // INSERT 新反饋
    const [created] = await db
      .insert(inclassContactBookFeedback)
      .values({
        entryId: id,
        parentUserId: userId,
        rating,
        comment: comment ?? null,
      })
      .returning({ id: inclassContactBookFeedback.id })

    return c.json({ success: true, data: { id: created.id, message: '反饋已提交' } }, 201)
  }
)

export { contactBookParentRoutes }
