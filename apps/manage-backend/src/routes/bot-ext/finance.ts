import { Hono } from 'hono'
import { db } from '../../db'
import { manageStudents, managePayments, manageEnrollments } from '@94cram/shared/db'
import { eq, and, like, sql, gte, lte } from 'drizzle-orm'

type BotExtVariables = { tenantId: string; botRequest: boolean; botBody: Record<string, unknown> }

const app = new Hono<{ Variables: BotExtVariables }>()

// POST /finance/payment
app.post('/payment', async (c) => {
  try {
    const { tenant_id, student_name, student_id, amount, payment_type, date, note } = c.get('botBody') as any
    const tenantId = c.get('tenantId') as string

    let students
    if (student_id) {
      students = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, tenantId), eq(manageStudents.id, student_id)))
    } else {
      students = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, tenantId), eq(manageStudents.name, student_name)))
    }

    if (students.length === 0) {
      const safeName = (student_name || '').replace(/[%_\\]/g, '');
      const suggestions = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, tenantId), like(manageStudents.name, `%${safeName}%`)))
        .limit(5)
      return c.json({
        success: false, error: 'student_not_found',
        message: `找不到學生「${student_name}」`,
        suggestions: suggestions.map(s => ({ student_id: s.id, name: s.name, class_name: s.grade })),
      })
    }

    const student = students[0]
    const payDate = date || new Date().toISOString().split('T')[0]

    const enrollments = await db.select().from(manageEnrollments)
      .where(and(eq(manageEnrollments.tenantId, tenantId), eq(manageEnrollments.studentId, student.id)))
      .limit(1)

    if (enrollments.length > 0) {
      const [payment] = await db.insert(managePayments).values({
        tenantId,
        enrollmentId: enrollments[0].id,
        amount: String(amount),
        paymentMethod: payment_type || 'cash',
        paidAt: new Date(payDate),
        status: 'paid',
      }).returning()

      return c.json({
        success: true,
        message: `已登記 ${student.name} 繳費 NT$${Number(amount).toLocaleString()}`,
        data: {
          student_name: student.name,
          class_name: student.grade,
          amount,
          payment_type: payment_type || 'tuition',
          date: payDate,
          receipt_id: payment.id,
        },
      })
    }

    return c.json({ success: false, error: 'no_enrollment', message: `${student.name} 尚未報名任何課程` })
  } catch (error) {
    console.error('[Bot] payment error:', error)
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

// POST /finance/summary
app.post('/summary', async (c) => {
  try {
    const { tenant_id, start_date, end_date } = c.get('botBody') as any
    const tenantId = c.get('tenantId') as string

    const conditions = [eq(managePayments.tenantId, tenantId), eq(managePayments.status, 'paid')]
    if (start_date) conditions.push(gte(managePayments.paidAt, new Date(start_date)))
    if (end_date) conditions.push(lte(managePayments.paidAt, new Date(end_date)))

    const payments = await db.select().from(managePayments).where(and(...conditions))

    const total = payments.reduce((sum, p) => sum + Number(p.amount), 0)

    return c.json({
      success: true,
      message: `${start_date || ''}~${end_date || ''} 收費摘要`,
      data: { total_amount: total, count: payments.length, start_date, end_date },
    })
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

// POST /finance/history
app.post('/history', async (c) => {
  try {
    const { tenant_id, student_name, student_id } = c.get('botBody') as any
    const tenantId = c.get('tenantId') as string

    let students
    if (student_id) {
      students = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, tenantId), eq(manageStudents.id, student_id)))
    } else {
      students = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, tenantId), eq(manageStudents.name, student_name)))
    }

    if (students.length === 0) {
      return c.json({ success: false, error: 'student_not_found', message: `找不到學生「${student_name}」` })
    }

    const student = students[0]
    const enrollments = await db.select().from(manageEnrollments)
      .where(and(eq(manageEnrollments.tenantId, tenantId), eq(manageEnrollments.studentId, student.id)))

    const enrollmentIds = enrollments.map(e => e.id)
    let payments: (typeof managePayments.$inferSelect)[] = []
    if (enrollmentIds.length > 0) {
      payments = await db.select().from(managePayments)
        .where(sql`${managePayments.enrollmentId} IN ${enrollmentIds}`)
    }

    return c.json({
      success: true,
      message: `${student.name} 繳費紀錄`,
      data: {
        student_name: student.name,
        payments: payments.map(p => ({
          id: p.id,
          amount: Number(p.amount),
          method: p.paymentMethod,
          date: p.paidAt,
          status: p.status,
        })),
      },
    })
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

export default app
