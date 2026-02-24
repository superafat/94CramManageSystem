import { Hono } from 'hono'
import type { Variables } from '../middleware/auth.js'

const miscRouter = new Hono<{ Variables: Variables }>()

miscRouter.all('*', (c) => {
  // FIXME: misc endpoints 需依 shared schema 逐項重建
  return c.json({ error: 'Misc API is not implemented on shared schema yet' }, 501)
})

export default miscRouter
