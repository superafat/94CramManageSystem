import { Hono } from 'hono'
import { db } from '../../db'
import { manageStudents, manageCourses } from '@94cram/shared/db'
import { eq } from 'drizzle-orm'
import { Firestore } from '@google-cloud/firestore'

type BotExtVariables = { tenantId: string; botRequest: boolean; botBody: Record<string, unknown> }

const app = new Hono<{ Variables: BotExtVariables }>()

// POST /data/students
app.post('/students', async (c) => {
  try {
    const tenantId = c.get('tenantId') as string
    const students = await db.select().from(manageStudents)
      .where(eq(manageStudents.tenantId, tenantId))

    return c.json({
      success: true,
      data: students.map(s => ({ student_id: s.id, name: s.name, class_name: s.grade })),
    })
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

// POST /data/classes
app.post('/classes', async (c) => {
  try {
    const tenantId = c.get('tenantId') as string
    const courses = await db.select().from(manageCourses)
      .where(eq(manageCourses.tenantId, tenantId))

    return c.json({ success: true, data: courses.map(co => co.name) })
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

// POST /data/bindcode
app.post('/bindcode', async (c) => {
  try {
    const { tenant_id, tenant_name } = c.get('botBody') as any
    const tenantId = c.get('tenantId') as string

    const code = String(Math.floor(100000 + Math.random() * 900000))

    const firestore = new Firestore()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    await firestore.collection('bot_bind_codes').doc(code).set({
      tenant_id: tenantId,
      tenant_name: tenant_name || '',
      code,
      created_at: new Date(),
      expires_at: expiresAt,
      used: false,
    })

    return c.json({
      success: true,
      message: `綁定碼已產生，5 分鐘內有效`,
      data: { code, expires_at: expiresAt.toISOString() },
    })
  } catch (error) {
    console.error('[Bot] bindcode error:', error)
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500)
  }
})

export default app
