/**
 * Payments Routes - 繳費管理
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db/index.js'
import { classes, students, payments, paymentRecords } from '../db/schema.js'
import { eq, sql, and, inArray } from 'drizzle-orm'
import { isValidUUID, getTodayTW } from '../utils/date.js'
import type { Variables } from '../middleware/auth.js'

const paymentsRouter = new Hono<{ Variables: Variables }>()

// 查詢繳費記錄
paymentsRouter.get('/records', async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const classId = c.req.query('classId')
    const periodMonth = c.req.query('periodMonth')

    const schoolClasses = await db.select().from(classes).where(eq(classes.schoolId, schoolId))
    const classIds = schoolClasses.map(cls => cls.id)

    if (classIds.length === 0) return c.json({ records: [] })

    let records = await db.select({
      id: paymentRecords.id, studentId: paymentRecords.studentId,
      classId: paymentRecords.classId, paymentType: paymentRecords.paymentType,
      amount: paymentRecords.amount, paymentDate: paymentRecords.paymentDate,
      periodMonth: paymentRecords.periodMonth, status: paymentRecords.status,
      notes: paymentRecords.notes, createdAt: paymentRecords.createdAt,
      studentName: students.name, className: classes.name,
    })
    .from(paymentRecords)
    .innerJoin(students, eq(paymentRecords.studentId, students.id))
    .innerJoin(classes, eq(paymentRecords.classId, classes.id))
    .where(inArray(paymentRecords.classId, classIds))

    if (classId) records = records.filter(r => r.classId === classId)
    if (periodMonth) records = records.filter(r => r.periodMonth === periodMonth)

    return c.json({ records })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching payment records:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch payment records' }, 500)
  }
})

// 批次繳費
const batchPaymentSchema = z.object({
  records: z.array(z.object({
    studentId: z.string().uuid(),
    classId: z.string().uuid(),
    paymentType: z.enum(['monthly', 'quarterly', 'semester', 'yearly']),
    amount: z.number().int().min(0),
    periodMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    notes: z.string().max(500).optional(),
  }))
})

paymentsRouter.post('/records/batch', zValidator('json', batchPaymentSchema), async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const userId = c.get('userId')
    const body = c.req.valid('json')

    const classIds = [...new Set(body.records.map(r => r.classId))]
    const schoolClasses = await db.select().from(classes)
      .where(and(eq(classes.schoolId, schoolId), inArray(classes.id, classIds)))
    if (schoolClasses.length !== classIds.length) return c.json({ error: 'Invalid class ID' }, 400)

    const studentIds = [...new Set(body.records.map(r => r.studentId))]
    const schoolStudents = await db.select().from(students)
      .where(and(eq(students.schoolId, schoolId), inArray(students.id, studentIds)))
    if (schoolStudents.length !== studentIds.length) return c.json({ error: 'Invalid student ID' }, 400)

    const today = getTodayTW()
    const insertData = body.records.map(r => ({
      studentId: r.studentId, classId: r.classId, paymentType: r.paymentType,
      amount: r.amount, paymentDate: r.paymentDate || today,
      periodMonth: r.periodMonth, status: 'paid', notes: r.notes, createdBy: userId,
    }))

    const inserted = await db.insert(paymentRecords).values(insertData).returning()
    return c.json({ success: true, count: inserted.length, records: inserted }, 201)
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error creating payment records:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to create payment records' }, 500)
  }
})

// 取得班級繳費狀態
paymentsRouter.get('/classes/:id/billing', async (c) => {
  try {
    const classId = c.req.param('id')
    const schoolId = c.get('schoolId')
    const periodMonth = c.req.query('periodMonth') || getTodayTW().substring(0, 7)

    if (!isValidUUID(classId)) return c.json({ error: 'Invalid class ID format' }, 400)

    const [classData] = await db.select().from(classes).where(eq(classes.id, classId))
    if (!classData || classData.schoolId !== schoolId) return c.json({ error: 'Class not found' }, 404)

    const classStudents = await db.select().from(students)
      .where(and(eq(students.classId, classId), eq(students.active, true)))

    const studentIds = classStudents.map(s => s.id)
    let monthPayments: Array<typeof paymentRecords.$inferSelect> = []

    if (studentIds.length > 0) {
      monthPayments = await db.select().from(paymentRecords)
        .where(and(
          inArray(paymentRecords.studentId, studentIds),
          eq(paymentRecords.classId, classId),
          eq(paymentRecords.periodMonth, periodMonth)
        ))
    }

    const studentsWithPayment = classStudents.map(student => {
      const payment = monthPayments.find(p => p.studentId === student.id)
      return { id: student.id, name: student.name, grade: student.grade, isPaid: !!payment, paymentRecord: payment || null }
    })

    return c.json({
      class: {
        id: classData.id, name: classData.name, grade: classData.grade,
        feeMonthly: classData.feeMonthly, feeQuarterly: classData.feeQuarterly,
        feeSemester: classData.feeSemester, feeYearly: classData.feeYearly,
      },
      periodMonth,
      students: studentsWithPayment,
      stats: {
        total: classStudents.length,
        paid: studentsWithPayment.filter(s => s.isPaid).length,
        unpaid: studentsWithPayment.filter(s => !s.isPaid).length,
      }
    })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching billing:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch billing' }, 500)
  }
})

// 舊繳費管理（保留兼容）
paymentsRouter.get('/legacy', async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const schoolPayments = await db
      .select({
        id: payments.id, studentId: payments.studentId,
        amount: payments.amount, status: payments.status,
        paidAt: payments.paidAt, createdAt: payments.createdAt,
        studentName: students.name,
      })
      .from(payments)
      .innerJoin(students, eq(payments.studentId, students.id))
      .where(eq(students.schoolId, schoolId))

    return c.json({ payments: schoolPayments })
  } catch (e) {
    console.error('[API Error]', c.req.path, 'Error fetching payments:', e instanceof Error ? e.message : 'Unknown error')
    return c.json({ error: 'Failed to fetch payments' }, 500)
  }
})

export default paymentsRouter
