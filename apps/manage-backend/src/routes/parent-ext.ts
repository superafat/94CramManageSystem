/**
 * Parent External API Routes — 家長 Bot 查詢
 * 認證：X-Internal-Key + X-Tenant-Id headers
 */
import { Hono } from 'hono';
import { timingSafeEqual } from 'crypto';
import { db } from '../db';
import { manageStudents, managePayments, manageEnrollments } from '@94cram/shared/db';
import { eq, and, sql, desc } from 'drizzle-orm';

const app = new Hono();

const INTERNAL_KEY = process.env.INTERNAL_API_KEY;

// Auth middleware: X-Internal-Key + X-Tenant-Id
app.use('*', async (c, next) => {
  if (!INTERNAL_KEY) return c.json({ error: 'Service unavailable' }, 503);
  const key = c.req.header('X-Internal-Key');
  if (!key) return c.json({ error: 'Forbidden' }, 403);
  const keyBuf = Buffer.from(key);
  const expectedBuf = Buffer.from(INTERNAL_KEY);
  if (keyBuf.length !== expectedBuf.length || !timingSafeEqual(keyBuf, expectedBuf)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const tenantId = c.req.header('X-Tenant-Id');
  if (!tenantId) return c.json({ error: 'X-Tenant-Id header required' }, 400);
  c.set('tenantId' as never, tenantId as never);
  await next();
});

// GET /student/:studentId — 學生基本資料
app.get('/student/:studentId', async (c) => {
  try {
    const tenantId = c.req.header('X-Tenant-Id') as string;
    const { studentId } = c.req.param();

    const [student] = await db.select({
      name: manageStudents.name,
      grade: manageStudents.grade,
      school: manageStudents.school,
      status: manageStudents.status,
      created_at: manageStudents.createdAt,
    }).from(manageStudents)
      .where(and(eq(manageStudents.id, studentId), eq(manageStudents.tenantId, tenantId)));

    if (!student) {
      return c.json({ success: false, error: 'not_found', message: '找不到該學生' }, 404);
    }

    return c.json({ success: true, data: student });
  } catch (error) {
    console.error('parent-ext /student error:', error);
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

// GET /payments/:studentId — 學生繳費紀錄
app.get('/payments/:studentId', async (c) => {
  try {
    const tenantId = c.req.header('X-Tenant-Id') as string;
    const { studentId } = c.req.param();

    const [student] = await db.select({ name: manageStudents.name })
      .from(manageStudents)
      .where(and(eq(manageStudents.id, studentId), eq(manageStudents.tenantId, tenantId)));

    if (!student) {
      return c.json({ success: false, error: 'not_found', message: '找不到該學生' }, 404);
    }

    const enrollments = await db.select({ id: manageEnrollments.id })
      .from(manageEnrollments)
      .where(and(eq(manageEnrollments.studentId, studentId), eq(manageEnrollments.tenantId, tenantId)));

    const enrollmentIds = enrollments.map(e => e.id);

    let payments: { amount: number; method: string | null; date: Date | null; status: string | null }[] = [];
    if (enrollmentIds.length > 0) {
      const rows = await db.select({
        amount: managePayments.amount,
        method: managePayments.paymentMethod,
        date: managePayments.paidAt,
        status: managePayments.status,
      }).from(managePayments)
        .where(sql`${managePayments.enrollmentId} IN ${enrollmentIds}`)
        .orderBy(desc(managePayments.paidAt));

      payments = rows.map(p => ({ ...p, amount: Number(p.amount) }));
    }

    return c.json({
      success: true,
      data: {
        student_name: student.name,
        payments,
      },
    });
  } catch (error) {
    console.error('parent-ext /payments error:', error);
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

// GET /payments/:studentId/status — 學生目前繳費狀態
app.get('/payments/:studentId/status', async (c) => {
  try {
    const tenantId = c.req.header('X-Tenant-Id') as string;
    const { studentId } = c.req.param();

    const [student] = await db.select({ name: manageStudents.name })
      .from(manageStudents)
      .where(and(eq(manageStudents.id, studentId), eq(manageStudents.tenantId, tenantId)));

    if (!student) {
      return c.json({ success: false, error: 'not_found', message: '找不到該學生' }, 404);
    }

    const enrollments = await db.select({ id: manageEnrollments.id })
      .from(manageEnrollments)
      .where(and(eq(manageEnrollments.studentId, studentId), eq(manageEnrollments.tenantId, tenantId)));

    const enrollmentIds = enrollments.map(e => e.id);

    if (enrollmentIds.length === 0) {
      return c.json({
        success: true,
        data: {
          student_name: student.name,
          current_status: 'paid' as const,
          next_due: null,
          overdue_amount: 0,
        },
      });
    }

    const payments = await db.select({
      amount: managePayments.amount,
      paidAt: managePayments.paidAt,
      status: managePayments.status,
    }).from(managePayments)
      .where(sql`${managePayments.enrollmentId} IN ${enrollmentIds}`)
      .orderBy(desc(managePayments.paidAt));

    const overduePayments = payments.filter(p => p.status === 'overdue');
    const pendingPayments = payments.filter(p => p.status === 'pending');

    let current_status: 'paid' | 'pending' | 'overdue' = 'paid';
    if (overduePayments.length > 0) {
      current_status = 'overdue';
    } else if (pendingPayments.length > 0) {
      current_status = 'pending';
    }

    const overdueAmount = overduePayments.reduce((sum, p) => sum + Number(p.amount), 0);

    // next_due: earliest pending payment date, or null
    const nextPending = pendingPayments
      .filter(p => p.paidAt !== null)
      .sort((a, b) => (a.paidAt!.getTime()) - (b.paidAt!.getTime()))[0];
    const next_due = nextPending?.paidAt ? nextPending.paidAt.toISOString().split('T')[0] : null;

    return c.json({
      success: true,
      data: {
        student_name: student.name,
        current_status,
        next_due,
        overdue_amount: overdueAmount,
      },
    });
  } catch (error) {
    console.error('parent-ext /payments/status error:', error);
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

export default app;
