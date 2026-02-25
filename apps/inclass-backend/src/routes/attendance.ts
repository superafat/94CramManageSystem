import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db/index.js'
import { inclassAttendances, inclassNfcCards, manageStudents, manageEnrollments } from '@94cram/shared/db'
import { and, eq, gte, lt } from 'drizzle-orm'
import type { Variables } from '../middleware/auth.js'

const attendanceRouter = new Hono<{ Variables: Variables }>()

const checkinSchema = z.object({
  studentId: z.string().uuid().optional(),
  nfcId: z.string().min(1).max(100).optional(),
  method: z.enum(['nfc', 'face', 'manual']),
  status: z.enum(['arrived', 'late', 'absent']),
  classId: z.string().uuid().optional(),
}).refine(
  (data) => data.studentId || data.nfcId,
  { message: 'Either studentId or nfcId must be provided' }
)

attendanceRouter.post('/checkin', zValidator('json', checkinSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const schoolId = c.get('schoolId')

    let studentId = body.studentId
    if (!studentId && body.nfcId) {
      const [card] = await db.select().from(inclassNfcCards).where(
        and(eq(inclassNfcCards.tenantId, schoolId), eq(inclassNfcCards.cardUid, body.nfcId), eq(inclassNfcCards.isActive, true))
      )
      studentId = card?.studentId ?? undefined
    }

    if (!studentId) return c.json({ error: 'Student not found' }, 404)

    const [student] = await db.select().from(manageStudents).where(
      and(eq(manageStudents.id, studentId), eq(manageStudents.tenantId, schoolId))
    )
    if (!student) return c.json({ error: 'Student not found' }, 404)

    // Auto-resolve classId from student's active enrollment if not provided
    let classId = body.classId
    if (!classId) {
      const [enrollment] = await db.select().from(manageEnrollments).where(
        and(
          eq(manageEnrollments.tenantId, schoolId),
          eq(manageEnrollments.studentId, student.id),
          eq(manageEnrollments.status, 'active')
        )
      )
      classId = enrollment?.courseId ?? undefined
    }

    if (!classId) {
      return c.json({ error: 'classId is required (student has no active enrollment)' }, 400)
    }

    const now = new Date()
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    const [existingRecord] = await db.select().from(inclassAttendances).where(
      and(
        eq(inclassAttendances.tenantId, schoolId),
        eq(inclassAttendances.studentId, student.id),
        gte(inclassAttendances.date, start),
        lt(inclassAttendances.date, end)
      )
    )
    if (existingRecord) {
      return c.json({ error: 'Student already checked in today', existingRecord }, 400)
    }

    const [record] = await db.insert(inclassAttendances).values({
      tenantId: schoolId,
      studentId: student.id,
      courseId: classId,
      date: now,
      status: body.status === 'arrived' ? 'present' : body.status,
      checkInTime: now,
      checkInMethod: body.method,
    }).returning()

    return c.json({ success: true, record })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Checkin error:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Check-in failed' }, 500)
  }
})

attendanceRouter.get('/today', async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const classId = c.req.query('classId')
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    const records = await db.select().from(inclassAttendances).where(
      and(
        eq(inclassAttendances.tenantId, schoolId),
        classId ? eq(inclassAttendances.courseId, classId) : undefined,
        gte(inclassAttendances.date, start),
        lt(inclassAttendances.date, end)
      )
    )

    const present = records.filter(r => r.status === 'present').length
    const late = records.filter(r => r.status === 'late').length
    const absent = records.filter(r => r.status === 'absent').length

    return c.json({
      stats: { total: records.length, arrived: present, late, absent, checkedIn: records.length, notCheckedIn: 0 },
      attendances: records
    })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching today attendance:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch attendance' }, 500)
  }
})

export default attendanceRouter
