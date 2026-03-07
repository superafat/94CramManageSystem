import { db } from '../db/index.js'
import { inclassClassroomSessions, inclassClassroomActivities, inclassStudentResponses } from '@94cram/shared/db'
import { and, eq, desc } from 'drizzle-orm'
import { logger } from '../utils/logger.js'
import crypto from 'crypto'

// SSE event emitter (in-memory, per-process)
type SSEClient = { id: string; controller: ReadableStreamDefaultController; role: 'teacher' | 'student' }
const sessionClients = new Map<string, SSEClient[]>()

export function generateSessionCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase() // 6-char code
}

export function addSSEClient(sessionId: string, client: SSEClient) {
  const clients = sessionClients.get(sessionId) || []
  clients.push(client)
  sessionClients.set(sessionId, clients)
}

export function removeSSEClient(sessionId: string, clientId: string) {
  const clients = sessionClients.get(sessionId) || []
  sessionClients.set(sessionId, clients.filter(c => c.id !== clientId))
}

export function broadcastToSession(sessionId: string, event: string, data: unknown, role?: 'teacher' | 'student') {
  const clients = sessionClients.get(sessionId) || []
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  const encoder = new TextEncoder()
  for (const client of clients) {
    if (role && client.role !== role) continue
    try {
      client.controller.enqueue(encoder.encode(message))
    } catch {
      // Client disconnected
    }
  }
}

// --- DB operations ---

export async function startSession(tenantId: string, teacherId: string, courseId: string, scheduleId?: string) {
  const sessionCode = generateSessionCode()
  const [session] = await db.insert(inclassClassroomSessions).values({
    tenantId,
    teacherId,
    courseId,
    scheduleId: scheduleId || null,
    sessionDate: new Date().toISOString().split('T')[0],
    sessionCode,
    status: 'active',
  }).returning()
  return session
}

export async function endSession(sessionId: string, tenantId: string) {
  const [session] = await db.update(inclassClassroomSessions)
    .set({ status: 'ended', endedAt: new Date() })
    .where(and(eq(inclassClassroomSessions.id, sessionId), eq(inclassClassroomSessions.tenantId, tenantId)))
    .returning()
  if (session) {
    broadcastToSession(sessionId, 'session_ended', { sessionId })
    sessionClients.delete(sessionId)
  }
  return session
}

export async function getSession(sessionId: string, tenantId: string) {
  const [session] = await db.select().from(inclassClassroomSessions)
    .where(and(eq(inclassClassroomSessions.id, sessionId), eq(inclassClassroomSessions.tenantId, tenantId)))
  return session || null
}

export async function getSessionByCode(code: string) {
  const [session] = await db.select().from(inclassClassroomSessions)
    .where(and(eq(inclassClassroomSessions.sessionCode, code), eq(inclassClassroomSessions.status, 'active')))
  return session || null
}

export async function createActivity(tenantId: string, sessionId: string, type: string, question: string, options?: string[], correctAnswer?: string) {
  const [activity] = await db.insert(inclassClassroomActivities).values({
    tenantId,
    sessionId,
    type,
    question,
    options: options || null,
    correctAnswer: correctAnswer || null,
    status: 'active',
  }).returning()
  broadcastToSession(sessionId, 'new_activity', activity)
  return activity
}

export async function closeActivity(activityId: string, tenantId: string) {
  // Get responses for results
  const responses = await db.select().from(inclassStudentResponses)
    .where(eq(inclassStudentResponses.activityId, activityId))

  // Calculate results
  const results: Record<string, number> = {}
  let winnerId: string | null = null
  let fastestTime = Infinity

  for (const r of responses) {
    results[r.answer] = (results[r.answer] || 0) + 1
    if (r.responseTime && r.responseTime < fastestTime && r.isCorrect) {
      fastestTime = r.responseTime
      winnerId = r.studentId
    }
  }

  const [activity] = await db.update(inclassClassroomActivities)
    .set({ status: 'closed', closedAt: new Date(), results, winnerId })
    .where(and(eq(inclassClassroomActivities.id, activityId), eq(inclassClassroomActivities.tenantId, tenantId)))
    .returning()

  if (activity) {
    broadcastToSession(activity.sessionId, 'activity_closed', { activity, totalResponses: responses.length })
  }
  return activity
}

export async function submitResponse(tenantId: string, activityId: string, studentId: string, answer: string, responseTime?: number) {
  // Check if activity is still active
  const [activity] = await db.select().from(inclassClassroomActivities)
    .where(and(eq(inclassClassroomActivities.id, activityId), eq(inclassClassroomActivities.tenantId, tenantId)))

  if (!activity || activity.status !== 'active') return null

  const isCorrect = activity.correctAnswer ? answer === activity.correctAnswer : null

  const [response] = await db.insert(inclassStudentResponses).values({
    tenantId,
    activityId,
    studentId,
    answer,
    responseTime: responseTime || null,
    isCorrect,
  }).onConflictDoNothing().returning()

  if (response) {
    // Broadcast to teacher only
    broadcastToSession(activity.sessionId, 'new_response', { activityId, studentId, answer: response.answer, isCorrect }, 'teacher')
  }
  return response
}

export async function getActivityResults(activityId: string, tenantId: string) {
  const [activity] = await db.select().from(inclassClassroomActivities)
    .where(and(eq(inclassClassroomActivities.id, activityId), eq(inclassClassroomActivities.tenantId, tenantId)))

  const responses = await db.select().from(inclassStudentResponses)
    .where(eq(inclassStudentResponses.activityId, activityId))

  return { activity, responses }
}

export async function getSessionActivities(sessionId: string, tenantId: string) {
  return db.select().from(inclassClassroomActivities)
    .where(and(eq(inclassClassroomActivities.sessionId, sessionId), eq(inclassClassroomActivities.tenantId, tenantId)))
    .orderBy(desc(inclassClassroomActivities.createdAt))
}

export async function randomPick(sessionId: string, tenantId: string, question: string, studentIds: string[]) {
  const winnerId = studentIds[Math.floor(Math.random() * studentIds.length)]
  const [activity] = await db.insert(inclassClassroomActivities).values({
    tenantId,
    sessionId,
    type: 'random_pick',
    question,
    winnerId,
    status: 'closed',
    closedAt: new Date(),
  }).returning()
  broadcastToSession(sessionId, 'random_pick', { activity, winnerId })
  return activity
}
