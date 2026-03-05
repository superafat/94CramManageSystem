import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db/index.js'
import { inclassExams, inclassExamScores, manageCourses, manageStudents } from '@94cram/shared/db'
import { and, eq, gte, lte, desc, inArray } from 'drizzle-orm'
import type { Variables } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

const examsRouter = new Hono<{ Variables: Variables }>()

const examSchema = z.object({
  classId: z.string().uuid(),
  name: z.string().min(1).max(100),
  subject: z.string().min(1).max(50),
  maxScore: z.number().int().min(1).max(1000).default(100),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

const scoreSchema = z.object({
  studentId: z.string().uuid(),
  score: z.number().min(0),
})

const examIdParamSchema = z.object({ examId: z.string().uuid('Invalid exam ID format') })
const studentIdParamSchema = z.object({ studentId: z.string().uuid('Invalid student ID format') })
const requireSchoolId = (schoolId: string | undefined) => (typeof schoolId === 'string' && schoolId.trim() ? schoolId : null)
const ok = <T>(data: T) => ({ success: true, data, error: null } as const)
const fail = (error: string, data: unknown = null) => ({ success: false, data, error } as const)

examsRouter.get('/', async (c) => {
  try {
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json(fail('Unauthorized'), 401)

    const schoolExams = await db.select().from(inclassExams).where(eq(inclassExams.tenantId, schoolId)).limit(500)
    return c.json(ok({
      exams: schoolExams.map((exam) => ({
        id: exam.id,
        classId: exam.courseId,
        name: exam.name,
        subject: null,
        maxScore: exam.totalScore,
        examDate: exam.examDate,
        createdAt: exam.createdAt,
      }))
    }))
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Error fetching exams`)
    return c.json(fail('Failed to fetch exams'), 500)
  }
})

examsRouter.post('/', zValidator('json', examSchema), async (c) => {
  try {
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json(fail('Unauthorized'), 401)
    const body = c.req.valid('json')

    const [course] = await db.select().from(manageCourses).where(and(eq(manageCourses.id, body.classId), eq(manageCourses.tenantId, schoolId)))
    if (!course) return c.json(fail('Class not found'), 404)

    const [newExam] = await db.insert(inclassExams).values({
      tenantId: schoolId,
      courseId: body.classId,
      name: body.name,
      examDate: new Date(`${body.examDate}T00:00:00.000Z`),
      totalScore: body.maxScore,
    }).returning()

    return c.json(ok({ exam: newExam }), 201)
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Create exam error`)
    return c.json(fail('Failed to create exam'), 500)
  }
})

examsRouter.get('/:examId/scores', zValidator('param', examIdParamSchema), async (c) => {
  try {
    const { examId } = c.req.valid('param')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json(fail('Unauthorized'), 401)

    const [exam] = await db.select().from(inclassExams).where(and(eq(inclassExams.id, examId), eq(inclassExams.tenantId, schoolId)))
    if (!exam) return c.json(fail('Exam not found'), 404)

    const scores = await db.select().from(inclassExamScores).where(eq(inclassExamScores.examId, examId))
    const sortedScores = [...scores].sort((a, b) => b.score - a.score)
    const values = scores.map(s => s.score)
    const average = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0

    return c.json(ok({
      exam,
      scores: sortedScores,
      stats: { average, highest: values.length ? Math.max(...values) : 0, lowest: values.length ? Math.min(...values) : 0, total: values.length }
    }))
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Get exam scores error`)
    return c.json(fail('Failed to get scores'), 500)
  }
})

examsRouter.post('/:examId/scores', zValidator('param', examIdParamSchema), zValidator('json', scoreSchema), async (c) => {
  try {
    const { examId } = c.req.valid('param')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json(fail('Unauthorized'), 401)
    const body = c.req.valid('json')

    const [exam] = await db.select().from(inclassExams).where(and(eq(inclassExams.id, examId), eq(inclassExams.tenantId, schoolId)))
    if (!exam) return c.json(fail('Exam not found'), 404)

    const [student] = await db.select().from(manageStudents).where(and(eq(manageStudents.id, body.studentId), eq(manageStudents.tenantId, schoolId)))
    if (!student) return c.json(fail('Student not found'), 404)
    if (body.score > (exam.totalScore ?? 100)) return c.json(fail(`Score cannot exceed maximum score of ${exam.totalScore ?? 100}`), 400)

    const [existing] = await db.select().from(inclassExamScores).where(and(eq(inclassExamScores.examId, examId), eq(inclassExamScores.studentId, body.studentId)))
    if (existing) {
      const [updated] = await db.update(inclassExamScores).set({ score: body.score }).where(eq(inclassExamScores.id, existing.id)).returning()
      return c.json(ok({ score: updated }))
    }

    const [newScore] = await db.insert(inclassExamScores).values({ examId, studentId: body.studentId, score: body.score }).returning()
    return c.json(ok({ score: newScore }), 201)
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Add score error`)
    return c.json(fail('Failed to add score'), 500)
  }
})

examsRouter.get('/scores/:studentId', zValidator('param', studentIdParamSchema), async (c) => {
  try {
    const { studentId } = c.req.valid('param')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json(fail('Unauthorized'), 401)
    const [student] = await db.select().from(manageStudents).where(and(eq(manageStudents.id, studentId), eq(manageStudents.tenantId, schoolId)))
    if (!student) return c.json(fail('Student not found'), 404)

    const scores = await db.select().from(inclassExamScores).where(eq(inclassExamScores.studentId, studentId))
    return c.json(ok({ scores }))
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Error fetching student scores`)
    return c.json(fail('Failed to fetch scores'), 500)
  }
})

// --- New endpoints ---

const studentGradesQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

const batchGradeRecordSchema = z.object({
  studentId: z.string().uuid(),
  score: z.number().min(0),
  note: z.string().optional(),
})

const batchGradesBodySchema = z.object({
  examId: z.string().uuid(),
  records: z.array(batchGradeRecordSchema).min(1),
})

const statsQuerySchema = z.object({
  courseId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

function toLetterGrade(percentage: number): string {
  if (percentage >= 90) return 'A'
  if (percentage >= 80) return 'B'
  if (percentage >= 70) return 'C'
  if (percentage >= 60) return 'D'
  return 'F'
}

// GET /exams/student-grades/:studentId
examsRouter.get('/student-grades/:studentId', zValidator('param', studentIdParamSchema), zValidator('query', studentGradesQuerySchema), async (c) => {
  try {
    const { studentId } = c.req.valid('param')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json(fail('Unauthorized'), 401)
    const query = c.req.valid('query')

    const [student] = await db.select().from(manageStudents).where(and(eq(manageStudents.id, studentId), eq(manageStudents.tenantId, schoolId)))
    if (!student) return c.json(fail('Student not found'), 404)

    // Fetch all exams for this tenant, optionally filtered by date
    let examConditions = [eq(inclassExams.tenantId, schoolId)]
    if (query.from) examConditions.push(gte(inclassExams.examDate, new Date(`${query.from}T00:00:00.000Z`)))
    if (query.to) examConditions.push(lte(inclassExams.examDate, new Date(`${query.to}T23:59:59.999Z`)))

    const tenantExams = await db.select().from(inclassExams).where(and(...examConditions))

    if (tenantExams.length === 0) {
      return c.json(ok({ grades: [] }))
    }

    const examIds = tenantExams.map(e => e.id)
    const scores = await db.select().from(inclassExamScores).where(
      and(
        inArray(inclassExamScores.examId, examIds),
        eq(inclassExamScores.studentId, studentId)
      )
    )

    const examMap = new Map(tenantExams.map(e => [e.id, e]))

    const grades = scores.map(s => {
      const exam = examMap.get(s.examId)!
      const totalScore = exam.totalScore ?? 100
      const percentage = Math.round((s.score / totalScore) * 1000) / 10
      const letterGrade = toLetterGrade(percentage)
      const passed = percentage >= 60
      return {
        scoreId: s.id,
        examId: s.examId,
        examName: exam.name,
        examDate: exam.examDate,
        courseId: exam.courseId,
        score: s.score,
        totalScore,
        percentage,
        letterGrade,
        passed,
        note: s.note,
        createdAt: s.createdAt,
      }
    }).sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime())

    return c.json(ok({ grades }))
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Error fetching student grade history`)
    return c.json(fail('Failed to fetch student grades'), 500)
  }
})

// POST /exams/grades/batch
examsRouter.post('/grades/batch', zValidator('json', batchGradesBodySchema), async (c) => {
  try {
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json(fail('Unauthorized'), 401)
    const body = c.req.valid('json')

    const [exam] = await db.select().from(inclassExams).where(and(eq(inclassExams.id, body.examId), eq(inclassExams.tenantId, schoolId)))
    if (!exam) return c.json(fail('Exam not found'), 404)

    let inserted = 0
    let updated = 0

    for (const rec of body.records) {
      if (rec.score > (exam.totalScore ?? 100)) {
        return c.json(fail(`Score ${rec.score} for student ${rec.studentId} exceeds maximum score of ${exam.totalScore ?? 100}`), 400)
      }

      const [existing] = await db.select().from(inclassExamScores).where(
        and(eq(inclassExamScores.examId, body.examId), eq(inclassExamScores.studentId, rec.studentId))
      )

      if (existing) {
        await db.update(inclassExamScores)
          .set({ score: rec.score, note: rec.note ?? existing.note })
          .where(eq(inclassExamScores.id, existing.id))
        updated++
      } else {
        await db.insert(inclassExamScores).values({
          examId: body.examId,
          studentId: rec.studentId,
          score: rec.score,
          note: rec.note,
        })
        inserted++
      }
    }

    return c.json(ok({ inserted, updated, total: inserted + updated }), 201)
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Batch grades error`)
    return c.json(fail('Failed to batch insert/update grades'), 500)
  }
})

// GET /exams/stats
examsRouter.get('/stats', zValidator('query', statsQuerySchema), async (c) => {
  try {
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json(fail('Unauthorized'), 401)
    const query = c.req.valid('query')

    let examConditions = [eq(inclassExams.tenantId, schoolId)]
    if (query.courseId) examConditions.push(eq(inclassExams.courseId, query.courseId))
    if (query.from) examConditions.push(gte(inclassExams.examDate, new Date(`${query.from}T00:00:00.000Z`)))
    if (query.to) examConditions.push(lte(inclassExams.examDate, new Date(`${query.to}T23:59:59.999Z`)))

    const tenantExams = await db.select().from(inclassExams).where(and(...examConditions))
    const totalExams = tenantExams.length

    if (totalExams === 0) {
      return c.json(ok({
        totalExams: 0,
        averageScorePercentage: null,
        passRate: null,
        topPerformers: [],
      }))
    }

    const examIds = tenantExams.map(e => e.id)
    const allScores = await db.select().from(inclassExamScores).where(
      inArray(inclassExamScores.examId, examIds)
    )

    const examMap = new Map(tenantExams.map(e => [e.id, e]))

    const percentages = allScores.map(s => {
      const exam = examMap.get(s.examId)!
      const totalScore = exam.totalScore ?? 100
      return (s.score / totalScore) * 100
    })

    const averageScorePercentage = percentages.length
      ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length * 10) / 10
      : null

    const passRate = percentages.length
      ? Math.round(percentages.filter(p => p >= 60).length / percentages.length * 1000) / 10
      : null

    // Top performers: studentId -> array of percentages, compute average
    const studentPercentages = new Map<string, number[]>()
    for (const s of allScores) {
      const exam = examMap.get(s.examId)!
      const totalScore = exam.totalScore ?? 100
      const pct = (s.score / totalScore) * 100
      if (!studentPercentages.has(s.studentId)) studentPercentages.set(s.studentId, [])
      studentPercentages.get(s.studentId)!.push(pct)
    }

    const topPerformers = Array.from(studentPercentages.entries())
      .map(([studentId, pcts]) => ({
        studentId,
        averagePercentage: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length * 10) / 10,
        examCount: pcts.length,
      }))
      .sort((a, b) => b.averagePercentage - a.averagePercentage)
      .slice(0, 10)

    return c.json(ok({
      totalExams,
      averageScorePercentage,
      passRate,
      topPerformers,
    }))
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Error fetching exam stats`)
    return c.json(fail('Failed to fetch exam stats'), 500)
  }
})

export default examsRouter
