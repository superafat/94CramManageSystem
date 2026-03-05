/**
 * Platform Routes - 總後台路由入口
 *
 * /auth/*      — 認證（login 公開，me 需 JWT + SUPERADMIN）
 * /dashboard/* — 總覽（需 JWT + SUPERADMIN）
 */
import { Hono } from 'hono'
import type { RBACVariables } from '../../middleware/rbac'
import { authMiddleware } from '../../middleware/auth'
import { requireRole, Role } from '../../middleware/rbac'
import { platformAuthRoutes } from './auth'
import { platformDashboardRoutes } from './dashboard'
import { platformTenantsRoutes } from './tenants'
import { platformAccountsRoutes } from './accounts'
import { platformTrialsRoutes } from './trials'
import { platformFinanceRoutes } from './finance'
import { platformKnowledgeRoutes } from './knowledge'
import { platformAiRoutes } from './ai'
import { platformAnalyticsRoutes } from './analytics'
import { platformSecurityRoutes } from './security'
import { platformSettingsRoutes } from './settings'

export const platformRoutes = new Hono<{ Variables: RBACVariables }>()

// 認證路由不需要全域 auth middleware（login 是公開的，me 自己掛 middleware）
platformRoutes.route('/auth', platformAuthRoutes)

// 以下路由全部需要 JWT + SUPERADMIN
platformRoutes.use('*', authMiddleware)
platformRoutes.use('*', requireRole(Role.SUPERADMIN))

platformRoutes.route('/dashboard', platformDashboardRoutes)
platformRoutes.route('/tenants', platformTenantsRoutes)
platformRoutes.route('/accounts', platformAccountsRoutes)
platformRoutes.route('/trials', platformTrialsRoutes)
platformRoutes.route('/finance', platformFinanceRoutes)
platformRoutes.route('/knowledge', platformKnowledgeRoutes)
platformRoutes.route('/ai', platformAiRoutes)
platformRoutes.route('/analytics', platformAnalyticsRoutes)
platformRoutes.route('/security', platformSecurityRoutes)
platformRoutes.route('/settings', platformSettingsRoutes)
