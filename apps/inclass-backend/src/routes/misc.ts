/**
 * Reports, Dashboard, Notifications, Teachers, Schedules Routes
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db/index.js'
import { students, classes, teachers, schedules, attendances, parents, notifications, payments, exams, examScores, auditLogs } from '../db/schema.js'
import { eq, sql, and, inArray } from 'drizzle-orm'
import { getTodayTW, getThisMonthTW } from '../utils/date.js'
import type { Variables } from '../middleware/auth.js'

const miscRouter = new Hono<{ Variables: Variables }>()

// ===== 通知系統 =====
const notifySchema = z.object({
  studentId: z.string().uuid(),
  type: z.enum(['absence', 'late', 'grade', 'notice']),
  message: z.string().min(1).max(500),
})

miscRouter.post('/notify/absence', zValidator('json', notifySchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const schoolId = c.get('schoolId')

    const [student] = await db.select().from(students).where(eq(students.id, body.studentId))
    if (!student || student.schoolId !== schoolId) return c.json({ error: 'Student not found' }, 404)

    const [parent] = await db.select().from(parents).where(eq(parents.studentId, body.studentId))
    if (!parent) return c.json({ error: 'No parent found for student' }, 404)

    const [notification] = await db.insert(notifications).values({
      studentId: body.studentId, parentId: parent.id,
      type: body.type, message: body.message, sentAt: new Date(),
    }).returning()

    return c.json({ success: true, notification })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error sending notification:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to send notification' }, 500)
  }
})

miscRouter.post('/notify/grade', zValidator('json', notifySchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const schoolId = c.get('schoolId')

    const [student] = await db.select().from(students).where(eq(students.id, body.studentId))
    if (!student || student.schoolId !== schoolId) return c.json({ error: 'Student not found' }, 404)

    const [parent] = await db.select().from(parents).where(eq(parents.studentId, body.studentId))
    if (!parent) return c.json({ error: 'No parent found for student' }, 404)

    const [notification] = await db.insert(notifications).values({
      studentId: body.studentId, parentId: parent.id,
      type: body.type, message: body.message, sentAt: new Date(),
    }).returning()

    return c.json({ success: true, notification })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error sending notification:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to send notification' }, 500)
  }
})

miscRouter.post('/class/dismiss', async (c) => {
  return c.json({ success: true, message: 'Feature not yet implemented' })
})

// ===== CRM =====
miscRouter.get('/leads', async (c) => {
  return c.json({
    leads: [
      { id: 'l1', name: '張媽媽', phone: '0912-111-222', source: 'LINE', status: 'new' },
    ]
  })
})

// ===== 老師管理 =====
const teacherSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255).optional(),
  phone: z.string().regex(/^[0-9+\-() ]{8,20}$/, 'Invalid phone number format').optional(),
  subject: z.string().max(50).optional(),
})

miscRouter.get('/teachers', async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const allTeachers = await db.select().from(teachers).where(eq(teachers.schoolId, schoolId))
    return c.json({ teachers: allTeachers })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching teachers:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch teachers' }, 500)
  }
})

miscRouter.post('/teachers', zValidator('json', teacherSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const schoolId = c.get('schoolId')
    const [newTeacher] = await db.insert(teachers).values({ ...body, schoolId }).returning()
    return c.json({ success: true, teacher: newTeacher }, 201)
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error creating teacher:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to create teacher' }, 500)
  }
})

// ===== 課表管理 =====
miscRouter.get('/schedules', async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const schoolSchedules = await db
      .select({
        id: schedules.id, classId: schedules.classId, teacherId: schedules.teacherId,
        dayOfWeek: schedules.dayOfWeek, startTime: schedules.startTime, endTime: schedules.endTime,
        subject: schedules.subject, room: schedules.room, className: classes.name,
      })
      .from(schedules)
      .innerJoin(classes, eq(schedules.classId, classes.id))
      .where(eq(classes.schoolId, schoolId))

    return c.json({ schedules: schoolSchedules })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching schedules:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch schedules' }, 500)
  }
})

// ===== 出勤報表 =====
miscRouter.get('/reports/attendance', async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const month = c.req.query('month') || getThisMonthTW()

    if (!month.match(/^\d{4}-\d{2}$/)) {
      return c.json({ error: 'Invalid month format (expected YYYY-MM)' }, 400)
    }

    const allStudents = await db.select().from(students).where(eq(students.schoolId, schoolId))
    const studentIds = allStudents.map(s => s.id)

    if (studentIds.length === 0) {
      return c.json({
        month, dailyStats: {}, studentStats: [],
        summary: { totalDays: 0, totalAttendances: 0, averageRate: 0, totalStudents: 0 }
      })
    }

    const monthAttendances = await db.select().from(attendances)
      .where(and(inArray(attendances.studentId, studentIds), sql`${attendances.date} LIKE ${month + '%'}`))

    const dailyStats: Record<string, { total: number; arrived: number; late: number; absent: number }> = {}
    monthAttendances.forEach(a => {
      if (!dailyStats[a.date]) dailyStats[a.date] = { total: 0, arrived: 0, late: 0, absent: 0 }
      dailyStats[a.date].total++
      if (a.status === 'arrived') dailyStats[a.date].arrived++
      if (a.status === 'late') dailyStats[a.date].late++
      if (a.status === 'absent') dailyStats[a.date].absent++
    })

    const studentStatsMap: Record<string, { arrived: number; late: number; absent: number; total: number }> = {}
    monthAttendances.forEach(a => {
      if (!studentStatsMap[a.studentId]) studentStatsMap[a.studentId] = { arrived: 0, late: 0, absent: 0, total: 0 }
      studentStatsMap[a.studentId].total++
      if (a.status === 'arrived') studentStatsMap[a.studentId].arrived++
      if (a.status === 'late') studentStatsMap[a.studentId].late++
      if (a.status === 'absent') studentStatsMap[a.studentId].absent++
    })

    const studentStats = allStudents.map(s => {
      const stats = studentStatsMap[s.id] || { arrived: 0, late: 0, absent: 0, total: 0 }
      const rate = stats.total > 0 ? Math.round(((stats.arrived + stats.late) / stats.total) * 100) : 0
      return { studentId: s.id, studentName: s.name, ...stats, rate }
    }).sort((a, b) => b.rate - a.rate)

    const totalDays = Object.keys(dailyStats).length
    const totalAttendances = monthAttendances.length
    const averageRate = totalDays > 0
      ? Math.round(Object.values(dailyStats).reduce((sum, d) => {
          const rate = d.total > 0 ? (d.arrived + d.late) / d.total : 0
          return sum + rate
        }, 0) / totalDays * 100)
      : 0

    return c.json({
      month, dailyStats, studentStats,
      summary: { totalDays, totalAttendances, averageRate, totalStudents: allStudents.length }
    })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Attendance report error:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to generate report' }, 500)
  }
})

// ===== 數據儀表板 =====
miscRouter.get('/dashboard/stats', async (c) => {
  try {
    const schoolId = c.get('schoolId') as string
    const today = getTodayTW()
    const thisMonth = getThisMonthTW()

    const allStudents = await db.select().from(students).where(eq(students.schoolId, schoolId))
    const totalStudents = allStudents.length
    const newStudentsThisMonth = allStudents.filter(s => s.createdAt && s.createdAt.toISOString().startsWith(thisMonth)).length

    const studentIds = allStudents.map(s => s.id)
    const todayAttendances = studentIds.length > 0
      ? await db.select().from(attendances)
        .where(and(eq(attendances.date, today), inArray(attendances.studentId, studentIds)))
      : []
    const todayArrived = todayAttendances.filter(a => a.status === 'arrived' || a.status === 'late').length
    const attendanceRate = totalStudents > 0 ? Math.round((todayArrived / totalStudents) * 100) : 0

    let totalRevenue = 0
    if (studentIds.length > 0) {
      const schoolPayments = await db.select().from(payments)
        .where(inArray(payments.studentId, studentIds))
      const thisMonthPayments = schoolPayments.filter(p => p.createdAt && p.createdAt.toISOString().startsWith(thisMonth))
      totalRevenue = thisMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    }

    const allClasses = await db.select().from(classes).where(eq(classes.schoolId, schoolId))
    const allTeachers = await db.select().from(teachers).where(eq(teachers.schoolId, schoolId))

    return c.json({
      totalStudents, newStudentsThisMonth, attendanceRate, totalRevenue,
      stats: {
        totalStudents,
        activeStudents: allStudents.filter(s => s.active).length,
        totalClasses: allClasses.length,
        totalTeachers: allTeachers.length,
      }
    })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Dashboard stats error:', e)
    return c.json({ error: 'Failed to get stats' }, 500)
  }
})

// ===== Audit Logs =====
miscRouter.get('/audit-logs', async (c) => {
  const schoolId = c.get('schoolId')
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = (page - 1) * limit
  const tableName = c.req.query('tableName')
  const needsAlert = c.req.query('needsAlert') === 'true'

  try {
    const conditions = [eq(auditLogs.schoolId, schoolId)]
    if (tableName) conditions.push(eq(auditLogs.tableName, tableName))
    if (needsAlert) conditions.push(eq(auditLogs.needsAlert, true))

    const logs = await db.select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(sql`${auditLogs.createdAt} desc`)
      .limit(limit)
      .offset(offset)

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(and(...conditions))

    return c.json({ ok: true, logs, total: countResult?.count || 0, page, limit })
  } catch (e) {
    console.error('[API Error] Failed to fetch audit logs:', e)
    return c.json({ error: 'Failed to fetch audit logs' }, 500)
  }
})

// ===== Alerts =====
miscRouter.get('/alerts', async (c) => {
  const schoolId = c.get('schoolId')
  try {
    const alerts = await db.select()
      .from(auditLogs)
      .where(and(
        eq(auditLogs.schoolId, schoolId),
        eq(auditLogs.needsAlert, true),
        sql`${auditLogs.alertConfirmedAt} is null`
      ))
      .orderBy(sql`${auditLogs.createdAt} desc`)
      .limit(50)

    return c.json({ ok: true, alerts })
  } catch (e) {
    console.error('[API Error] Failed to fetch alerts:', e)
    return c.json({ error: 'Failed to fetch alerts' }, 500)
  }
})

miscRouter.post('/alerts/:id/confirm', async (c) => {
  const schoolId = c.get('schoolId')
  const alertId = c.req.param('id')
  try {
    await db.update(auditLogs)
      .set({ alertConfirmedAt: new Date() })
      .where(and(eq(auditLogs.id, alertId), eq(auditLogs.schoolId, schoolId)))
    return c.json({ ok: true, message: 'Alert confirmed' })
  } catch (e) {
    console.error('[API Error] Failed to confirm alert:', e)
    return c.json({ error: 'Failed to confirm alert' }, 500)
  }
})

export default miscRouter
