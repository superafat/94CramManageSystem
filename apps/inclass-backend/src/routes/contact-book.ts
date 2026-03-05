/**
 * 電子聯絡簿 Admin/Teacher Routes (inclass-backend)
 * Migrated from manage-backend with inclass_ table references
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { eq, and, sql, inArray, gte, desc, isNotNull, lte } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  inclassContactBookEntries,
  inclassContactBookScores,
  inclassContactBookPhotos,
  inclassContactBookFeedback,
  inclassContactBookAiAnalysis,
  inclassContactBookTemplates,
  manageEnrollments,
  manageStudents,
  manageTeachers,
  manageCourses,
  users,
} from '@94cram/shared/db'
// GoogleGenerativeAI lazy-loaded to avoid heavy import at startup
import { analyzeStudentWeakness } from '../services/ai-analysis.js'
import { uploadContactBookPhoto } from '../services/gcs.js'
import { pushContactBookNotification } from '../services/line-notify.js'
import type { ContactBookSummary } from '../services/line-notify.js'
import { notifyContactBook } from '../services/notify-helper.js'
import { logger } from '../utils/logger.js'
import type { Variables } from '../middleware/auth.js'

const contactBookRoutes = new Hono<{ Variables: Variables }>()

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

function success(c: any, data: any, status: number = 200) {
  return c.json({ success: true, data }, status)
}

function notFound(c: any, message: string) {
  return c.json({ success: false, error: 'not_found', message }, 404)
}

function badRequest(c: any, message: string) {
  return c.json({ success: false, error: 'bad_request', message }, 400)
}

function internalError(c: any, err: unknown) {
  logger.error({ err }, '[ContactBook] Internal error')
  return c.json({ success: false, error: 'internal_error', message: 'Internal server error' }, 500)
}

// ─── GET /entries ─────────────────────────────────────────────────────────────

contactBookRoutes.get(
  '/entries',
  zValidator('query', entriesQuerySchema),
  async (c) => {
    const tenantId = c.get('schoolId')
    const { courseId, date } = c.req.valid('query')

    try {
      // 1. Existing entries for this course + date (join student name)
      const entries = await db
        .select({
          id: inclassContactBookEntries.id,
          studentId: inclassContactBookEntries.studentId,
          studentName: manageStudents.name,
          teacherId: inclassContactBookEntries.teacherId,
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
          updatedAt: inclassContactBookEntries.updatedAt,
        })
        .from(inclassContactBookEntries)
        .leftJoin(manageStudents, eq(inclassContactBookEntries.studentId, manageStudents.id))
        .where(
          and(
            eq(inclassContactBookEntries.tenantId, tenantId),
            eq(inclassContactBookEntries.courseId, courseId),
            eq(inclassContactBookEntries.entryDate, date),
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
          db.select().from(inclassContactBookScores).where(inArray(inclassContactBookScores.entryId, entryIds)),
          db.select().from(inclassContactBookPhotos).where(inArray(inclassContactBookPhotos.entryId, entryIds)),
          db.select().from(inclassContactBookFeedback).where(inArray(inclassContactBookFeedback.entryId, entryIds)),
          db.select().from(inclassContactBookAiAnalysis).where(inArray(inclassContactBookAiAnalysis.entryId, entryIds)),
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

// ─── POST /entries ────────────────────────────────────────────────────────────

contactBookRoutes.post(
  '/entries',
  zValidator('json', createEntryBodySchema),
  async (c) => {
    const tenantId = c.get('schoolId')
    const userId = c.get('userId')
    const body = c.req.valid('json')

    try {
      const teacherId = await getTeacherId(userId, tenantId)

      // Batch mode: studentIds array
      if ('studentIds' in body) {
        const inserted: string[] = []
        for (const studentId of body.studentIds) {
          const [row] = await db
            .insert(inclassContactBookEntries)
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
                inclassContactBookEntries.tenantId,
                inclassContactBookEntries.studentId,
                inclassContactBookEntries.entryDate,
              ],
              set: {
                groupProgress: body.groupProgress ?? null,
                groupHomework: body.groupHomework ?? null,
                updatedAt: sql`now()`,
              },
            })
            .returning({ id: inclassContactBookEntries.id })
          inserted.push(row.id)
        }
        return success(c, { inserted, count: inserted.length }, 201)
      }

      // Single mode
      const [row] = await db
        .insert(inclassContactBookEntries)
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
            inclassContactBookEntries.tenantId,
            inclassContactBookEntries.studentId,
            inclassContactBookEntries.entryDate,
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
        .returning({ id: inclassContactBookEntries.id })

      // Insert scores if provided
      if (body.scores && body.scores.length > 0) {
        await db.delete(inclassContactBookScores).where(eq(inclassContactBookScores.entryId, row.id))
        await db.insert(inclassContactBookScores).values(
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

// ─── GET /entries/:id ─────────────────────────────────────────────────────────

contactBookRoutes.get('/entries/:id', async (c) => {
  const tenantId = c.get('schoolId')
  const idParam = c.req.param('id')

  const parsed = uuidParam.safeParse(idParam)
  if (!parsed.success) return badRequest(c, 'Invalid entry id')

  try {
    const [entry] = await db
      .select()
      .from(inclassContactBookEntries)
      .where(
        and(
          eq(inclassContactBookEntries.id, parsed.data),
          eq(inclassContactBookEntries.tenantId, tenantId),
        )
      )
      .limit(1)

    if (!entry) return notFound(c, 'Entry not found')

    const [scores, photos, feedback, aiAnalysis] = await Promise.all([
      db.select().from(inclassContactBookScores).where(eq(inclassContactBookScores.entryId, entry.id)),
      db.select().from(inclassContactBookPhotos).where(eq(inclassContactBookPhotos.entryId, entry.id)),
      db.select().from(inclassContactBookFeedback).where(eq(inclassContactBookFeedback.entryId, entry.id)),
      db.select().from(inclassContactBookAiAnalysis).where(eq(inclassContactBookAiAnalysis.entryId, entry.id)),
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

// ─── PUT /entries/:id ─────────────────────────────────────────────────────────

contactBookRoutes.put(
  '/entries/:id',
  zValidator('json', updateEntryBodySchema),
  async (c) => {
    const tenantId = c.get('schoolId')
    const idParam = c.req.param('id')

    const parsed = uuidParam.safeParse(idParam)
    if (!parsed.success) return badRequest(c, 'Invalid entry id')

    const body = c.req.valid('json')

    try {
      const [existing] = await db
        .select({ id: inclassContactBookEntries.id, status: inclassContactBookEntries.status })
        .from(inclassContactBookEntries)
        .where(
          and(
            eq(inclassContactBookEntries.id, parsed.data),
            eq(inclassContactBookEntries.tenantId, tenantId),
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
        .update(inclassContactBookEntries)
        .set(updateSet as Parameters<typeof db.update>[0] extends never ? never : any)
        .where(eq(inclassContactBookEntries.id, parsed.data))

      // Upsert scores
      if (body.scores !== undefined) {
        await db.delete(inclassContactBookScores).where(eq(inclassContactBookScores.entryId, parsed.data))
        if (body.scores.length > 0) {
          await db.insert(inclassContactBookScores).values(
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

// ─── POST /entries/:id/send ───────────────────────────────────────────────────

contactBookRoutes.post('/entries/:id/send', async (c) => {
  const tenantId = c.get('schoolId')
  const idParam = c.req.param('id')

  const parsed = uuidParam.safeParse(idParam)
  if (!parsed.success) return badRequest(c, 'Invalid entry id')

  try {
    const [existing] = await db
      .select({
        id: inclassContactBookEntries.id,
        status: inclassContactBookEntries.status,
        studentId: inclassContactBookEntries.studentId,
        courseId: inclassContactBookEntries.courseId,
        entryDate: inclassContactBookEntries.entryDate,
        groupHomework: inclassContactBookEntries.groupHomework,
        individualHomework: inclassContactBookEntries.individualHomework,
        teacherTip: inclassContactBookEntries.teacherTip,
      })
      .from(inclassContactBookEntries)
      .where(
        and(
          eq(inclassContactBookEntries.id, parsed.data),
          eq(inclassContactBookEntries.tenantId, tenantId),
        )
      )
      .limit(1)

    if (!existing) return notFound(c, 'Entry not found')
    if (existing.status === 'sent') return badRequest(c, 'Entry already sent')

    await db
      .update(inclassContactBookEntries)
      .set({ status: 'sent', sentAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(inclassContactBookEntries.id, parsed.data))

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
          .select({ subject: inclassContactBookScores.subject, score: inclassContactBookScores.score })
          .from(inclassContactBookScores)
          .where(eq(inclassContactBookScores.entryId, parsed.data))

        // 4. 取家長 LINE userId
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

// ─── DELETE /entries/:id ──────────────────────────────────────────────────────

contactBookRoutes.delete('/entries/:id', async (c) => {
  const tenantId = c.get('schoolId')
  const idParam = c.req.param('id')

  const parsed = uuidParam.safeParse(idParam)
  if (!parsed.success) return badRequest(c, 'Invalid entry id')

  try {
    const [existing] = await db
      .select({ id: inclassContactBookEntries.id, status: inclassContactBookEntries.status })
      .from(inclassContactBookEntries)
      .where(
        and(
          eq(inclassContactBookEntries.id, parsed.data),
          eq(inclassContactBookEntries.tenantId, tenantId),
        )
      )
      .limit(1)

    if (!existing) return notFound(c, 'Entry not found')
    if (existing.status !== 'draft') return badRequest(c, 'Only draft entries can be deleted')

    await db
      .delete(inclassContactBookEntries)
      .where(eq(inclassContactBookEntries.id, parsed.data))

    return success(c, { deleted: true })
  } catch (err) {
    return internalError(c, err)
  }
})

// ─── POST /templates ──────────────────────────────────────────────────────────

contactBookRoutes.post(
  '/templates',
  zValidator('json', templateBodySchema),
  async (c) => {
    const tenantId = c.get('schoolId')
    const userId = c.get('userId')
    const body = c.req.valid('json')

    try {
      const [row] = await db
        .insert(inclassContactBookTemplates)
        .values({
          tenantId,
          courseId: body.courseId,
          entryDate: body.entryDate,
          groupProgress: body.groupProgress ?? null,
          groupHomework: body.groupHomework ?? null,
          createdBy: userId,
        })
        .onConflictDoUpdate({
          target: [
            inclassContactBookTemplates.tenantId,
            inclassContactBookTemplates.courseId,
            inclassContactBookTemplates.entryDate,
          ],
          set: {
            groupProgress: body.groupProgress ?? null,
            groupHomework: body.groupHomework ?? null,
          },
        })
        .returning({ id: inclassContactBookTemplates.id })

      return success(c, { id: row.id }, 201)
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ─── GET /templates ───────────────────────────────────────────────────────────

contactBookRoutes.get(
  '/templates',
  zValidator('query', templateQuerySchema),
  async (c) => {
    const tenantId = c.get('schoolId')
    const { courseId, date } = c.req.valid('query')

    try {
      const [template] = await db
        .select()
        .from(inclassContactBookTemplates)
        .where(
          and(
            eq(inclassContactBookTemplates.tenantId, tenantId),
            eq(inclassContactBookTemplates.courseId, courseId),
            eq(inclassContactBookTemplates.entryDate, date),
          )
        )
        .limit(1)

      return success(c, { template: template ?? null })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// ─── POST /ai-analysis ───────────────────────────────────────────────────────

const aiAnalysisBodySchema = z.object({
  studentId: z.string().uuid(),
  entryId: z.string().uuid(),
})

contactBookRoutes.post(
  '/ai-analysis',
  zValidator('json', aiAnalysisBodySchema),
  async (c) => {
    const tenantId = c.get('schoolId')
    const { studentId, entryId } = c.req.valid('json')

    try {
      // 1. 驗證 entry 屬於此 tenant
      const [entry] = await db
        .select({ id: inclassContactBookEntries.id })
        .from(inclassContactBookEntries)
        .where(
          and(
            eq(inclassContactBookEntries.id, entryId),
            eq(inclassContactBookEntries.tenantId, tenantId),
            eq(inclassContactBookEntries.studentId, studentId),
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
          subject: inclassContactBookScores.subject,
          score: inclassContactBookScores.score,
          classAvg: inclassContactBookScores.classAvg,
          fullScore: inclassContactBookScores.fullScore,
          date: inclassContactBookEntries.entryDate,
        })
        .from(inclassContactBookScores)
        .innerJoin(
          inclassContactBookEntries,
          eq(inclassContactBookScores.entryId, inclassContactBookEntries.id)
        )
        .where(
          and(
            eq(inclassContactBookEntries.studentId, studentId),
            eq(inclassContactBookEntries.tenantId, tenantId),
            gte(inclassContactBookEntries.entryDate, thirtyDaysAgo.toISOString().split('T')[0])
          )
        )
        .orderBy(desc(inclassContactBookEntries.entryDate))

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
        .delete(inclassContactBookAiAnalysis)
        .where(eq(inclassContactBookAiAnalysis.entryId, entryId))
      await db
        .insert(inclassContactBookAiAnalysis)
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

// ─── POST /ai-writing ────────────────────────────────────────────────────────

const aiWritingBodySchema = z.object({
  keywords: z.string().min(1).max(500),
  studentName: z.string().optional(),
  context: z.string().optional(),
})

contactBookRoutes.post(
  '/ai-writing',
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

      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
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

// ─── POST /upload ─────────────────────────────────────────────────────────────

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MAX_PHOTO_SIZE = 5 * 1024 * 1024 // 5MB

contactBookRoutes.post('/upload', async (c) => {
  const tenantId = c.get('schoolId')

  try {
    const body = await c.req.parseBody()

    const entryId = body['entryId']
    if (typeof entryId !== 'string') return badRequest(c, 'entryId is required')

    const parsedEntry = uuidParam.safeParse(entryId)
    if (!parsedEntry.success) return badRequest(c, 'Invalid entryId')

    // Verify entry belongs to this tenant
    const [entry] = await db
      .select({ id: inclassContactBookEntries.id })
      .from(inclassContactBookEntries)
      .where(
        and(
          eq(inclassContactBookEntries.id, parsedEntry.data),
          eq(inclassContactBookEntries.tenantId, tenantId),
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
      .insert(inclassContactBookPhotos)
      .values({ entryId: parsedEntry.data, url })
      .returning({ id: inclassContactBookPhotos.id, url: inclassContactBookPhotos.url })

    return success(c, { url: photo.url, photoId: photo.id }, 201)
  } catch (err) {
    return internalError(c, err)
  }
})

// ─── DELETE /photos/:photoId ──────────────────────────────────────────────────

contactBookRoutes.delete('/photos/:photoId', async (c) => {
  const tenantId = c.get('schoolId')
  const photoIdParam = c.req.param('photoId')

  const parsedPhoto = uuidParam.safeParse(photoIdParam)
  if (!parsedPhoto.success) return badRequest(c, 'Invalid photoId')

  try {
    // Verify photo's entry belongs to this tenant via join
    const [photo] = await db
      .select({
        id: inclassContactBookPhotos.id,
        entryId: inclassContactBookPhotos.entryId,
      })
      .from(inclassContactBookPhotos)
      .innerJoin(
        inclassContactBookEntries,
        eq(inclassContactBookPhotos.entryId, inclassContactBookEntries.id)
      )
      .where(
        and(
          eq(inclassContactBookPhotos.id, parsedPhoto.data),
          eq(inclassContactBookEntries.tenantId, tenantId),
        )
      )
      .limit(1)

    if (!photo) return notFound(c, 'Photo not found')

    await db
      .delete(inclassContactBookPhotos)
      .where(eq(inclassContactBookPhotos.id, parsedPhoto.data))

    return success(c, { deleted: true })
  } catch (err) {
    return internalError(c, err)
  }
})

// ─── GET /feedback-stats ──────────────────────────────────────────────────────

const feedbackStatsQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM').optional(),
  days: z.coerce.number().int().min(1).max(365).default(30),
})

contactBookRoutes.get(
  '/feedback-stats',
  zValidator('query', feedbackStatsQuerySchema),
  async (c) => {
    const tenantId = c.get('schoolId')
    const { month, days } = c.req.valid('query')

    try {
      // Build date filter conditions
      const dateConditions = [
        eq(inclassContactBookEntries.tenantId, tenantId),
        isNotNull(inclassContactBookFeedback.rating),
      ]

      if (month) {
        // Filter by specific month: YYYY-MM
        const startDate = `${month}-01`
        const [yearStr, monthStr] = month.split('-')
        const nextMonth = new Date(Number(yearStr), Number(monthStr), 1)
        const endDate = nextMonth.toISOString().split('T')[0]
        dateConditions.push(gte(inclassContactBookEntries.entryDate, startDate))
        dateConditions.push(lte(inclassContactBookEntries.entryDate, endDate))
      } else {
        // Filter by recent N days
        const since = new Date()
        since.setDate(since.getDate() - days)
        dateConditions.push(gte(inclassContactBookEntries.entryDate, since.toISOString().split('T')[0]))
      }

      const whereClause = and(...dateConditions)

      // 1. Summary: total count, average rating, rating distribution
      const summaryRows = await db
        .select({
          rating: inclassContactBookFeedback.rating,
          count: sql<number>`count(*)::int`,
        })
        .from(inclassContactBookFeedback)
        .innerJoin(
          inclassContactBookEntries,
          eq(inclassContactBookFeedback.entryId, inclassContactBookEntries.id)
        )
        .where(whereClause)
        .groupBy(inclassContactBookFeedback.rating)

      let totalFeedbacks = 0
      let ratingSum = 0
      const ratingDistribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }

      for (const row of summaryRows) {
        const r = Number(row.rating)
        const cnt = Number(row.count)
        if (row.rating != null) {
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
          courseId: inclassContactBookEntries.courseId,
          courseName: manageCourses.name,
          avgRating: sql<number>`round(avg(${inclassContactBookFeedback.rating})::numeric, 1)::float`,
          count: sql<number>`count(*)::int`,
        })
        .from(inclassContactBookFeedback)
        .innerJoin(
          inclassContactBookEntries,
          eq(inclassContactBookFeedback.entryId, inclassContactBookEntries.id)
        )
        .innerJoin(
          manageCourses,
          eq(inclassContactBookEntries.courseId, manageCourses.id)
        )
        .where(whereClause)
        .groupBy(inclassContactBookEntries.courseId, manageCourses.name)

      // 3. By teacher
      const byTeacher = await db
        .select({
          teacherId: inclassContactBookEntries.teacherId,
          teacherName: manageTeachers.name,
          avgRating: sql<number>`round(avg(${inclassContactBookFeedback.rating})::numeric, 1)::float`,
          count: sql<number>`count(*)::int`,
        })
        .from(inclassContactBookFeedback)
        .innerJoin(
          inclassContactBookEntries,
          eq(inclassContactBookFeedback.entryId, inclassContactBookEntries.id)
        )
        .innerJoin(
          manageTeachers,
          eq(inclassContactBookEntries.teacherId, manageTeachers.id)
        )
        .where(and(...dateConditions, isNotNull(inclassContactBookEntries.teacherId)))
        .groupBy(inclassContactBookEntries.teacherId, manageTeachers.name)

      // 4. Recent feedbacks (last 10 with comments or ratings)
      const recentFeedbacks = await db
        .select({
          id: inclassContactBookFeedback.id,
          studentName: manageStudents.name,
          rating: inclassContactBookFeedback.rating,
          comment: inclassContactBookFeedback.comment,
          date: inclassContactBookFeedback.createdAt,
          courseName: manageCourses.name,
        })
        .from(inclassContactBookFeedback)
        .innerJoin(
          inclassContactBookEntries,
          eq(inclassContactBookFeedback.entryId, inclassContactBookEntries.id)
        )
        .innerJoin(
          manageStudents,
          eq(inclassContactBookEntries.studentId, manageStudents.id)
        )
        .innerJoin(
          manageCourses,
          eq(inclassContactBookEntries.courseId, manageCourses.id)
        )
        .where(whereClause)
        .orderBy(desc(inclassContactBookFeedback.createdAt))
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

export { contactBookRoutes }
