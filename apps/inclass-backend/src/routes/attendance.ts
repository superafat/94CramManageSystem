import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db/index.js'
import { inclassAttendances, inclassNfcCards, manageStudents, manageEnrollments, manageStudentLeaves } from '@94cram/shared/db'
import { and, eq, gte, lt, lte, sql, count, isNull } from 'drizzle-orm'
import type { Variables } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

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

    // Fire-and-forget: notify parent via manage-backend
    const manageUrl = process.env.MANAGE_BACKEND_URL || 'http://localhost:3100'
    const statusLabel = body.status === 'arrived' ? 'present' : body.status
    fetch(`${manageUrl}/api/internal/notify/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: schoolId,
        studentId: student.id,
        studentName: student.name ?? '',
        status: statusLabel,
        time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      }),
    }).catch(() => {}) // fire-and-forget

    return c.json({ success: true, record })
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Checkin error`)
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
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Error fetching today attendance`)
    return c.json({ error: 'Failed to fetch attendance' }, 500)
  }
})

// GET /attendance/history
const historyQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['present', 'absent', 'late', 'leave']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

attendanceRouter.get('/history', zValidator('query', historyQuerySchema), async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const q = c.req.valid('query')
    const offset = (q.page - 1) * q.limit

    const conditions = [eq(inclassAttendances.tenantId, schoolId), isNull(inclassAttendances.deletedAt)]
    if (q.studentId) conditions.push(eq(inclassAttendances.studentId, q.studentId))
    if (q.status) conditions.push(eq(inclassAttendances.status, q.status))
    if (q.from) conditions.push(gte(inclassAttendances.date, new Date(q.from)))
    if (q.to) {
      const toDate = new Date(q.to)
      toDate.setDate(toDate.getDate() + 1)
      conditions.push(lt(inclassAttendances.date, toDate))
    }

    const [{ total }] = await db
      .select({ total: count() })
      .from(inclassAttendances)
      .where(and(...conditions))

    const records = await db
      .select({
        id: inclassAttendances.id,
        studentId: inclassAttendances.studentId,
        studentName: manageStudents.name,
        courseId: inclassAttendances.courseId,
        date: inclassAttendances.date,
        status: inclassAttendances.status,
        checkInTime: inclassAttendances.checkInTime,
        checkInMethod: inclassAttendances.checkInMethod,
        checkOutTime: inclassAttendances.checkOutTime,
        note: inclassAttendances.note,
        createdAt: inclassAttendances.createdAt,
      })
      .from(inclassAttendances)
      .leftJoin(manageStudents, eq(inclassAttendances.studentId, manageStudents.id))
      .where(and(...conditions))
      .orderBy(sql`${inclassAttendances.date} desc`)
      .limit(q.limit)
      .offset(offset)

    return c.json({ records, pagination: { page: q.page, limit: q.limit, total } })
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} History error`)
    return c.json({ error: 'Failed to fetch attendance history' }, 500)
  }
})

// GET /attendance/stats
const statsQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

attendanceRouter.get('/stats', zValidator('query', statsQuerySchema), async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const q = c.req.valid('query')

    const conditions = [eq(inclassAttendances.tenantId, schoolId)]
    if (q.studentId) conditions.push(eq(inclassAttendances.studentId, q.studentId))
    if (q.from) conditions.push(gte(inclassAttendances.date, new Date(q.from)))
    if (q.to) {
      const toDate = new Date(q.to)
      toDate.setDate(toDate.getDate() + 1)
      conditions.push(lt(inclassAttendances.date, toDate))
    }

    const rows = await db
      .select({ status: inclassAttendances.status, cnt: count() })
      .from(inclassAttendances)
      .where(and(...conditions))
      .groupBy(inclassAttendances.status)

    const agg: Record<string, number> = {}
    for (const row of rows) agg[row.status ?? ''] = row.cnt

    const presentCount = agg['present'] ?? 0
    const absentCount = agg['absent'] ?? 0
    const lateCount = agg['late'] ?? 0
    const leaveCount = agg['leave'] ?? 0
    const totalDays = presentCount + absentCount + lateCount + leaveCount
    const attendanceRate = totalDays > 0 ? Number((((presentCount + lateCount) / totalDays) * 100).toFixed(2)) : 0

    return c.json({ totalDays, presentCount, absentCount, lateCount, leaveCount, attendanceRate })
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Stats error`)
    return c.json({ error: 'Failed to fetch attendance stats' }, 500)
  }
})

// POST /attendance/checkout
const checkoutSchema = z.object({
  studentId: z.string().uuid().optional(),
  cardUid: z.string().min(1).max(100).optional(),
}).refine((d) => d.studentId || d.cardUid, { message: 'Either studentId or cardUid must be provided' })

attendanceRouter.post('/checkout', zValidator('json', checkoutSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const schoolId = c.get('schoolId')

    let studentId = body.studentId
    if (!studentId && body.cardUid) {
      const [card] = await db.select().from(inclassNfcCards).where(
        and(eq(inclassNfcCards.tenantId, schoolId), eq(inclassNfcCards.cardUid, body.cardUid), eq(inclassNfcCards.isActive, true))
      )
      studentId = card?.studentId ?? undefined
    }
    if (!studentId) return c.json({ error: 'Student not found' }, 404)

    const [student] = await db.select().from(manageStudents).where(
      and(eq(manageStudents.id, studentId), eq(manageStudents.tenantId, schoolId))
    )
    if (!student) return c.json({ error: 'Student not found' }, 404)

    const now = new Date()
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    const [record] = await db.select().from(inclassAttendances).where(
      and(
        eq(inclassAttendances.tenantId, schoolId),
        eq(inclassAttendances.studentId, studentId),
        gte(inclassAttendances.date, start),
        lt(inclassAttendances.date, end)
      )
    )
    if (!record) return c.json({ error: 'No check-in record found for today' }, 404)

    const [updated] = await db
      .update(inclassAttendances)
      .set({ checkOutTime: now })
      .where(eq(inclassAttendances.id, record.id))
      .returning()

    // Fire-and-forget checkout notification
    const manageUrl = process.env.MANAGE_BACKEND_URL || process.env.IMSTUDY_API_URL || 'http://localhost:3100'
    fetch(`${manageUrl}/api/internal/notify/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: schoolId,
        studentId,
        studentName: student.name ?? '',
        time: now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      }),
    }).catch(() => {})

    return c.json({ success: true, record: updated })
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Checkout error`)
    return c.json({ error: 'Checkout failed' }, 500)
  }
})

// GET /attendance/leaves
const leavesQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

attendanceRouter.get('/leaves', zValidator('query', leavesQuerySchema), async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const q = c.req.valid('query')
    const offset = (q.page - 1) * q.limit

    const conditions = [eq(manageStudentLeaves.tenantId, schoolId)]
    if (q.studentId) conditions.push(eq(manageStudentLeaves.studentId, q.studentId))
    if (q.from) conditions.push(gte(manageStudentLeaves.leaveDate, q.from))
    if (q.to) conditions.push(lte(manageStudentLeaves.leaveDate, q.to))

    const [{ total }] = await db
      .select({ total: count() })
      .from(manageStudentLeaves)
      .where(and(...conditions))

    const records = await db
      .select({
        id: manageStudentLeaves.id,
        studentId: manageStudentLeaves.studentId,
        studentName: manageStudents.name,
        courseId: manageStudentLeaves.courseId,
        leaveDate: manageStudentLeaves.leaveDate,
        leaveType: manageStudentLeaves.leaveType,
        reason: manageStudentLeaves.reason,
        status: manageStudentLeaves.status,
        parentNotified: manageStudentLeaves.parentNotified,
        createdAt: manageStudentLeaves.createdAt,
      })
      .from(manageStudentLeaves)
      .leftJoin(manageStudents, eq(manageStudentLeaves.studentId, manageStudents.id))
      .where(and(...conditions))
      .orderBy(sql`${manageStudentLeaves.leaveDate} desc`)
      .limit(q.limit)
      .offset(offset)

    return c.json({ records, pagination: { page: q.page, limit: q.limit, total } })
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Leaves error`)
    return c.json({ error: 'Failed to fetch leave records' }, 500)
  }
})

export default attendanceRouter
