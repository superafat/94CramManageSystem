import { Hono } from 'hono'
import type { RBACVariables } from '../../middleware/rbac'
import { authMiddleware } from '../../middleware/auth'
import { knowledgeRoutes } from './knowledge'
import { tenantsRoutes } from './tenants'
import { studentsRoutes } from './students'
import { schedulingRoutes } from './scheduling'
import { reportsRoutes } from './reports'
import { billingRoutes } from './billing'
import { auditRoutes } from './audit'
import { aiProvidersRoutes } from './ai-providers'
import { conversationsRoutes } from './conversations'
import { settingsRoutes } from './settings'
import { analyticsRoutes } from './analytics'
import { makeupSlotsRoutes } from './makeup-slots'
import { enrollmentRoutes } from './enrollments'
import { bindingTokensRoutes } from './binding-tokens'
import { financeRoutes } from './finance'

export const adminRoutes = new Hono<{ Variables: RBACVariables }>()

// ===== Auth gate: ALL admin routes require valid JWT =====
adminRoutes.use('*', authMiddleware)

adminRoutes.route('/', knowledgeRoutes)
adminRoutes.route('/', tenantsRoutes)
adminRoutes.route('/', studentsRoutes)
adminRoutes.route('/', schedulingRoutes)
adminRoutes.route('/', reportsRoutes)
adminRoutes.route('/', billingRoutes)
adminRoutes.route('/', auditRoutes)
adminRoutes.route('/', aiProvidersRoutes)
adminRoutes.route('/', conversationsRoutes)
adminRoutes.route('/', settingsRoutes)
adminRoutes.route('/', analyticsRoutes)
adminRoutes.route('/', makeupSlotsRoutes)
adminRoutes.route('/', enrollmentRoutes)
adminRoutes.route('/', bindingTokensRoutes)
adminRoutes.route('/', financeRoutes)
