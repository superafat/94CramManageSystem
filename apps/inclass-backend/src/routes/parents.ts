import { Hono } from 'hono'
import type { Variables } from '../middleware/auth.js'

const parentsRouter = new Hono<{ Variables: Variables }>()

parentsRouter.all('*', (c) => {
  // FIXME: shared schema 尚無 parents table
  return c.json({ error: 'Parents API is not implemented on shared schema yet' }, 501)
})

export default parentsRouter
