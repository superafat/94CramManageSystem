import type { ProviderName } from './providers/types'
import { getRedis } from '@94cram/shared/redis'

export interface QuotaUsage {
  provider: ProviderName
  requests: number
  tokens: number
  estimatedCost: number
  timestamp: Date
}

export interface QuotaLimit {
  requestsPerMinute: number
  requestsPerDay: number
  costPerDay: number
}

export interface QuotaStats {
  provider: ProviderName
  currentMinute: {
    requests: number
    tokens: number
    cost: number
  }
  currentDay: {
    requests: number
    tokens: number
    cost: number
  }
  limits: QuotaLimit
  isLimited: boolean
}

export class QuotaManager {
  private usage = new Map<ProviderName, QuotaUsage[]>()
  private limits: Map<ProviderName, QuotaLimit>

  constructor() {
    this.limits = new Map([
      ['gemini', { requestsPerMinute: 60, requestsPerDay: 1500, costPerDay: 5.0 }],
      ['claude', { requestsPerMinute: 50, requestsPerDay: 1000, costPerDay: 10.0 }],
      ['minimax', { requestsPerMinute: 30, requestsPerDay: 500, costPerDay: 3.0 }],
    ])
  }

  recordUsage(provider: ProviderName, tokens: number, cost: number) {
    const record: QuotaUsage = {
      provider,
      requests: 1,
      tokens,
      estimatedCost: cost,
      timestamp: new Date(),
    }

    const records = this.usage.get(provider) || []
    records.push(record)
    this.usage.set(provider, records)

    // 清理超過 24 小時的記錄
    this.cleanupOldRecords(provider)

    // Redis fire-and-forget sync（跨實例追蹤）
    const redis = getRedis()
    if (redis) {
      const minKey = `quota:${provider}:min:${Math.floor(Date.now() / 60000)}`
      const dayKey = `quota:${provider}:day:${new Date().toISOString().slice(0, 10)}`
      const costKey = `quota:${provider}:cost:${new Date().toISOString().slice(0, 10)}`
      Promise.all([
        redis.incr(minKey).then(() => redis.pexpire(minKey, 120000)),
        redis.incr(dayKey).then(() => redis.pexpire(dayKey, 90000000)),
        redis.incrbyfloat(costKey, cost).then(() => redis.pexpire(costKey, 90000000)),
      ]).catch(() => {})
    }
  }

  getStats(provider: ProviderName): QuotaStats {
    const records = this.usage.get(provider) || []
    const now = Date.now()
    const oneMinuteAgo = now - 60 * 1000
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    const minuteRecords = records.filter(r => r.timestamp.getTime() > oneMinuteAgo)
    const dayRecords = records.filter(r => r.timestamp.getTime() > oneDayAgo)

    const currentMinute = {
      requests: minuteRecords.length,
      tokens: minuteRecords.reduce((sum, r) => sum + r.tokens, 0),
      cost: minuteRecords.reduce((sum, r) => sum + r.estimatedCost, 0),
    }

    const currentDay = {
      requests: dayRecords.length,
      tokens: dayRecords.reduce((sum, r) => sum + r.tokens, 0),
      cost: dayRecords.reduce((sum, r) => sum + r.estimatedCost, 0),
    }

    const limits = this.limits.get(provider) || {
      requestsPerMinute: 60,
      requestsPerDay: 1000,
      costPerDay: 5.0,
    }

    const isLimited =
      currentMinute.requests >= limits.requestsPerMinute ||
      currentDay.requests >= limits.requestsPerDay ||
      currentDay.cost >= limits.costPerDay

    return {
      provider,
      currentMinute,
      currentDay,
      limits,
      isLimited,
    }
  }

  async checkLimit(provider: ProviderName): Promise<boolean> {
    const redis = getRedis()
    if (redis) {
      try {
        const limits = this.limits.get(provider)
        if (!limits) return true
        const [minCount, dayCount, dayCost] = await Promise.all([
          redis.get<number>(`quota:${provider}:min:${Math.floor(Date.now() / 60000)}`),
          redis.get<number>(`quota:${provider}:day:${new Date().toISOString().slice(0, 10)}`),
          redis.get<number>(`quota:${provider}:cost:${new Date().toISOString().slice(0, 10)}`),
        ])
        return (minCount ?? 0) < limits.requestsPerMinute
            && (dayCount ?? 0) < limits.requestsPerDay
            && (dayCost ?? 0) < limits.costPerDay
      } catch { /* fall through to local */ }
    }
    // Fallback to local
    const stats = this.getStats(provider)
    return !stats.isLimited
  }

  getAllStats(): QuotaStats[] {
    const providers: ProviderName[] = ['gemini', 'claude', 'minimax']
    return providers.map(p => this.getStats(p))
  }

  setLimit(provider: ProviderName, limits: Partial<QuotaLimit>) {
    const current = this.limits.get(provider) || {
      requestsPerMinute: 60,
      requestsPerDay: 1000,
      costPerDay: 5.0,
    }
    this.limits.set(provider, { ...current, ...limits })
  }

  reset(provider?: ProviderName) {
    if (provider) {
      this.usage.delete(provider)
    } else {
      this.usage.clear()
    }
  }

  private cleanupOldRecords(provider: ProviderName) {
    const records = this.usage.get(provider) || []
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    const filtered = records.filter(r => r.timestamp.getTime() > oneDayAgo)
    this.usage.set(provider, filtered)
  }

  getUsageHistory(provider: ProviderName, hoursBack: number = 24): QuotaUsage[] {
    const records = this.usage.get(provider) || []
    const cutoff = Date.now() - hoursBack * 60 * 60 * 1000
    return records.filter(r => r.timestamp.getTime() > cutoff)
  }

  getTotalCost(hoursBack: number = 24): number {
    const cutoff = Date.now() - hoursBack * 60 * 60 * 1000
    let total = 0

    for (const records of this.usage.values()) {
      total += records
        .filter(r => r.timestamp.getTime() > cutoff)
        .reduce((sum, r) => sum + r.estimatedCost, 0)
    }

    return total
  }
}

// Singleton instance
export const quotaManager = new QuotaManager()
