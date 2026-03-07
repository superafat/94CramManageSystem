import { Hono } from 'hono'
import type { RBACVariables } from '../../middleware/rbac'
import { requireRole, Role } from '../../middleware/rbac'
import {
  aggregateLearningProfiles,
  calculateTeacherPerformance,
  generateRevenueForecast,
  calculateHealthScore,
  getLearningProfile,
} from '../../services/intelligence'
import { internalError, notFound } from './_helpers'

export const intelligenceRoutes = new Hono<{ Variables: RBACVariables }>()

intelligenceRoutes.use('*', requireRole(Role.SUPERADMIN))

// GET /intelligence/dashboard — 主儀表板
intelligenceRoutes.get('/intelligence/dashboard', async (c) => {
  const tenantId = c.get('user').tenant_id
  try {
    const [healthScore, forecasts, profiles] = await Promise.all([
      calculateHealthScore(tenantId),
      generateRevenueForecast(tenantId, 3),
      aggregateLearningProfiles(tenantId),
    ])
    return c.json({
      success: true,
      data: {
        healthScore,
        recentForecasts: forecasts,
        profileCount: profiles.length,
      },
    })
  } catch (err) {
    return internalError(c, 'Failed to load intelligence dashboard')
  }
})

// GET /intelligence/learning-profiles — 列表（可選 ?branchId）
intelligenceRoutes.get('/intelligence/learning-profiles', async (c) => {
  const tenantId = c.get('user').tenant_id
  const branchId = c.req.query('branchId')
  try {
    const profiles = await aggregateLearningProfiles(tenantId, branchId)
    return c.json({ success: true, data: profiles })
  } catch (err) {
    return internalError(c, 'Failed to fetch learning profiles')
  }
})

// POST /intelligence/learning-profiles/refresh — 觸發重新聚合
intelligenceRoutes.post('/intelligence/learning-profiles/refresh', async (c) => {
  const tenantId = c.get('user').tenant_id
  try {
    const profiles = await aggregateLearningProfiles(tenantId)
    return c.json({ success: true, data: profiles })
  } catch (err) {
    return internalError(c, 'Failed to refresh learning profiles')
  }
})

// GET /intelligence/learning-profiles/:studentId — 單一學生
intelligenceRoutes.get('/intelligence/learning-profiles/:studentId', async (c) => {
  const tenantId = c.get('user').tenant_id
  const { studentId } = c.req.param()
  try {
    const profile = await getLearningProfile(tenantId, studentId)
    if (!profile) return notFound(c, 'Learning profile not found')
    return c.json({ success: true, data: profile })
  } catch (err) {
    return internalError(c, 'Failed to fetch learning profile')
  }
})

// GET /intelligence/renewal-predictions — 依 renewalProbability ASC（高風險在前）
intelligenceRoutes.get('/intelligence/renewal-predictions', async (c) => {
  const tenantId = c.get('user').tenant_id
  try {
    const profiles = await aggregateLearningProfiles(tenantId)
    const sorted = [...profiles].sort((a, b) => a.renewalProbability - b.renewalProbability)
    return c.json({ success: true, data: sorted })
  } catch (err) {
    return internalError(c, 'Failed to fetch renewal predictions')
  }
})

// GET /intelligence/renewal-predictions/summary — 摘要統計
intelligenceRoutes.get('/intelligence/renewal-predictions/summary', async (c) => {
  const tenantId = c.get('user').tenant_id
  try {
    const profiles = await aggregateLearningProfiles(tenantId)
    const total = profiles.length
    const avgRenewal = total > 0
      ? Math.round(profiles.reduce((sum, p) => sum + p.renewalProbability, 0) / total)
      : 0
    const highRisk = profiles.filter(p => p.renewalProbability < 40).length
    const mediumRisk = profiles.filter(p => p.renewalProbability >= 40 && p.renewalProbability < 70).length
    const lowRisk = profiles.filter(p => p.renewalProbability >= 70).length
    return c.json({
      success: true,
      data: { total, avgRenewal, highRisk, mediumRisk, lowRisk },
    })
  } catch (err) {
    return internalError(c, 'Failed to fetch renewal predictions summary')
  }
})

// GET /intelligence/teacher-performance — 列表（預設 period=monthly）
intelligenceRoutes.get('/intelligence/teacher-performance', async (c) => {
  const tenantId = c.get('user').tenant_id
  const period = (c.req.query('period') === 'quarterly' ? 'quarterly' : 'monthly') as 'monthly' | 'quarterly'
  try {
    const performances = await calculateTeacherPerformance(tenantId, period)
    return c.json({ success: true, data: performances })
  } catch (err) {
    return internalError(c, 'Failed to fetch teacher performance')
  }
})

// GET /intelligence/teacher-performance/:teacherId — 單一教師
intelligenceRoutes.get('/intelligence/teacher-performance/:teacherId', async (c) => {
  const tenantId = c.get('user').tenant_id
  const { teacherId } = c.req.param()
  const period = (c.req.query('period') === 'quarterly' ? 'quarterly' : 'monthly') as 'monthly' | 'quarterly'
  try {
    const performances = await calculateTeacherPerformance(tenantId, period)
    const found = performances.find(p => p.teacherId === teacherId)
    if (!found) return notFound(c, 'Teacher performance not found')
    return c.json({ success: true, data: found })
  } catch (err) {
    return internalError(c, 'Failed to fetch teacher performance')
  }
})

// GET /intelligence/revenue-forecast — 未來 3 個月預測
intelligenceRoutes.get('/intelligence/revenue-forecast', async (c) => {
  const tenantId = c.get('user').tenant_id
  const months = parseInt(c.req.query('months') || '3', 10)
  try {
    const forecasts = await generateRevenueForecast(tenantId, months)
    return c.json({ success: true, data: forecasts })
  } catch (err) {
    return internalError(c, 'Failed to fetch revenue forecast')
  }
})

// GET /intelligence/health-score — 機構健康分數
intelligenceRoutes.get('/intelligence/health-score', async (c) => {
  const tenantId = c.get('user').tenant_id
  try {
    const healthScore = await calculateHealthScore(tenantId)
    return c.json({ success: true, data: healthScore })
  } catch (err) {
    return internalError(c, 'Failed to fetch health score')
  }
})
