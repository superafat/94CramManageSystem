import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Variables } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'
import * as classroom from '../services/classroom.js'

const classroomRouter = new Hono<{ Variables: Variables }>()

const ok = <T>(data: T) => ({ success: true, data, error: null } as const)
const fail = (error: string) => ({ success: false, data: null, error } as const)

// POST /classroom/session/start
classroomRouter.post('/session/start', zValidator('json', z.object({
  courseId: z.string().uuid(),
  scheduleId: z.string().uuid().optional(),
})), async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const userId = c.get('userId')
    const { courseId, scheduleId } = c.req.valid('json')
    const session = await classroom.startSession(schoolId, userId, courseId, scheduleId)
    return c.json(ok(session), 201)
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, 'Start session error')
    return c.json(fail('Failed to start session'), 500)
  }
})

// POST /classroom/session/:id/end
classroomRouter.post('/session/:id/end', async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const session = await classroom.endSession(c.req.param('id'), schoolId)
    if (!session) return c.json(fail('Session not found'), 404)
    return c.json(ok(session))
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, 'End session error')
    return c.json(fail('Failed to end session'), 500)
  }
})

// GET /classroom/session/:id
classroomRouter.get('/session/:id', async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const session = await classroom.getSession(c.req.param('id'), schoolId)
    if (!session) return c.json(fail('Session not found'), 404)
    return c.json(ok(session))
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, 'Get session error')
    return c.json(fail('Failed to get session'), 500)
  }
})

// GET /classroom/session/join/:code — student joins by code (no JWT needed for lookup)
classroomRouter.get('/session/join/:code', async (c) => {
  try {
    const session = await classroom.getSessionByCode(c.req.param('code'))
    if (!session) return c.json(fail('Session not found or ended'), 404)
    return c.json(ok({ sessionId: session.id, tenantId: session.tenantId, courseId: session.courseId }))
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, 'Join session error')
    return c.json(fail('Failed to join session'), 500)
  }
})

// POST /classroom/activity
classroomRouter.post('/activity', zValidator('json', z.object({
  sessionId: z.string().uuid(),
  type: z.enum(['poll', 'quiz', 'random_pick', 'rush_answer']),
  question: z.string().min(1),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  studentIds: z.array(z.string().uuid()).optional(), // for random_pick
})), async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const body = c.req.valid('json')

    if (body.type === 'random_pick' && body.studentIds?.length) {
      const activity = await classroom.randomPick(body.sessionId, schoolId, body.question, body.studentIds)
      return c.json(ok(activity), 201)
    }

    const activity = await classroom.createActivity(schoolId, body.sessionId, body.type, body.question, body.options, body.correctAnswer)
    return c.json(ok(activity), 201)
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, 'Create activity error')
    return c.json(fail('Failed to create activity'), 500)
  }
})

// POST /classroom/activity/:id/close
classroomRouter.post('/activity/:id/close', async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const activity = await classroom.closeActivity(c.req.param('id'), schoolId)
    if (!activity) return c.json(fail('Activity not found'), 404)
    return c.json(ok(activity))
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, 'Close activity error')
    return c.json(fail('Failed to close activity'), 500)
  }
})

// POST /classroom/activity/:id/respond
classroomRouter.post('/activity/:id/respond', zValidator('json', z.object({
  studentId: z.string().uuid(),
  answer: z.string().min(1),
  responseTime: z.number().int().positive().optional(),
})), async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const body = c.req.valid('json')
    const response = await classroom.submitResponse(schoolId, c.req.param('id'), body.studentId, body.answer, body.responseTime)
    if (!response) return c.json(fail('Activity closed or already responded'), 400)
    return c.json(ok(response), 201)
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, 'Submit response error')
    return c.json(fail('Failed to submit response'), 500)
  }
})

// GET /classroom/activity/:id/results
classroomRouter.get('/activity/:id/results', async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const results = await classroom.getActivityResults(c.req.param('id'), schoolId)
    return c.json(ok(results))
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, 'Get results error')
    return c.json(fail('Failed to get results'), 500)
  }
})

// GET /classroom/session/:id/activities
classroomRouter.get('/session/:id/activities', async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const activities = await classroom.getSessionActivities(c.req.param('id'), schoolId)
    return c.json(ok(activities))
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, 'Get activities error')
    return c.json(fail('Failed to get activities'), 500)
  }
})

// SSE: GET /classroom/session/:id/stream — student stream
classroomRouter.get('/session/:id/stream', async (c) => {
  const sessionId = c.req.param('id')
  const clientId = crypto.randomUUID()

  const stream = new ReadableStream({
    start(controller) {
      classroom.addSSEClient(sessionId, { id: clientId, controller, role: 'student' })
      // Send initial connected event
      const encoder = new TextEncoder()
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`))
    },
    cancel() {
      classroom.removeSSEClient(sessionId, clientId)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
})

// SSE: GET /classroom/session/:id/teacher-stream — teacher stream
classroomRouter.get('/session/:id/teacher-stream', async (c) => {
  const sessionId = c.req.param('id')
  const clientId = crypto.randomUUID()

  const stream = new ReadableStream({
    start(controller) {
      classroom.addSSEClient(sessionId, { id: clientId, controller, role: 'teacher' })
      const encoder = new TextEncoder()
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`))
    },
    cancel() {
      classroom.removeSSEClient(sessionId, clientId)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
})

export default classroomRouter
