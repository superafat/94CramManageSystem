import { Hono } from 'hono'
import { authMiddleware } from '../../middleware/auth'
import { contactBookRoutes } from './contact-book'
import type { RBACVariables } from '../../middleware/rbac'

type Variables = RBACVariables & { tenantId: string }

export const parentRoutes = new Hono<{ Variables: Variables }>()
parentRoutes.use('*', authMiddleware)
parentRoutes.route('/contact-book', contactBookRoutes)
