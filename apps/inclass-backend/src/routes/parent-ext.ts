import { Hono } from 'hono';
import { timingSafeEqual } from 'node:crypto';
import { db } from '../db/index.js';
import {
  inclassAttendances,
  inclassSchedules,
  manageStudents,
  manageCourses,
  manageEnrollments,
} from '@94cram/shared/db';
import { eq, and, gte, lte, desc, inArray } from 'drizzle-orm';

const app = new Hono();

// X-Internal-Key auth middleware
app.use('*', async (c, next) => {
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected) return c.json({ error: 'Service unavailable' }, 503);
  const key = c.req.header('X-Internal-Key');
  if (!key) return c.json({ error: 'Forbidden' }, 403);
  const keyBuf = Buffer.from(key);
  const expectedBuf = Buffer.from(expected);
  if (keyBuf.length !== expectedBuf.length || !timingSafeEqual(keyBuf, expectedBuf)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
});

// GET /attendance/:studentId — recent 30 attendance records
app.get('/attendance/:studentId', async (c) => {
  const tenantId = c.req.header('X-Tenant-Id');
  if (!tenantId) return c.json({ error: 'X-Tenant-Id header required' }, 400);

  const { studentId } = c.req.param();

  try {
    const [student] = await db
      .select({ name: manageStudents.name })
      .from(manageStudents)
      .where(and(eq(manageStudents.id, studentId), eq(manageStudents.tenantId, tenantId)))
      .limit(1);

    if (!student) return c.json({ error: 'Student not found' }, 404);

    const records = await db
      .select({
        date: inclassAttendances.date,
        status: inclassAttendances.status,
        check_in_time: inclassAttendances.checkInTime,
        note: inclassAttendances.note,
      })
      .from(inclassAttendances)
      .where(
        and(
          eq(inclassAttendances.studentId, studentId),
          eq(inclassAttendances.tenantId, tenantId)
        )
      )
      .orderBy(desc(inclassAttendances.date))
      .limit(30);

    return c.json({
      success: true,
      data: {
        student_name: student.name,
        records,
      },
    });
  } catch (error) {
    console.error('[parent-ext] GET /attendance/:studentId error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET /attendance/:studentId/summary — monthly attendance summary
app.get('/attendance/:studentId/summary', async (c) => {
  const tenantId = c.req.header('X-Tenant-Id');
  if (!tenantId) return c.json({ error: 'X-Tenant-Id header required' }, 400);

  const { studentId } = c.req.param();

  try {
    const [student] = await db
      .select({ name: manageStudents.name })
      .from(manageStudents)
      .where(and(eq(manageStudents.id, studentId), eq(manageStudents.tenantId, tenantId)))
      .limit(1);

    if (!student) return c.json({ error: 'Student not found' }, 404);

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const records = await db
      .select({ status: inclassAttendances.status })
      .from(inclassAttendances)
      .where(
        and(
          eq(inclassAttendances.studentId, studentId),
          eq(inclassAttendances.tenantId, tenantId),
          gte(inclassAttendances.date, firstDayOfMonth),
          lte(inclassAttendances.date, today)
        )
      );

    let present_days = 0;
    let absent_days = 0;
    let late_days = 0;
    let leave_days = 0;

    for (const r of records) {
      if (r.status === 'present') present_days++;
      else if (r.status === 'absent') absent_days++;
      else if (r.status === 'late') late_days++;
      else if (r.status === 'leave') leave_days++;
    }

    const total = records.length;
    const attendance_rate =
      total === 0 ? 0 : Math.round(((present_days + late_days) / total) * 100);

    return c.json({
      success: true,
      data: {
        student_name: student.name,
        month: monthStr,
        present_days,
        absent_days,
        late_days,
        leave_days,
        attendance_rate,
      },
    });
  } catch (error) {
    console.error('[parent-ext] GET /attendance/:studentId/summary error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET /schedule/:studentId — student's weekly schedule
app.get('/schedule/:studentId', async (c) => {
  const tenantId = c.req.header('X-Tenant-Id');
  if (!tenantId) return c.json({ error: 'X-Tenant-Id header required' }, 400);

  const { studentId } = c.req.param();

  try {
    const [student] = await db
      .select({ name: manageStudents.name })
      .from(manageStudents)
      .where(and(eq(manageStudents.id, studentId), eq(manageStudents.tenantId, tenantId)))
      .limit(1);

    if (!student) return c.json({ error: 'Student not found' }, 404);

    const enrollments = await db
      .select({ courseId: manageEnrollments.courseId })
      .from(manageEnrollments)
      .where(
        and(
          eq(manageEnrollments.studentId, studentId),
          eq(manageEnrollments.tenantId, tenantId),
          eq(manageEnrollments.status, 'active')
        )
      );

    const courseIds = enrollments.map((e) => e.courseId);

    if (courseIds.length === 0) {
      return c.json({
        success: true,
        data: { student_name: student.name, schedules: [] },
      });
    }

    const schedules = await db
      .select({
        day_of_week: inclassSchedules.dayOfWeek,
        start_time: inclassSchedules.startTime,
        end_time: inclassSchedules.endTime,
        course_name: manageCourses.name,
        room: inclassSchedules.room,
      })
      .from(inclassSchedules)
      .innerJoin(manageCourses, eq(inclassSchedules.courseId, manageCourses.id))
      .where(
        and(
          eq(inclassSchedules.tenantId, tenantId),
          inArray(inclassSchedules.courseId, courseIds)
        )
      )
      .orderBy(inclassSchedules.dayOfWeek, inclassSchedules.startTime);

    return c.json({
      success: true,
      data: { student_name: student.name, schedules },
    });
  } catch (error) {
    console.error('[parent-ext] GET /schedule/:studentId error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /leave — validate leave request (no DB write; approval handled by bot-gateway)
app.post('/leave', async (c) => {
  const tenantId = c.req.header('X-Tenant-Id');
  if (!tenantId) return c.json({ error: 'X-Tenant-Id header required' }, 400);

  try {
    const body = await c.req.json<{
      tenant_id?: string;
      student_id: string;
      student_name?: string;
      date: string;
      reason: string;
    }>();

    const { student_id, date, reason } = body;

    if (!student_id || !date || !reason) {
      return c.json({ error: 'student_id, date and reason are required' }, 400);
    }

    // Verify student exists and belongs to tenant
    const [student] = await db
      .select({ name: manageStudents.name })
      .from(manageStudents)
      .where(and(eq(manageStudents.id, student_id), eq(manageStudents.tenantId, tenantId)))
      .limit(1);

    if (!student) return c.json({ error: 'Student not found' }, 404);

    return c.json({
      success: true,
      message: '請假申請已建立',
      data: {
        student_id,
        student_name: student.name,
        date,
        reason,
        status: 'pending',
      },
    });
  } catch (error) {
    console.error('[parent-ext] POST /leave error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
