import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { RBACVariables } from '../../middleware/rbac'
import { requirePermission, Permission } from '../../middleware/rbac'
import { providerFactory, quotaManager } from '../../ai/providers'
import type { QuotaUsage } from '../../ai/quota'
import { success, internalError } from './_helpers'

const aiProvidersRoutes = new Hono<{ Variables: RBACVariables }>()

// Get all providers status
aiProvidersRoutes.get('/ai/providers', requirePermission(Permission.REPORTS_READ), async (c) => {
  try {
    const status = await providerFactory.getProvidersStatus()
    const availableProviders = providerFactory.getAvailableProviders()

    return success(c, {
      providers: status,
      available: availableProviders,
    })
  } catch (err) {
    return internalError(c, err)
  }
})

// Get quota statistics
aiProvidersRoutes.get('/ai/quota', requirePermission(Permission.REPORTS_READ), async (c) => {
  try {
    const allStats = quotaManager.getAllStats()
    const totalCost24h = quotaManager.getTotalCost(24)
    const totalCost7d = quotaManager.getTotalCost(168)

    return success(c, {
      stats: allStats,
      totalCost: {
        last24Hours: totalCost24h,
        last7Days: totalCost7d,
      },
    })
  } catch (err) {
    return internalError(c, err)
  }
})

const providerHistorySchema = z.object({
  provider: z.enum(['gemini', 'claude', 'minimax']),
  hours: z.coerce.number().min(1).max(168).default(24),
})

// Get provider usage history
aiProvidersRoutes.get('/ai/quota/:provider/history',
  requirePermission(Permission.REPORTS_READ),
  zValidator('param', providerHistorySchema.pick({ provider: true })),
  zValidator('query', providerHistorySchema.pick({ hours: true }).partial()),
  async (c) => {
    const { provider } = c.req.valid('param')
    const { hours = 24 } = c.req.valid('query')

    try {
      const history = quotaManager.getUsageHistory(provider, hours)

      return success(c, {
        provider,
        hours,
        history,
        total: {
          requests: history.length,
          tokens: history.reduce((sum: number, h: QuotaUsage) => sum + h.tokens, 0),
          cost: history.reduce((sum: number, h: QuotaUsage) => sum + h.estimatedCost, 0),
        },
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

const quotaLimitSchema = z.object({
  provider: z.enum(['gemini', 'claude', 'minimax']),
  requestsPerMinute: z.number().min(1).optional(),
  requestsPerDay: z.number().min(1).optional(),
  costPerDay: z.number().min(0).optional(),
})

// Set provider quota limits
aiProvidersRoutes.post('/ai/quota/limits',
  requirePermission(Permission.SYSTEM_ADMIN),
  zValidator('json', quotaLimitSchema),
  async (c) => {
    const { provider, ...limits } = c.req.valid('json')

    try {
      quotaManager.setLimit(provider, limits)

      return success(c, {
        message: 'Quota limits updated',
        provider,
        limits: quotaManager.getStats(provider).limits,
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

// Reset quota for a provider
aiProvidersRoutes.post('/ai/quota/:provider/reset',
  requirePermission(Permission.SYSTEM_ADMIN),
  zValidator('param', providerHistorySchema.pick({ provider: true })),
  async (c) => {
    const { provider } = c.req.valid('param')

    try {
      quotaManager.reset(provider)

      return success(c, {
        message: 'Quota reset successfully',
        provider,
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

const strategySchema = z.object({
  strategy: z.enum(['web', 'line-bot', 'balanced']),
})

// Set provider strategy
aiProvidersRoutes.post('/ai/strategy',
  requirePermission(Permission.SYSTEM_ADMIN),
  zValidator('json', strategySchema),
  async (c) => {
    const { strategy } = c.req.valid('json')

    try {
      providerFactory.setStrategy(strategy)
      const chain = providerFactory.getFallbackChain()

      return success(c, {
        message: 'Strategy updated',
        strategy,
        fallbackChain: chain,
      })
    } catch (err) {
      return internalError(c, err)
    }
  }
)

export { aiProvidersRoutes }
