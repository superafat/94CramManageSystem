import { Hono } from 'hono'
import { authMiddleware } from '../../middleware/auth'
// [2026-03-05] Migrated to 94inClass — keeping code for rollback
// import { contactBookRoutes } from './contact-book'
import type { RBACVariables } from '../../middleware/rbac'

type Variables = RBACVariables & { tenantId: string }

export const parentRoutes = new Hono<{ Variables: Variables }>()
parentRoutes.use('*', authMiddleware)
// [2026-03-05] Migrated to 94inClass — keeping code for rollback
// parentRoutes.route('/contact-book', contactBookRoutes)
