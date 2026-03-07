import { Hono } from 'hono';
import { db } from '../../db/index.js';
import { manageStudents, manageCourses } from '@94cram/shared/db';
import { eq } from 'drizzle-orm';
import type { Variables } from '../../middleware/auth.js';
import { logger } from '../../utils/logger.js';

const app = new Hono<{ Variables: Variables }>();

// POST /data/students
app.post('/students', async (c) => {
  const botBody = c.get('botBody') as { tenant_id?: string } | undefined;
  const schoolId = (c.get('schoolId') as string | undefined) ?? botBody?.tenant_id;

  try {
    if (!schoolId) {
      return c.json({ success: false, error: 'missing_tenant', message: '缺少 tenant_id' }, 400);
    }

    const students = await db.select({
      id: manageStudents.id,
      name: manageStudents.name,
      grade: manageStudents.grade,
    }).from(manageStudents)
      .where(eq(manageStudents.tenantId, schoolId));

    return c.json({
      success: true,
      data: students.map(s => ({ student_id: s.id, name: s.name, class_name: s.grade })),
    });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)), schoolId }, '[bot/data/students] failed');
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

// POST /data/classes
app.post('/classes', async (c) => {
  const botBody = c.get('botBody') as { tenant_id?: string } | undefined;
  const schoolId = (c.get('schoolId') as string | undefined) ?? botBody?.tenant_id;

  try {
    if (!schoolId) {
      return c.json({ success: false, error: 'missing_tenant', message: '缺少 tenant_id' }, 400);
    }

    const courses = await db.select({
      name: manageCourses.name,
    }).from(manageCourses)
      .where(eq(manageCourses.tenantId, schoolId));

    return c.json({
      success: true,
      data: courses.map(co => co.name),
    });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)), schoolId }, '[bot/data/classes] failed');
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

export default app;
