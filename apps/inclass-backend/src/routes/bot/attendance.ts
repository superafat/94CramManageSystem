import { Hono } from 'hono';
import { db } from '../../db/index.js';
import { manageStudents, manageCourses, inclassAttendances } from '@94cram/shared/db';
import { eq, and, like, sql, gte, lte } from 'drizzle-orm';
import type { Variables } from '../../middleware/auth.js';

const app = new Hono<{ Variables: Variables }>();

// POST /attendance/leave
app.post('/leave', async (c) => {
  try {
    const body = c.get('botBody');
    const { student_name, student_id, date, reason } = body as {
      student_name?: string; student_id?: string; date?: string; reason?: string;
    };
    const schoolId = c.get('schoolId');

    if (!student_id && !student_name) {
      return c.json({ success: false, error: 'missing_param', message: '缺少 student_id 或 student_name' }, 400);
    }

    let students;
    if (student_id) {
      students = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, schoolId), eq(manageStudents.id, student_id)));
    } else {
      students = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, schoolId), eq(manageStudents.name, student_name!)));
    }

    if (students.length === 0) {
      const safeName = (student_name || '').replace(/[%_\\]/g, '');
      const suggestions = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, schoolId), like(manageStudents.name, `%${safeName}%`)))
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
    const body = c.get('botBody');
    const { student_name, student_id, date } = body as {
      student_name?: string; student_id?: string; date?: string;
    };
    const schoolId = c.get('schoolId');

    if (!student_id && !student_name) {
      return c.json({ success: false, error: 'missing_param', message: '缺少 student_id 或 student_name' }, 400);
    }

    let students;
    if (student_id) {
      students = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, schoolId), eq(manageStudents.id, student_id)));
    } else {
      students = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, schoolId), eq(manageStudents.name, student_name!)));
    }

    if (students.length === 0) {
      const safeName = (student_name || '').replace(/[%_\\]/g, '');
      const suggestions = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, schoolId), like(manageStudents.name, `%${safeName}%`)))
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
    const body = c.get('botBody');
    const { class_name, date } = body as {
      class_name?: string; date?: string;
    };
    const schoolId = c.get('schoolId');
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

// POST /attendance/report
app.post('/report', async (c) => {
  try {
    const body = c.get('botBody');
    const { student_name, start_date, end_date } = body as {
      student_name?: string; start_date?: string; end_date?: string;
    };
    const schoolId = c.get('schoolId');

    if (!student_name) {
      return c.json({ success: false, error: 'missing_param', message: '缺少 student_name' }, 400);
    }

    const students = await db.select().from(manageStudents)
      .where(and(eq(manageStudents.tenantId, schoolId), eq(manageStudents.name, student_name)));

    if (students.length === 0) {
      const safeName = (student_name || '').replace(/[%_\\]/g, '');
      const suggestions = await db.select().from(manageStudents)
        .where(and(eq(manageStudents.tenantId, schoolId), like(manageStudents.name, `%${safeName}%`)))
        .limit(5);
      return c.json({
        success: false,
        error: 'student_not_found',
        message: `找不到學生「${student_name}」`,
        suggestions: suggestions.map(s => ({ student_id: s.id, name: s.name, class: s.grade })),
      });
    }

    const student = students[0];
    const from = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const to = end_date || new Date().toISOString().split('T')[0];

    const records = await db.select({
      status: inclassAttendances.status,
    })
      .from(inclassAttendances)
      .where(
        and(
          eq(inclassAttendances.tenantId, schoolId),
          eq(inclassAttendances.studentId, student.id),
          gte(inclassAttendances.date, new Date(from)),
          lte(inclassAttendances.date, new Date(to)),
        )
      );

    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const leave = records.filter(r => r.status === 'leave').length;

    return c.json({
      success: true,
      message: `${student.name} ${from} ~ ${to} 出缺勤報告`,
      data: {
        student_name: student.name,
        class_name: student.grade,
        start_date: from,
        end_date: to,
        total: records.length,
        present,
        absent,
        late,
        leave,
        attendance_rate: records.length > 0 ? Math.round((present / records.length) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('[Bot] report error:', error);
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

export default app;
