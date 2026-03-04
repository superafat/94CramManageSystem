/**
 * 電子聯絡簿 Admin Routes
 * CRUD for contact book entries, templates
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { eq, and, sql, inArray, gte, desc } from 'drizzle-orm'
import type { RBACVariables } from '../../middleware/rbac'
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
import { analyzeStudentWeakness } from '../../services/ai-analysis'
import { uploadContactBookPhoto } from '../../services/gcs'
import { pushContactBookNotification } from '../../services/line-notify'
import type { ContactBookSummary } from '../../services/line-notify'
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
      // 1. Existing entries for this course + date
      const entries = await db
        .select({
          id: manageContactBookEntries.id,
          studentId: manageContactBookEntries.studentId,
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
