import { Hono } from 'hono'
import { db } from '../../db'
import { manageStudents } from '@94cram/shared/db'
import { eq, and, like } from 'drizzle-orm'

type BotExtVariables = { tenantId: string; botRequest: boolean; botBody: Record<string, unknown> }

const app = new Hono<{ Variables: BotExtVariables }>()

// POST /student/create
app.post('/create', async (c) => {
  try {
    const { tenant_id, name, class_name, parent_phone, parent_name } = c.get('botBody') as any
    const tenantId = c.get('tenantId') as string

    const existing = await db.select().from(manageStudents)
      .where(and(eq(manageStudents.tenantId, tenantId), eq(manageStudents.name, name)))

    if (existing.length > 0) {
      return c.json({
        success: false, error: 'duplicate_name',
        message: `已存在名為「${name}」的學生`,
        suggestions: existing.map(s => ({ student_id: s.id, name: s.name, class_name: s.grade })),
      })
    }

    const [student] = await db.insert(manageStudents).values({
      tenantId,
      name,
      grade: class_name,
      guardianPhone: parent_phone,
      guardianName: parent_name,
    }).returning()

    return c.json({
      success: true,
      message: `已新增學生 ${name}（${class_name || '未分班'}）`,
      data: { student_id: student.id, name: student.name, class_name: student.grade },
    })
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

// POST /student/search
app.post('/search', async (c) => {
  try {
    const { tenant_id, keyword } = c.get('botBody') as any
    const tenantId = c.get('tenantId') as string

    const safeKeyword = (keyword || '').replace(/[%_\\]/g, '');
    const students = await db.select().from(manageStudents)
      .where(and(eq(manageStudents.tenantId, tenantId), like(manageStudents.name, `%${safeKeyword}%`)))
      .limit(10)

    return c.json({
      success: true,
      data: students.map(s => ({ student_id: s.id, name: s.name, class_name: s.grade, phone: s.phone })),
    })
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

export default app
