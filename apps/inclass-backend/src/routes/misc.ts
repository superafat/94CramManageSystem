import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db/index.js'
import {
  manageTeachers,
  manageStudents,
  manageCourses,
  manageEnrollments,
  inclassAttendances,
  inclassSchedules,
  inclassPaymentRecords,
  inclassParents,
} from '@94cram/shared/db'
import { and, eq, gte, lt, sql } from 'drizzle-orm'
import type { Variables } from '../middleware/auth.js'

const miscRouter = new Hono<{ Variables: Variables }>()

// ===== Teachers =====
const teacherSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().max(20).optional(),
  subject: z.string().trim().max(100).optional(),
}).strict()

miscRouter.get('/teachers', async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const teachers = await db.select().from(manageTeachers).where(eq(manageTeachers.tenantId, schoolId))
    return c.json({ teachers })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching teachers:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch teachers' }, 500)
  }
})

miscRouter.post('/teachers', zValidator('json', teacherSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const schoolId = c.get('schoolId')
    const [teacher] = await db.insert(manageTeachers).values({
      tenantId: schoolId,
      name: body.name,
      email: body.email,
      phone: body.phone,
      expertise: body.subject,
    }).returning()
    return c.json({ success: true, teacher }, 201)
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error creating teacher:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to create teacher' }, 500)
  }
})

// ===== Schedules =====
miscRouter.get('/schedules', async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const schedules = await db.select().from(inclassSchedules).where(eq(inclassSchedules.tenantId, schoolId))
    return c.json({ schedules })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching schedules:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch schedules' }, 500)
  }
})

// ===== Dashboard Stats =====
miscRouter.get('/dashboard/stats', async (c) => {
  try {
    const schoolId = c.get('schoolId')

    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    const [studentCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(manageStudents).where(and(eq(manageStudents.tenantId, schoolId), eq(manageStudents.status, 'active')))

    const [teacherCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(manageTeachers).where(eq(manageTeachers.tenantId, schoolId))

    const [classCount] = await db.select({ count: sql<number>`count(*)::int` })
      .from(manageCourses).where(eq(manageCourses.tenantId, schoolId))

    const [todayAttendance] = await db.select({ count: sql<number>`count(*)::int` })
      .from(inclassAttendances).where(and(
        eq(inclassAttendances.tenantId, schoolId),
        gte(inclassAttendances.date, todayStart),
        lt(inclassAttendances.date, todayEnd),
      ))

    return c.json({
      stats: {
        totalStudents: studentCount?.count || 0,
        totalTeachers: teacherCount?.count || 0,
        totalClasses: classCount?.count || 0,
        todayAttendance: todayAttendance?.count || 0,
      }
    })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching dashboard stats:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch dashboard stats' }, 500)
  }
})

// ===== Reports: Attendance =====
miscRouter.get('/reports/attendance', async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const month = c.req.query('month') // YYYY-MM format

    let startDate: Date
    let endDate: Date

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, mon] = month.split('-').map(Number)
      startDate = new Date(year, mon - 1, 1)
      endDate = new Date(year, mon, 1)
    } else {
      // Default: current month
      const now = new Date()
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    }

    const records = await db.select().from(inclassAttendances).where(and(
      eq(inclassAttendances.tenantId, schoolId),
      gte(inclassAttendances.date, startDate),
      lt(inclassAttendances.date, endDate),
    ))

    const present = records.filter(r => r.status === 'present').length
    const late = records.filter(r => r.status === 'late').length
    const absent = records.filter(r => r.status === 'absent').length

    return c.json({
      report: {
        period: month || `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`,
        total: records.length,
        present,
        late,
        absent,
        records,
      }
    })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching attendance report:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch attendance report' }, 500)
  }
})

// ===== Payment Records (misc mount: /api/payment-records) =====
miscRouter.get('/payment-records', async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const classId = c.req.query('classId')
    const periodMonth = c.req.query('periodMonth')

    const conditions = [eq(inclassPaymentRecords.tenantId, schoolId)]
    if (classId) conditions.push(eq(inclassPaymentRecords.courseId, classId))
    if (periodMonth) conditions.push(eq(inclassPaymentRecords.periodMonth, periodMonth))

    const records = await db.select().from(inclassPaymentRecords).where(and(...conditions))
    return c.json({ records })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching payment records:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch payment records' }, 500)
  }
})

const paymentRecordItemSchema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
  paymentType: z.enum(['monthly', 'quarterly', 'semester', 'yearly']),
  amount: z.number().positive(),
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  paymentDate: z.string().optional(),
  notes: z.string().max(500).optional(),
})

const batchSchema = z.object({
  records: z.array(paymentRecordItemSchema).min(1).max(100),
})

miscRouter.post('/payment-records/batch', zValidator('json', batchSchema), async (c) => {
  try {
    const { records } = c.req.valid('json')
    const schoolId = c.get('schoolId')
    const userId = c.get('userId')

    const inserted = await db.insert(inclassPaymentRecords).values(
      records.map(r => ({
        tenantId: schoolId,
        studentId: r.studentId,
        courseId: r.classId,
        paymentType: r.paymentType,
        amount: String(r.amount),
        periodMonth: r.periodMonth,
        paymentDate: r.paymentDate ? new Date(r.paymentDate) : new Date(),
        status: 'paid' as const,
        notes: r.notes,
        createdBy: userId,
      }))
    ).returning()

    return c.json({ success: true, records: inserted }, 201)
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error creating payment records:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to create payment records' }, 500)
  }
})

// ===== Classes Billing (misc mount: /api/classes/:classId/billing) =====
miscRouter.get('/classes/:classId/billing', async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const classId = c.req.param('classId')
    const periodMonth = c.req.query('periodMonth')

    const [course] = await db.select().from(manageCourses).where(
      and(eq(manageCourses.id, classId), eq(manageCourses.tenantId, schoolId))
    )
    if (!course) return c.json({ error: 'Class not found' }, 404)

    // Get enrolled students
    const enrollments = await db.select().from(manageEnrollments).where(
      and(eq(manageEnrollments.courseId, classId), eq(manageEnrollments.tenantId, schoolId), eq(manageEnrollments.status, 'active'))
    )

    // Get payment records for this class
    const conditions = [eq(inclassPaymentRecords.tenantId, schoolId), eq(inclassPaymentRecords.courseId, classId)]
    if (periodMonth) conditions.push(eq(inclassPaymentRecords.periodMonth, periodMonth))
    const payments = await db.select().from(inclassPaymentRecords).where(and(...conditions))

    const paidStudentIds = new Set(payments.filter(p => p.status === 'paid').map(p => p.studentId))

    return c.json({
      billing: {
        course,
        totalEnrolled: enrollments.length,
        totalPaid: paidStudentIds.size,
        totalUnpaid: enrollments.length - paidStudentIds.size,
        payments,
      }
    })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching billing:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch billing' }, 500)
  }
})

// ===== Notify: Absence =====
const notifySchema = z.object({
  studentId: z.string().uuid(),
  type: z.enum(['absence', 'late', 'grade', 'notice']),
  message: z.string().trim().min(1).max(500),
}).strict()

miscRouter.post('/notify/absence', zValidator('json', notifySchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const schoolId = c.get('schoolId')

    // Find parent with LINE notification enabled
    const parents = await db.select().from(inclassParents).where(
      and(
        eq(inclassParents.tenantId, schoolId),
        eq(inclassParents.studentId, body.studentId),
        eq(inclassParents.notifyEnabled, true),
      )
    )

    if (parents.length === 0) {
      return c.json({ success: false, error: 'No parents with notifications enabled' }, 404)
    }

    // Try external notification service if configured
    const imStudyUrl = process.env.IMSTUDY_API_URL
    if (imStudyUrl) {
      for (const parent of parents) {
        if (parent.lineUserId) {
          try {
            await fetch(`${imStudyUrl}/api/notify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lineUserId: parent.lineUserId,
                type: body.type,
                message: body.message,
              }),
            })
          } catch (err) {
            console.error('[Notify] Failed to send notification to parent:', parent.id, err instanceof Error ? err.message : 'Unknown error')
          }
        }
      }
    }

    return c.json({
      success: true,
      notified: parents.filter(p => p.lineUserId).length,
      message: `Notification sent to ${parents.filter(p => p.lineUserId).length} parent(s)`,
    })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error sending notification:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to send notification' }, 500)
  }
})

// ===== Student Scores (redirect from /api/scores/:studentId) =====
miscRouter.get('/scores/:studentId', async (c) => {
  // Forward to exams router - this endpoint is at /api/exams/scores/:studentId
  const studentId = c.req.param('studentId')
  return c.redirect(`/api/exams/scores/${studentId}`)
})

export default miscRouter
