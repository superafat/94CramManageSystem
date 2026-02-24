import { Hono } from 'hono';
import { db } from '../../db/index.js';
import { manageStudents, manageCourses } from '@94cram/shared/db';
import { eq } from 'drizzle-orm';
import type { Variables } from '../../middleware/auth.js';

const app = new Hono<{ Variables: Variables }>();

// POST /data/students
app.post('/students', async (c) => {
  try {
    const schoolId = c.get('schoolId') as string;
    const students = await db.select().from(manageStudents)
      .where(eq(manageStudents.tenantId, schoolId));

    return c.json({
      success: true,
      data: students.map(s => ({ student_id: s.id, name: s.name, class_name: s.grade })),
    });
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

// POST /data/classes
app.post('/classes', async (c) => {
  try {
    const schoolId = c.get('schoolId') as string;
    const courses = await db.select().from(manageCourses)
      .where(eq(manageCourses.tenantId, schoolId));

    return c.json({
      success: true,
      data: courses.map(co => co.name),
    });
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

export default app;
