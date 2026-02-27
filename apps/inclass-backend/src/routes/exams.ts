import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db/index.js'
import { inclassExams, inclassExamScores, manageCourses, manageStudents } from '@94cram/shared/db'
import { and, eq } from 'drizzle-orm'
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

    const schoolExams = await db.select().from(inclassExams).where(eq(inclassExams.tenantId, schoolId))
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

export default examsRouter
