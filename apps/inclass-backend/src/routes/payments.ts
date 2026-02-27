import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db/index.js'
import { inclassPaymentRecords, manageStudents, manageCourses } from '@94cram/shared/db'
import { and, eq } from 'drizzle-orm'
import type { Variables } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

const paymentsRouter = new Hono<{ Variables: Variables }>()

const paymentRecordSchema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
  paymentType: z.enum(['monthly', 'quarterly', 'semester', 'yearly']),
  amount: z.number().positive(),
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  paymentDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
}).strict()

const batchSchema = z.object({
  records: z.array(paymentRecordSchema).min(1).max(100),
})

// GET /api/payments — list payment records
paymentsRouter.get('/', async (c) => {
  try {
    const schoolId = c.get('schoolId')
    const records = await db.select().from(inclassPaymentRecords).where(
      eq(inclassPaymentRecords.tenantId, schoolId)
    )
    return c.json({ records })
  } catch (e) {
    logger.error({ err: e instanceof Error ? e : new Error(String(e)) }, `[API Error] ${c.req.path} Error fetching payments`)
    return c.json({ error: 'Failed to fetch payments' }, 500)
  }
})

export default paymentsRouter
