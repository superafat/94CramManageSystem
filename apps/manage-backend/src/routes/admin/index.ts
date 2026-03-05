import { Hono } from 'hono'
import type { RBACVariables } from '../../middleware/rbac'
import { authMiddleware } from '../../middleware/auth'
import { knowledgeRoutes } from './knowledge'
import { tenantsRoutes } from './tenants'
import { studentsRoutes } from './students'
import { schedulingRoutes } from './scheduling'
// [2026-03-05] Migrated to 94inClass — keeping code for rollback
// import { attendanceRoutes } from './attendance'
// [2026-03-05] Migrated to 94inClass — keeping code for rollback
// import { gradesRoutes } from './grades'
import { reportsRoutes } from './reports'
import { billingRoutes } from './billing'
import { auditRoutes } from './audit'
import { aiProvidersRoutes } from './ai-providers'
import { conversationsRoutes } from './conversations'
import { settingsRoutes } from './settings'
// [2026-03-05] Migrated to 94inClass — keeping code for rollback
// import { contactBookRoutes } from './contact-book'
import { analyticsRoutes } from './analytics'
import { makeupSlotsRoutes } from './makeup-slots'
// [2026-03-05] Migrated to 94inClass — keeping code for rollback
// import { makeupClassesRoutes } from './makeup-classes'
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
// [2026-03-05] Migrated to 94inClass — keeping code for rollback
// adminRoutes.route('/', attendanceRoutes)
// [2026-03-05] Migrated to 94inClass — keeping code for rollback
// adminRoutes.route('/', gradesRoutes)
adminRoutes.route('/', reportsRoutes)
adminRoutes.route('/', billingRoutes)
adminRoutes.route('/', auditRoutes)
adminRoutes.route('/', aiProvidersRoutes)
adminRoutes.route('/', conversationsRoutes)
adminRoutes.route('/', settingsRoutes)
// [2026-03-05] Migrated to 94inClass — keeping code for rollback
// adminRoutes.route('/', contactBookRoutes)
adminRoutes.route('/', analyticsRoutes)
adminRoutes.route('/', makeupSlotsRoutes)
// [2026-03-05] Migrated to 94inClass — keeping code for rollback
// adminRoutes.route('/', makeupClassesRoutes)
adminRoutes.route('/', enrollmentRoutes)
adminRoutes.route('/', bindingTokensRoutes)
adminRoutes.route('/', financeRoutes)
