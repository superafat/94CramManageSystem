import { Hono } from 'hono'
import type { Variables } from '../middleware/auth.js'

const paymentsRouter = new Hono<{ Variables: Variables }>()

paymentsRouter.all('*', (c) => {
  // FIXME: payment records API 尚未完成 shared schema 對齊
  return c.json({ error: 'Payments API is not implemented on shared schema yet' }, 501)
})

export default paymentsRouter
