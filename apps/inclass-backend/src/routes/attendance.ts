/**
 * Attendance Routes - 點名系統
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db/index.js'
import { students, attendances, parents } from '../db/schema.js'
import { eq, and, inArray } from 'drizzle-orm'
import { getTodayTW } from '../utils/date.js'
import { notifyAttendance, notifyLate } from '../services/notification.js'
import type { Variables } from '../middleware/auth.js'

const attendanceRouter = new Hono<{ Variables: Variables }>()

const checkinSchema = z.object({
  studentId: z.string().uuid().optional(),
  nfcId: z.string().min(1).max(50).optional(),
  method: z.enum(['nfc', 'face', 'manual']),
  status: z.enum(['arrived', 'late', 'absent']),
}).refine(
  (data) => data.studentId || data.nfcId,
  { message: 'Either studentId or nfcId must be provided' }
)

attendanceRouter.post('/checkin', zValidator('json', checkinSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const schoolId = c.get('schoolId')
    const now = new Date()
    const today = getTodayTW()

    let student
    if (body.studentId) {
      [student] = await db.select().from(students).where(eq(students.id, body.studentId))
    } else if (body.nfcId) {
      [student] = await db.select().from(students).where(eq(students.nfcId, body.nfcId))
    }

    if (!student) return c.json({ error: 'Student not found' }, 404)
    if (student.schoolId !== schoolId) return c.json({ error: 'Student not found' }, 404)

    const [existingRecord] = await db.select().from(attendances)
      .where(and(eq(attendances.studentId, student.id), eq(attendances.date, today)))

    if (existingRecord) {
      return c.json({ error: 'Student already checked in today', existingRecord }, 400)
    }

    const [record] = await db.insert(attendances).values({
      studentId: student.id,
      classId: student.classId,
      checkInTime: now,
      status: body.status,
      date: today,
    }).returning()

    // Send parent notification asynchronously (non-blocking)
    const studentCopy = { ...student }
    setImmediate(async () => {
      try {
        const [parent] = await db.select().from(parents)
          .where(eq(parents.studentId, studentCopy.id))

        if (parent?.lineUserId && parent.notifyEnabled) {
          if (body.status === 'arrived') {
            await notifyAttendance(schoolId, studentCopy.name, parent.lineUserId, now)
          } else if (body.status === 'late') {
            await notifyLate(schoolId, studentCopy.name, parent.lineUserId, now)
          }
        }
      } catch (err) {
        console.error('[Notification] Failed to send notification (non-critical):', err instanceof Error ? err.message : 'Unknown error')
      }
    })

    return c.json({ success: true, record })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Checkin error:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Check-in failed' }, 500)
  }
})

// 今日出缺勤
attendanceRouter.get('/today', async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const today = getTodayTW()
    const classId = c.req.query('classId')

    let studentList
    if (classId) {
      studentList = await db.select().from(students)
        .where(and(eq(students.schoolId, schoolId), eq(students.classId, classId)))
    } else {
      studentList = await db.select().from(students)
        .where(eq(students.schoolId, schoolId))
    }

    const studentIds = studentList.map(s => s.id)

    if (studentIds.length === 0) {
      return c.json({
        stats: { total: 0, arrived: 0, late: 0, absent: 0, checkedIn: 0, notCheckedIn: 0 },
        attendances: []
      })
    }

    const records = await db.select().from(attendances)
      .where(and(eq(attendances.date, today), inArray(attendances.studentId, studentIds)))

    const recordsWithNames = records.map(r => {
      const student = studentList.find(s => s.id === r.studentId)
      return { ...r, studentName: student?.name || 'Unknown' }
    })

    const total = studentList.length
    const arrived = records.filter(r => r.status === 'arrived').length
    const late = records.filter(r => r.status === 'late').length
    const explicitAbsent = records.filter(r => r.status === 'absent').length
    const notCheckedIn = total - records.length
    const absent = explicitAbsent + notCheckedIn

    return c.json({
      stats: { total, arrived, late, absent, checkedIn: records.length, notCheckedIn },
      attendances: recordsWithNames
    })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching today attendance:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch attendance' }, 500)
  }
})

export default attendanceRouter
