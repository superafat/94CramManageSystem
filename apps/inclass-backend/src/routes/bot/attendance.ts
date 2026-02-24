import { Hono } from 'hono';
import { db } from '../../db/index.js';
import { manageStudents, manageCourses, inclassAttendances } from '@94cram/shared/db';
import { eq, and, like, sql } from 'drizzle-orm';
import type { Variables } from '../../middleware/auth.js';

const app = new Hono<{ Variables: Variables }>();

// POST /attendance/leave
app.post('/leave', async (c) => {
  try {
    const { tenant_id, student_name, student_id, date, reason } = await c.req.json();
    const schoolId = c.get('schoolId') as string;

    let students;
    if (student_id) {
      students = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, schoolId), eq(manageStudents.id, student_id)));
    } else {
      students = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, schoolId), eq(manageStudents.name, student_name)));
    }

    if (students.length === 0) {
      const suggestions = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, schoolId), like(manageStudents.name, `%${student_name}%`)))
        .limit(5);
      return c.json({
        success: false,
        error: 'student_not_found',
        message: `找不到學生「${student_name}」`,
        suggestions: suggestions.map(s => ({ student_id: s.id, name: s.name, class: s.grade })),
      });
    }

    const student = students[0];
    const targetDate = date || new Date().toISOString().split('T')[0];

    const enrollments = await db.select().from(manageCourses)
      .where(eq(manageCourses.tenantId, schoolId))
      .limit(1);
    const courseId = enrollments[0]?.id;

    if (courseId) {
      await db.insert(inclassAttendances).values({
        tenantId: schoolId,
        studentId: student.id,
        courseId,
        date: new Date(targetDate),
        status: 'leave',
        note: reason || '由 94CramBot 登記',
      });
    }

    return c.json({
      success: true,
      message: `已登記 ${student.name} ${targetDate} 請假`,
      data: { student_name: student.name, class_name: student.grade, date: targetDate, status: 'leave' },
    });
  } catch (error) {
    console.error('[Bot] leave error:', error);
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

// POST /attendance/late
app.post('/late', async (c) => {
  try {
    const { tenant_id, student_name, student_id, date } = await c.req.json();
    const schoolId = c.get('schoolId') as string;

    let students;
    if (student_id) {
      students = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, schoolId), eq(manageStudents.id, student_id)));
    } else {
      students = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, schoolId), eq(manageStudents.name, student_name)));
    }

    if (students.length === 0) {
      const suggestions = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, schoolId), like(manageStudents.name, `%${student_name}%`)))
        .limit(5);
      return c.json({
        success: false, error: 'student_not_found',
        message: `找不到學生「${student_name}」`,
        suggestions: suggestions.map(s => ({ student_id: s.id, name: s.name, class: s.grade })),
      });
    }

    const student = students[0];
    const targetDate = date || new Date().toISOString().split('T')[0];

    const enrollments = await db.select().from(manageCourses)
      .where(eq(manageCourses.tenantId, schoolId)).limit(1);
    const courseId = enrollments[0]?.id;

    if (courseId) {
      await db.insert(inclassAttendances).values({
        tenantId: schoolId,
        studentId: student.id,
        courseId,
        date: new Date(targetDate),
        status: 'late',
        checkInTime: new Date(),
        checkInMethod: 'manual',
        note: '由 94CramBot 登記',
      });
    }

    return c.json({
      success: true,
      message: `已登記 ${student.name} ${targetDate} 遲到`,
      data: { student_name: student.name, class_name: student.grade, date: targetDate, status: 'late' },
    });
  } catch (error) {
    console.error('[Bot] late error:', error);
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

// POST /attendance/list
app.post('/list', async (c) => {
  try {
    const { tenant_id, class_name, date } = await c.req.json();
    const schoolId = c.get('schoolId') as string;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const records = await db.select({
      id: inclassAttendances.id,
      studentName: manageStudents.name,
      className: manageStudents.grade,
      status: inclassAttendances.status,
      note: inclassAttendances.note,
    })
      .from(inclassAttendances)
      .innerJoin(manageStudents, eq(inclassAttendances.studentId, manageStudents.id))
      .where(
        and(
          eq(inclassAttendances.tenantId, schoolId),
          sql`DATE(${inclassAttendances.date}) = ${targetDate}`,
          class_name ? eq(manageStudents.grade, class_name) : undefined,
        )
      );

    return c.json({
      success: true,
      message: `${targetDate} ${class_name || '全校'}出缺勤狀況`,
      data: {
        date: targetDate,
        class_name,
        total: records.length,
        present: records.filter(r => r.status === 'present').length,
        absent: records.filter(r => r.status === 'absent').length,
        leave: records.filter(r => r.status === 'leave').length,
        late: records.filter(r => r.status === 'late').length,
        records,
      },
    });
  } catch (error) {
    console.error('[Bot] list error:', error);
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

export default app;
