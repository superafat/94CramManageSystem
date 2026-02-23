/**
 * Exams & Scores Routes - 成績管理
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db/index.js'
import { exams, examScores, classes, students } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import type { Variables } from '../middleware/auth.js'

const examsRouter = new Hono<{ Variables: Variables }>()

const examSchema = z.object({
  classId: z.string().uuid(),
  name: z.string().min(1).max(100),
  subject: z.string().min(1).max(50),
  maxScore: z.number().int().min(1).max(1000).default(100),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
})

const scoreSchema = z.object({
  studentId: z.string().uuid(),
  score: z.number().min(0),
})

const examIdParamSchema = z.object({
  examId: z.string().uuid('Invalid exam ID format'),
})

const studentIdParamSchema = z.object({
  studentId: z.string().uuid('Invalid student ID format'),
})

const requireSchoolId = (schoolId: string | undefined) => {
  return typeof schoolId === 'string' && schoolId.trim().length > 0 ? schoolId : null
}

examsRouter.get('/', async (c) => {
  try {
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ error: 'Unauthorized' }, 401)
    const schoolExams = await db
      .select({
        id: exams.id, classId: exams.classId, name: exams.name,
        subject: exams.subject, maxScore: exams.maxScore, examDate: exams.examDate,
        createdAt: exams.createdAt, className: classes.name,
      })
      .from(exams)
      .innerJoin(classes, eq(exams.classId, classes.id))
      .where(eq(classes.schoolId, schoolId))

    return c.json({ exams: schoolExams })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching exams:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch exams' }, 500)
  }
})

examsRouter.post('/', zValidator('json', examSchema), async (c) => {
  try {
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ error: 'Unauthorized' }, 401)
    const body = c.req.valid('json')

    const [classData] = await db.select().from(classes).where(eq(classes.id, body.classId))
    if (!classData || classData.schoolId !== schoolId) {
      return c.json({ error: 'Class not found' }, 404)
    }

    const [newExam] = await db.insert(exams).values({
      classId: body.classId, name: body.name, subject: body.subject,
      maxScore: body.maxScore, examDate: body.examDate,
    }).returning()

    return c.json({ success: true, exam: newExam }, 201)
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Create exam error:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to create exam' }, 500)
  }
})

examsRouter.get('/:examId/scores', zValidator('param', examIdParamSchema), async (c) => {
  try {
    const { examId } = c.req.valid('param')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ error: 'Unauthorized' }, 401)

    const [exam] = await db.select().from(exams).where(eq(exams.id, examId))
    if (!exam) return c.json({ error: 'Exam not found' }, 404)

    const [examClass] = await db.select().from(classes).where(eq(classes.id, exam.classId))
    if (!examClass || examClass.schoolId !== schoolId) return c.json({ error: 'Unauthorized' }, 403)

    const scoresWithStudents = await db
      .select({
        id: examScores.id, examId: examScores.examId, studentId: examScores.studentId,
        score: examScores.score, createdAt: examScores.createdAt, studentName: students.name,
      })
      .from(examScores)
      .innerJoin(students, eq(examScores.studentId, students.id))
      .where(eq(examScores.examId, examId))

    const sortedScores = scoresWithStudents.sort((a, b) => b.score - a.score)
    const scores = scoresWithStudents.map(s => s.score)
    const average = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    const highest = scores.length > 0 ? Math.max(...scores) : 0
    const lowest = scores.length > 0 ? Math.min(...scores) : 0

    return c.json({
      exam,
      scores: sortedScores,
      stats: { average, highest, lowest, total: scores.length }
    })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Get exam scores error:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to get scores' }, 500)
  }
})

examsRouter.post(
  '/:examId/scores',
  zValidator('param', examIdParamSchema),
  zValidator('json', scoreSchema),
  async (c) => {
  try {
    const { examId } = c.req.valid('param')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ error: 'Unauthorized' }, 401)
    const body = c.req.valid('json')

    const [exam] = await db.select().from(exams).where(eq(exams.id, examId))
    if (!exam) return c.json({ error: 'Exam not found' }, 404)

    const [examClass] = await db.select().from(classes).where(eq(classes.id, exam.classId))
    if (!examClass || examClass.schoolId !== schoolId) return c.json({ error: 'Unauthorized' }, 403)

    const [student] = await db.select().from(students).where(eq(students.id, body.studentId))
    if (!student || student.schoolId !== schoolId) return c.json({ error: 'Student not found' }, 404)

    if (body.score > exam.maxScore) {
      return c.json({ error: `Score cannot exceed maximum score of ${exam.maxScore}`, maxScore: exam.maxScore }, 400)
    }

    const [existing] = await db.select().from(examScores)
      .where(and(eq(examScores.examId, examId), eq(examScores.studentId, body.studentId)))

    if (existing) {
      const [updated] = await db.update(examScores).set({ score: body.score }).where(eq(examScores.id, existing.id)).returning()
      return c.json({ success: true, score: updated })
    } else {
      const [newScore] = await db.insert(examScores).values({ examId, studentId: body.studentId, score: body.score }).returning()
      return c.json({ success: true, score: newScore }, 201)
    }
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Add score error:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to add score' }, 500)
  }
})

// 取得學生成績
examsRouter.get('/scores/:studentId', zValidator('param', studentIdParamSchema), async (c) => {
  try {
    const { studentId } = c.req.valid('param')
    const schoolId = requireSchoolId(c.get('schoolId'))
    if (!schoolId) return c.json({ error: 'Unauthorized' }, 401)

    const [student] = await db.select().from(students).where(eq(students.id, studentId))
    if (!student || student.schoolId !== schoolId) return c.json({ error: 'Student not found' }, 404)

    const studentScores = await db
      .select({
        id: examScores.id, examId: examScores.examId, studentId: examScores.studentId,
        score: examScores.score, createdAt: examScores.createdAt,
        examName: exams.name, examSubject: exams.subject,
        examMaxScore: exams.maxScore, examDate: exams.examDate,
      })
      .from(examScores)
      .innerJoin(exams, eq(examScores.examId, exams.id))
      .where(eq(examScores.studentId, studentId))

    const sortedScores = studentScores.sort((a, b) =>
      new Date(b.examDate).getTime() - new Date(a.examDate).getTime()
    )

    return c.json({ scores: sortedScores })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching student scores:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch scores' }, 500)
  }
})

export default examsRouter
