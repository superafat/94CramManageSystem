/**
 * Internal API routes (for imStudy/94Manage integration)
 * These routes use a separate token-based auth, NOT JWT auth
 */
import { Hono } from 'hono'
import { db } from '../db/index.js'
import { attendances, examScores, exams, students, auditLogs } from '../db/schema.js'
import { eq, and, sql } from 'drizzle-orm'
import { getTodayTW } from '../utils/date.js'

const internalRouter = new Hono()

const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN
if (!INTERNAL_API_TOKEN) {
  console.warn('[Warning] INTERNAL_API_TOKEN not set, internal APIs will be disabled')
}

// Internal auth middleware
internalRouter.use('*', async (c, next) => {
  if (!INTERNAL_API_TOKEN) {
    return c.json({ error: 'Internal API not configured' }, 503)
  }
  const authHeader = c.req.header('Authorization')
  if (authHeader !== `Bearer ${INTERNAL_API_TOKEN}`) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
})

// FIX: Use WHERE clause instead of fetching all records then filtering
internalRouter.get('/attendance/:studentId', async (c) => {
  const studentId = c.req.param('studentId')
  const date = c.req.query('date') || getTodayTW()

  try {
    const records = await db.select().from(attendances)
      .where(and(
        eq(attendances.studentId, studentId),
        eq(attendances.date, date)
      ))

    return c.json({ attendance: records })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Internal API error:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch attendance' }, 500)
  }
})

internalRouter.get('/grades/:studentId', async (c) => {
  const studentId = c.req.param('studentId')

  try {
    const scores = await db.select({
      id: examScores.id,
      examId: examScores.examId,
      studentId: examScores.studentId,
      score: examScores.score,
      examName: exams.name,
      subject: exams.subject,
      maxScore: exams.maxScore,
      examDate: exams.examDate
    })
      .from(examScores)
      .leftJoin(exams, eq(examScores.examId, exams.id))
      .where(eq(examScores.studentId, studentId))

    return c.json({ grades: scores })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Internal API error:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch grades' }, 500)
  }
})

internalRouter.post('/notify', async (c) => {
  const { action, studentId } = await c.req.json()

  try {
    if (action === 'student.deactivated' && studentId) {
      const student = await db.select().from(students).where(eq(students.id, studentId)).limit(1)
      if (student.length > 0) {
        await db.update(students).set({ active: false }).where(eq(students.id, studentId))
      }
    }
    return c.json({ ok: true })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Internal API error:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to process notification' }, 500)
  }
})

export default internalRouter
