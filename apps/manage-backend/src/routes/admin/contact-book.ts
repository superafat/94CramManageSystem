/**
 * 電子聯絡簿 Admin Routes
 * CRUD for contact book entries, templates
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { eq, and, sql, inArray, gte, desc, isNotNull, lte } from 'drizzle-orm'
import type { RBACVariables } from '../../middleware/rbac'
import { requirePermission, Permission } from '../../middleware/rbac'
import {
  manageContactBookEntries,
  manageContactBookScores,
  manageContactBookPhotos,
  manageContactBookFeedback,
  manageContactBookAiAnalysis,
  manageContactBookTemplates,
  manageEnrollments,
  manageStudents,
  manageTeachers,
  manageCourses,
} from '@94cram/shared/db'
import { users } from '../../db/schema'
import { db, success, notFound, badRequest, internalError } from './_helpers'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { analyzeStudentWeakness } from '../../services/ai-analysis'
import { uploadContactBookPhoto } from '../../services/gcs'
import { pushContactBookNotification } from '../../services/line-notify'
import type { ContactBookSummary } from '../../services/line-notify'
import { notifyContactBook } from '../../services/notify-helper'
import { logger } from '../../utils/logger'

export const contactBookRoutes = new Hono<{ Variables: RBACVariables }>()

// ─── Validation schemas ───────────────────────────────────────────────────────

const uuidParam = z.string().uuid()

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

const entriesQuerySchema = z.object({
  courseId: z.string().uuid(),
  date: z.string().regex(dateRegex, 'date must be YYYY-MM-DD'),
})

const scoresSchema = z.array(
  z.object({
    subject: z.string().min(1).max(100),
    score: z.number(),
    classAvg: z.number().optional(),
    fullScore: z.number().optional(),
  })
)

const createEntryBatchSchema = z.object({
  courseId: z.string().uuid(),
  entryDate: z.string().regex(dateRegex),
  studentIds: z.array(z.string().uuid()).min(1),
  groupProgress: z.string().optional(),
  groupHomework: z.string().optional(),
})

const createEntrySingleSchema = z.object({
  courseId: z.string().uuid(),
  entryDate: z.string().regex(dateRegex),
  studentId: z.string().uuid(),
  groupProgress: z.string().optional(),
  groupHomework: z.string().optional(),
  individualNote: z.string().optional(),
  individualHomework: z.string().optional(),
  teacherTip: z.string().optional(),
  scores: scoresSchema.optional(),
})

const createEntryBodySchema = z.union([createEntryBatchSchema, createEntrySingleSchema])

const updateEntryBodySchema = z.object({
  groupProgress: z.string().optional(),
  groupHomework: z.string().optional(),
  individualNote: z.string().optional(),
  individualHomework: z.string().optional(),
  teacherTip: z.string().optional(),
  scores: scoresSchema.optional(),
})

const templateBodySchema = z.object({
  courseId: z.string().uuid(),
  entryDate: z.string().regex(dateRegex),
  groupProgress: z.string().optional(),
  groupHomework: z.string().optional(),
})

const templateQuerySchema = z.object({
  courseId: z.string().uuid(),
  date: z.string().regex(dateRegex, 'date must be YYYY-MM-DD'),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getTeacherId(userId: string, tenantId: string): Promise<string | null> {
  const rows = await db
    .select({ id: manageTeachers.id })
    .from(manageTeachers)
    .where(and(eq(manageTeachers.userId, userId), eq(manageTeachers.tenantId, tenantId)))
    .limit(1)
  return rows[0]?.id ?? null
}

// ─── GET /contact-book/entries ────────────────────────────────────────────────

contactBookRoutes.get(
  '/contact-book/entries',
  zValidator('query', entriesQuerySchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const { courseId, date } = c.req.valid('query')

    try {
      // 1. Existing entries for this course + date (join student name)
      const entries = await db
        .select({
          id: manageContactBookEntries.id,
          studentId: manageContactBookEntries.studentId,
          studentName: manageStudents.name,
          teacherId: manageContactBookEntries.teacherId,
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
          updatedAt: manageContactBookEntries.updatedAt,
        })
        .from(manageContactBookEntries)
        .leftJoin(manageStudents, eq(manageContactBookEntries.studentId, manageStudents.id))
        .where(
          and(
            eq(manageContactBookEntries.tenantId, tenantId),
            eq(manageContactBookEntries.courseId, courseId),
            eq(manageContactBookEntries.entryDate, date),
          )
        )

      // 2. All active enrolled students for this course
      const enrolledStudents = await db
        .select({
          studentId: manageEnrollments.studentId,
          studentName: manageStudents.name,
          studentGrade: manageStudents.grade,
        })
        .from(manageEnrollments)
        .leftJoin(manageStudents, eq(manageEnrollments.studentId, manageStudents.id))
        .where(
          and(
            eq(manageEnrollments.tenantId, tenantId),
            eq(manageEnrollments.courseId, courseId),
            eq(manageEnrollments.status, 'active'),
          )
        )

      const entryStudentIds = new Set(entries.map((e) => e.studentId))
      const studentsWithoutEntry = enrolledStudents.filter(
        (s) => !entryStudentIds.has(s.studentId)
      )

      // 3. Load sub-tables for existing entries
      const entryIds = entries.map((e) => e.id)
      let scores: Array<Record<string, unknown>> = []
      let photos: Array<Record<string, unknown>> = []
      let feedback: Array<Record<string, unknown>> = []
      let aiAnalysis: Array<Record<string, unknown>> = []

      if (entryIds.length > 0) {
        ;[scores, photos, feedback, aiAnalysis] = await Promise.all([
          db.select().from(manageContactBookScores).where(inArray(manageContactBookScores.entryId, entryIds)),
          db.select().from(manageContactBookPhotos).where(inArray(manageContactBookPhotos.entryId, entryIds)),
          db.select().from(manageContactBookFeedback).where(inArray(manageContactBookFeedback.entryId, entryIds)),
          db.select().from(manageContactBookAiAnalysis).where(inArray(manageContactBookAiAnalysis.entryId, entryIds)),
        ])
      }

      const enrichedEntries = entries.map((entry) => ({
        ...entry,
        scores: scores.filter((s) => s.entryId === entry.id),
        photos: photos.filter((p) => p.entryId === entry.id),
        feedback: feedback.filter((f) => f.entryId === entry.id),
        aiAnalysis: aiAnalysis.find((a) => a.entryId === entry.id) ?? null,
      }))

      return success(c, { entries: enrichedEntries, studentsWithoutEntry })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ─── POST /contact-book/entries ───────────────────────────────────────────────

contactBookRoutes.post(
  '/contact-book/entries',
  zValidator('json', createEntryBodySchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const body = c.req.valid('json')

    try {
      const teacherId = await getTeacherId(user.id, tenantId)

      // Batch mode: studentIds array
      if ('studentIds' in body) {
        const inserted: string[] = []
        for (const studentId of body.studentIds) {
          const [row] = await db
            .insert(manageContactBookEntries)
            .values({
              tenantId,
              studentId,
              teacherId: teacherId ?? undefined,
              courseId: body.courseId,
              entryDate: body.entryDate,
              status: 'draft',
              groupProgress: body.groupProgress ?? null,
              groupHomework: body.groupHomework ?? null,
            })
            .onConflictDoUpdate({
              target: [
                manageContactBookEntries.tenantId,
                manageContactBookEntries.studentId,
                manageContactBookEntries.entryDate,
              ],
              set: {
                groupProgress: body.groupProgress ?? null,
                groupHomework: body.groupHomework ?? null,
                updatedAt: sql`now()`,
              },
            })
            .returning({ id: manageContactBookEntries.id })
          inserted.push(row.id)
        }
        return success(c, { inserted, count: inserted.length }, 201)
      }

      // Single mode
      const [row] = await db
        .insert(manageContactBookEntries)
        .values({
          tenantId,
          studentId: body.studentId,
          teacherId: teacherId ?? undefined,
          courseId: body.courseId,
          entryDate: body.entryDate,
          status: 'draft',
          groupProgress: body.groupProgress ?? null,
          groupHomework: body.groupHomework ?? null,
          individualNote: body.individualNote ?? null,
          individualHomework: body.individualHomework ?? null,
          teacherTip: body.teacherTip ?? null,
        })
        .onConflictDoUpdate({
          target: [
            manageContactBookEntries.tenantId,
            manageContactBookEntries.studentId,
            manageContactBookEntries.entryDate,
          ],
          set: {
            groupProgress: body.groupProgress ?? null,
            groupHomework: body.groupHomework ?? null,
            individualNote: body.individualNote ?? null,
            individualHomework: body.individualHomework ?? null,
            teacherTip: body.teacherTip ?? null,
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: manageContactBookEntries.id })

      // Insert scores if provided
      if (body.scores && body.scores.length > 0) {
        await db.delete(manageContactBookScores).where(eq(manageContactBookScores.entryId, row.id))
        await db.insert(manageContactBookScores).values(
          body.scores.map((s) => ({
            entryId: row.id,
            subject: s.subject,
            score: String(s.score),
            classAvg: s.classAvg != null ? String(s.classAvg) : null,
            fullScore: s.fullScore != null ? String(s.fullScore) : null,
          }))
        )
      }

      return success(c, { id: row.id }, 201)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ─── GET /contact-book/entries/:id ───────────────────────────────────────────

contactBookRoutes.get('/contact-book/entries/:id', async (c) => {
  const user = c.get('user')
  const tenantId = user.tenant_id
  const idParam = c.req.param('id')

  const parsed = uuidParam.safeParse(idParam)
  if (!parsed.success) return badRequest(c, 'Invalid entry id')

  try {
    const [entry] = await db
      .select()
      .from(manageContactBookEntries)
      .where(
        and(
          eq(manageContactBookEntries.id, parsed.data),
          eq(manageContactBookEntries.tenantId, tenantId),
        )
      )
      .limit(1)

    if (!entry) return notFound(c, 'Entry not found')

    const [scores, photos, feedback, aiAnalysis] = await Promise.all([
      db.select().from(manageContactBookScores).where(eq(manageContactBookScores.entryId, entry.id)),
      db.select().from(manageContactBookPhotos).where(eq(manageContactBookPhotos.entryId, entry.id)),
      db.select().from(manageContactBookFeedback).where(eq(manageContactBookFeedback.entryId, entry.id)),
      db.select().from(manageContactBookAiAnalysis).where(eq(manageContactBookAiAnalysis.entryId, entry.id)),
    ])

    return success(c, {
      ...entry,
      scores,
      photos,
      feedback,
      aiAnalysis: aiAnalysis[0] ?? null,
    })
  } catch (err) {
    return internalError(c, err)
  }
})

// ─── PUT /contact-book/entries/:id ───────────────────────────────────────────

contactBookRoutes.put(
  '/contact-book/entries/:id',
  zValidator('json', updateEntryBodySchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const idParam = c.req.param('id')

    const parsed = uuidParam.safeParse(idParam)
    if (!parsed.success) return badRequest(c, 'Invalid entry id')

    const body = c.req.valid('json')

    try {
      const [existing] = await db
        .select({ id: manageContactBookEntries.id, status: manageContactBookEntries.status })
        .from(manageContactBookEntries)
        .where(
          and(
            eq(manageContactBookEntries.id, parsed.data),
            eq(manageContactBookEntries.tenantId, tenantId),
          )
        )
        .limit(1)

      if (!existing) return notFound(c, 'Entry not found')
      if (existing.status !== 'draft') return badRequest(c, 'Only draft entries can be modified')

      // Build update set (only provided fields)
      const updateSet: Record<string, unknown> = { updatedAt: sql`now()` }
      if (body.groupProgress !== undefined) updateSet.groupProgress = body.groupProgress
      if (body.groupHomework !== undefined) updateSet.groupHomework = body.groupHomework
      if (body.individualNote !== undefined) updateSet.individualNote = body.individualNote
      if (body.individualHomework !== undefined) updateSet.individualHomework = body.individualHomework
      if (body.teacherTip !== undefined) updateSet.teacherTip = body.teacherTip

      await db
        .update(manageContactBookEntries)
        .set(updateSet as Parameters<typeof db.update>[0] extends never ? never : any)
        .where(eq(manageContactBookEntries.id, parsed.data))

      // Upsert scores
      if (body.scores !== undefined) {
        await db.delete(manageContactBookScores).where(eq(manageContactBookScores.entryId, parsed.data))
        if (body.scores.length > 0) {
          await db.insert(manageContactBookScores).values(
            body.scores.map((s) => ({
              entryId: parsed.data,
              subject: s.subject,
              score: String(s.score),
              classAvg: s.classAvg != null ? String(s.classAvg) : null,
              fullScore: s.fullScore != null ? String(s.fullScore) : null,
            }))
          )
        }
      }

      return success(c, { id: parsed.data })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ─── POST /contact-book/entries/:id/send ─────────────────────────────────────

contactBookRoutes.post('/contact-book/entries/:id/send', async (c) => {
  const user = c.get('user')
  const tenantId = user.tenant_id
  const idParam = c.req.param('id')

  const parsed = uuidParam.safeParse(idParam)
  if (!parsed.success) return badRequest(c, 'Invalid entry id')

  try {
    const [existing] = await db
      .select({
        id: manageContactBookEntries.id,
        status: manageContactBookEntries.status,
        studentId: manageContactBookEntries.studentId,
        courseId: manageContactBookEntries.courseId,
        entryDate: manageContactBookEntries.entryDate,
        groupHomework: manageContactBookEntries.groupHomework,
        individualHomework: manageContactBookEntries.individualHomework,
        teacherTip: manageContactBookEntries.teacherTip,
      })
      .from(manageContactBookEntries)
      .where(
        and(
          eq(manageContactBookEntries.id, parsed.data),
          eq(manageContactBookEntries.tenantId, tenantId),
        )
      )
      .limit(1)

    if (!existing) return notFound(c, 'Entry not found')
    if (existing.status === 'sent') return badRequest(c, 'Entry already sent')

    await db
      .update(manageContactBookEntries)
      .set({ status: 'sent', sentAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(manageContactBookEntries.id, parsed.data))

    // 非同步推送 LINE 通知（失敗不影響 send 成功）
    void (async () => {
      try {
        // 1. 取學生名稱
        const [student] = await db
          .select({ name: manageStudents.name })
          .from(manageStudents)
          .where(and(eq(manageStudents.id, existing.studentId), eq(manageStudents.tenantId, tenantId)))
          .limit(1)

        // 2. 取課程名稱
        const [course] = await db
          .select({ name: manageCourses.name })
          .from(manageCourses)
          .where(eq(manageCourses.id, existing.courseId))
          .limit(1)

        // 3. 取成績
        const scores = await db
          .select({ subject: manageContactBookScores.subject, score: manageContactBookScores.score })
          .from(manageContactBookScores)
          .where(eq(manageContactBookScores.entryId, parsed.data))

        // 4. 取家長 LINE userId
        // TODO: manage 系統目前學生表無直接綁定家長 userId。
        // 若有需求可在 manage_students 增加 parent_user_id 欄位，
        // 或透過 guardian_phone 比對 users 表的 phone + role='parent' 找到 lineUserId。
        // 目前以 guardian_phone 末 4 碼比對嘗試找對應的家長帳號。
        let lineUserId: string | null = null
        if (student) {
          const [studentFull] = await db
            .select({ guardianPhone: manageStudents.guardianPhone })
            .from(manageStudents)
            .where(and(eq(manageStudents.id, existing.studentId), eq(manageStudents.tenantId, tenantId)))
            .limit(1)

          if (studentFull?.guardianPhone) {
            const [parentUser] = await db
              .select({ lineUserId: users.lineUserId })
              .from(users)
              .where(
                and(
                  eq(users.tenantId, tenantId),
                  eq(users.role, 'parent'),
                  sql`${users.phone} = ${studentFull.guardianPhone}`,
                  sql`${users.lineUserId} IS NOT NULL`,
                )
              )
              .limit(1)
            lineUserId = parentUser?.lineUserId ?? null
          }
        }

        if (lineUserId && student) {
          const homework = existing.individualHomework ?? existing.groupHomework ?? null
          const summary: ContactBookSummary = {
            studentName: student.name,
            entryDate: existing.entryDate,
            courseName: course?.name ?? '課程',
            scores,
            homework,
            teacherTip: existing.teacherTip ?? null,
            entryId: parsed.data,
          }
          await pushContactBookNotification(lineUserId, summary)
        }

        // Also send via Telegram (unified helper covers all channels)
        if (student) {
          await notifyContactBook(tenantId, existing.studentId, student?.name ?? '', existing.entryDate, parsed.data)
        }
      } catch (pushErr) {
        // LINE 推送失敗不影響主流程
        logger.warn({ err: pushErr }, '[ContactBook/send] LINE push error')
      }
    })()

    return success(c, { id: parsed.data, status: 'sent' })
  } catch (err) {
    return internalError(c, err)
  }
})

// ─── DELETE /contact-book/entries/:id ────────────────────────────────────────

contactBookRoutes.delete('/contact-book/entries/:id', async (c) => {
  const user = c.get('user')
  const tenantId = user.tenant_id
  const idParam = c.req.param('id')

  const parsed = uuidParam.safeParse(idParam)
  if (!parsed.success) return badRequest(c, 'Invalid entry id')

  try {
    const [existing] = await db
      .select({ id: manageContactBookEntries.id, status: manageContactBookEntries.status })
      .from(manageContactBookEntries)
      .where(
        and(
          eq(manageContactBookEntries.id, parsed.data),
          eq(manageContactBookEntries.tenantId, tenantId),
        )
      )
      .limit(1)

    if (!existing) return notFound(c, 'Entry not found')
    if (existing.status !== 'draft') return badRequest(c, 'Only draft entries can be deleted')

    await db
      .delete(manageContactBookEntries)
      .where(eq(manageContactBookEntries.id, parsed.data))

    return success(c, { deleted: true })
  } catch (err) {
    return internalError(c, err)
  }
})

// ─── POST /contact-book/templates ────────────────────────────────────────────

contactBookRoutes.post(
  '/contact-book/templates',
  zValidator('json', templateBodySchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const body = c.req.valid('json')

    try {
      const [row] = await db
        .insert(manageContactBookTemplates)
        .values({
          tenantId,
          courseId: body.courseId,
          entryDate: body.entryDate,
          groupProgress: body.groupProgress ?? null,
          groupHomework: body.groupHomework ?? null,
          createdBy: user.id,
        })
        .onConflictDoUpdate({
          target: [
            manageContactBookTemplates.tenantId,
            manageContactBookTemplates.courseId,
            manageContactBookTemplates.entryDate,
          ],
          set: {
            groupProgress: body.groupProgress ?? null,
            groupHomework: body.groupHomework ?? null,
          },
        })
        .returning({ id: manageContactBookTemplates.id })

      return success(c, { id: row.id }, 201)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ─── GET /contact-book/templates ─────────────────────────────────────────────

contactBookRoutes.get(
  '/contact-book/templates',
  zValidator('query', templateQuerySchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const { courseId, date } = c.req.valid('query')

    try {
      const [template] = await db
        .select()
        .from(manageContactBookTemplates)
        .where(
          and(
            eq(manageContactBookTemplates.tenantId, tenantId),
            eq(manageContactBookTemplates.courseId, courseId),
            eq(manageContactBookTemplates.entryDate, date),
          )
        )
        .limit(1)

      return success(c, { template: template ?? null })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ─── POST /contact-book/ai-analysis ──────────────────────────────────────────

const aiAnalysisBodySchema = z.object({
  studentId: z.string().uuid(),
  entryId: z.string().uuid(),
})

contactBookRoutes.post(
  '/contact-book/ai-analysis',
  zValidator('json', aiAnalysisBodySchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const { studentId, entryId } = c.req.valid('json')

    try {
      // 1. 驗證 entry 屬於此 tenant
      const [entry] = await db
        .select({ id: manageContactBookEntries.id })
        .from(manageContactBookEntries)
        .where(
          and(
            eq(manageContactBookEntries.id, entryId),
            eq(manageContactBookEntries.tenantId, tenantId),
            eq(manageContactBookEntries.studentId, studentId),
          )
        )
        .limit(1)

      if (!entry) return notFound(c, 'Entry not found')

      // 2. 撈取學生姓名
      const [student] = await db
        .select({ name: manageStudents.name })
        .from(manageStudents)
        .where(
          and(
            eq(manageStudents.id, studentId),
            eq(manageStudents.tenantId, tenantId),
          )
        )
        .limit(1)

      const studentName = student?.name ?? '學生'

      // 3. 撈取近 30 天成績
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const scores = await db
        .select({
          subject: manageContactBookScores.subject,
          score: manageContactBookScores.score,
          classAvg: manageContactBookScores.classAvg,
          fullScore: manageContactBookScores.fullScore,
          date: manageContactBookEntries.entryDate,
        })
        .from(manageContactBookScores)
        .innerJoin(
          manageContactBookEntries,
          eq(manageContactBookScores.entryId, manageContactBookEntries.id)
        )
        .where(
          and(
            eq(manageContactBookEntries.studentId, studentId),
            eq(manageContactBookEntries.tenantId, tenantId),
            gte(manageContactBookEntries.entryDate, thirtyDaysAgo.toISOString().split('T')[0])
          )
        )
        .orderBy(desc(manageContactBookEntries.entryDate))

      // 4. 呼叫 AI 分析（失敗時使用 fallback）
      let analysisResult: { weaknessSummary: string; recommendedCourseName: string; recommendedCourseDesc: string }
      try {
        analysisResult = await analyzeStudentWeakness(studentName, scores)
      } catch {
        analysisResult = {
          weaknessSummary: '暫無分析',
          recommendedCourseName: '基礎加強班',
          recommendedCourseDesc: '建議加強基礎訓練',
        }
      }

      // 5. Upsert 分析結果（同一 entryId 只存一筆：先刪後插）
      await db
        .delete(manageContactBookAiAnalysis)
        .where(eq(manageContactBookAiAnalysis.entryId, entryId))
      await db
        .insert(manageContactBookAiAnalysis)
        .values({
          entryId,
          weaknessSummary: analysisResult.weaknessSummary,
          recommendedCourseName: analysisResult.recommendedCourseName,
          recommendedCourseDesc: analysisResult.recommendedCourseDesc,
        })

      // 6. 回傳分析結果
      return success(c, analysisResult)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ─── POST /contact-book/ai-writing ──────────────────────────────────────────

const aiWritingBodySchema = z.object({
  keywords: z.string().min(1).max(500),
  studentName: z.string().optional(),
  context: z.string().optional(),
})

contactBookRoutes.post(
  '/contact-book/ai-writing',
  zValidator('json', aiWritingBodySchema),
  async (c) => {
    const { keywords, studentName, context: extraContext } = c.req.valid('json')

    try {
      // 若無 GEMINI_API_KEY，回傳預設模板文字（demo mode）
      if (!process.env.GEMINI_API_KEY) {
        const fallbackName = studentName ? `${studentName}同學` : '同學'
        const fallbackText = `${fallbackName}在課堂上表現認真，學習態度良好。根據「${keywords}」的觀察，建議在相關方面持續加強練習。老師相信只要保持努力，一定會有更好的表現！`
        return success(c, { text: fallbackText, keywords })
      }

      const prompt = `你是一位經驗豐富的補習班老師，正在撰寫給家長的聯絡簿。
請根據以下關鍵字，生成一段專業、溫暖的家長對話文字。

要求：
- 語氣親切但專業
- 正體中文
- 200字以內
- 先肯定學生的優點，再提出需要改進的地方
- 結尾給予鼓勵

${studentName ? `學生姓名：${studentName}` : ''}
${extraContext ? `背景資訊：${extraContext}` : ''}
關鍵字：${keywords}`

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })
      const result = await model.generateContent(prompt)
      const text = result.response.text().trim()

      return success(c, { text, keywords })
    } catch (err) {
      logger.error({ err }, '[ContactBook/ai-writing] Gemini API error')
      // Gemini 失敗時回傳 500 + fallback 提示
      return c.json(
        {
          success: false,
          error: 'AI 助寫服務暫時無法使用，請稍後再試或手動輸入。',
        },
        500
      )
    }
  }
)

// ─── POST /contact-book/upload ────────────────────────────────────────────────

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MAX_PHOTO_SIZE = 5 * 1024 * 1024 // 5MB

contactBookRoutes.post('/contact-book/upload', async (c) => {
  const user = c.get('user')
  const tenantId = user.tenant_id

  try {
    const body = await c.req.parseBody()

    const entryId = body['entryId']
    if (typeof entryId !== 'string') return badRequest(c, 'entryId is required')

    const parsedEntry = uuidParam.safeParse(entryId)
    if (!parsedEntry.success) return badRequest(c, 'Invalid entryId')

    // Verify entry belongs to this tenant
    const [entry] = await db
      .select({ id: manageContactBookEntries.id })
      .from(manageContactBookEntries)
      .where(
        and(
          eq(manageContactBookEntries.id, parsedEntry.data),
          eq(manageContactBookEntries.tenantId, tenantId),
        )
      )
      .limit(1)

    if (!entry) return notFound(c, 'Entry not found')

    const file = body['file']
    if (!(file instanceof File)) return badRequest(c, 'file is required')

    const contentType = file.type
    if (!(ALLOWED_PHOTO_TYPES as readonly string[]).includes(contentType)) {
      return badRequest(c, `Invalid file type. Allowed: ${ALLOWED_PHOTO_TYPES.join(', ')}`)
    }

    if (file.size > MAX_PHOTO_SIZE) {
      return badRequest(c, 'File size exceeds 5MB limit')
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const url = await uploadContactBookPhoto(buffer, file.name, contentType)

    const [photo] = await db
      .insert(manageContactBookPhotos)
      .values({ entryId: parsedEntry.data, url })
      .returning({ id: manageContactBookPhotos.id, url: manageContactBookPhotos.url })

    return success(c, { url: photo.url, photoId: photo.id }, 201)
  } catch (err) {
    return internalError(c, err)
  }
})

// ─── DELETE /contact-book/photos/:photoId ─────────────────────────────────────

contactBookRoutes.delete('/contact-book/photos/:photoId', async (c) => {
  const user = c.get('user')
  const tenantId = user.tenant_id
  const photoIdParam = c.req.param('photoId')

  const parsedPhoto = uuidParam.safeParse(photoIdParam)
  if (!parsedPhoto.success) return badRequest(c, 'Invalid photoId')

  try {
    // Verify photo's entry belongs to this tenant via join
    const [photo] = await db
      .select({
        id: manageContactBookPhotos.id,
        entryId: manageContactBookPhotos.entryId,
      })
      .from(manageContactBookPhotos)
      .innerJoin(
        manageContactBookEntries,
        eq(manageContactBookPhotos.entryId, manageContactBookEntries.id)
      )
      .where(
        and(
          eq(manageContactBookPhotos.id, parsedPhoto.data),
          eq(manageContactBookEntries.tenantId, tenantId),
        )
      )
      .limit(1)

    if (!photo) return notFound(c, 'Photo not found')

    await db
      .delete(manageContactBookPhotos)
      .where(eq(manageContactBookPhotos.id, parsedPhoto.data))

    return success(c, { deleted: true })
  } catch (err) {
    return internalError(c, err)
  }
})

// ─── GET /contact-book/feedback-stats ────────────────────────────────────────

const feedbackStatsQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM').optional(),
  days: z.coerce.number().int().min(1).max(365).default(30),
})

contactBookRoutes.get(
  '/contact-book/feedback-stats',
  requirePermission(Permission.REPORTS_READ),
  zValidator('query', feedbackStatsQuerySchema),
  async (c) => {
    const user = c.get('user')
    const tenantId = user.tenant_id
    const { month, days } = c.req.valid('query')

    try {
      // Build date filter conditions
      const dateConditions = [
        eq(manageContactBookEntries.tenantId, tenantId),
        isNotNull(manageContactBookFeedback.rating),
      ]

      if (month) {
        // Filter by specific month: YYYY-MM
        const startDate = `${month}-01`
        const [yearStr, monthStr] = month.split('-')
        const nextMonth = new Date(Number(yearStr), Number(monthStr), 1) // month is 1-indexed here, Date uses 0-indexed but we pass the next month
        const endDate = nextMonth.toISOString().split('T')[0]
        dateConditions.push(gte(manageContactBookEntries.entryDate, startDate))
        dateConditions.push(lte(manageContactBookEntries.entryDate, endDate))
      } else {
        // Filter by recent N days
        const since = new Date()
        since.setDate(since.getDate() - days)
        dateConditions.push(gte(manageContactBookEntries.entryDate, since.toISOString().split('T')[0]))
      }

      const whereClause = and(...dateConditions)

      // 1. Summary: total count, average rating, rating distribution
      const summaryRows = await db
        .select({
          rating: manageContactBookFeedback.rating,
          count: sql<number>`count(*)::int`,
        })
        .from(manageContactBookFeedback)
        .innerJoin(
          manageContactBookEntries,
          eq(manageContactBookFeedback.entryId, manageContactBookEntries.id)
        )
        .where(whereClause)
        .groupBy(manageContactBookFeedback.rating)

      let totalFeedbacks = 0
      let ratingSum = 0
      const ratingDistribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }

      for (const row of summaryRows) {
        const r = row.rating
        const cnt = row.count
        if (r != null) {
          totalFeedbacks += cnt
          ratingSum += r * cnt
          ratingDistribution[String(r)] = cnt
        }
      }

      const averageRating = totalFeedbacks > 0
        ? Math.round((ratingSum / totalFeedbacks) * 10) / 10
        : 0

      // 2. By course
      const byCourse = await db
        .select({
          courseId: manageContactBookEntries.courseId,
          courseName: manageCourses.name,
          avgRating: sql<number>`round(avg(${manageContactBookFeedback.rating})::numeric, 1)::float`,
          count: sql<number>`count(*)::int`,
        })
        .from(manageContactBookFeedback)
        .innerJoin(
          manageContactBookEntries,
          eq(manageContactBookFeedback.entryId, manageContactBookEntries.id)
        )
        .innerJoin(
          manageCourses,
          eq(manageContactBookEntries.courseId, manageCourses.id)
        )
        .where(whereClause)
        .groupBy(manageContactBookEntries.courseId, manageCourses.name)

      // 3. By teacher
      const byTeacher = await db
        .select({
          teacherId: manageContactBookEntries.teacherId,
          teacherName: manageTeachers.name,
          avgRating: sql<number>`round(avg(${manageContactBookFeedback.rating})::numeric, 1)::float`,
          count: sql<number>`count(*)::int`,
        })
        .from(manageContactBookFeedback)
        .innerJoin(
          manageContactBookEntries,
          eq(manageContactBookFeedback.entryId, manageContactBookEntries.id)
        )
        .innerJoin(
          manageTeachers,
          eq(manageContactBookEntries.teacherId, manageTeachers.id)
        )
        .where(and(...dateConditions, isNotNull(manageContactBookEntries.teacherId)))
        .groupBy(manageContactBookEntries.teacherId, manageTeachers.name)

      // 4. Recent feedbacks (last 10 with comments or ratings)
      const recentFeedbacks = await db
        .select({
          id: manageContactBookFeedback.id,
          studentName: manageStudents.name,
          rating: manageContactBookFeedback.rating,
          comment: manageContactBookFeedback.comment,
          date: manageContactBookFeedback.createdAt,
          courseName: manageCourses.name,
        })
        .from(manageContactBookFeedback)
        .innerJoin(
          manageContactBookEntries,
          eq(manageContactBookFeedback.entryId, manageContactBookEntries.id)
        )
        .innerJoin(
          manageStudents,
          eq(manageContactBookEntries.studentId, manageStudents.id)
        )
        .innerJoin(
          manageCourses,
          eq(manageContactBookEntries.courseId, manageCourses.id)
        )
        .where(whereClause)
        .orderBy(desc(manageContactBookFeedback.createdAt))
        .limit(10)

      return success(c, {
        summary: {
          totalFeedbacks,
          averageRating,
          ratingDistribution,
        },
        byCourse,
        byTeacher,
        recentFeedbacks: recentFeedbacks.map((f) => ({
          id: f.id,
          studentName: f.studentName,
          rating: f.rating,
          comment: f.comment,
          date: f.date ? (f.date instanceof Date ? f.date.toISOString().split('T')[0] : String(f.date)) : null,
          courseName: f.courseName,
        })),
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)
