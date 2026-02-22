import { describe, it, expect, beforeAll } from 'vitest'
import { checkDatabaseHealth, getDatabaseMetrics, resetMetrics, executeWithMetrics } from '../index'

describe('Database Health and Monitoring', () => {
  beforeAll(() => {
    // 重置指標
    resetMetrics()
  })

  describe('checkDatabaseHealth', () => {
    it('should return health status with latency', async () => {
      const health = await checkDatabaseHealth()
      
      expect(health).toBeDefined()
      expect(health.healthy).toBeDefined()
      
      if (health.healthy) {
        expect(health.latency).toBeGreaterThanOrEqual(0)
        expect(health.details).toBeDefined()
        expect(health.details?.totalQueries).toBeGreaterThanOrEqual(0)
        expect(health.details?.errorRate).toBeGreaterThanOrEqual(0)
      } else {
        expect(health.error).toBeDefined()
      }
    }, 10000)
  })

  describe('getDatabaseMetrics', () => {
    it('should return comprehensive metrics', () => {
      const metrics = getDatabaseMetrics()
      
      expect(metrics).toBeDefined()
      expect(metrics.totalQueries).toBeGreaterThanOrEqual(0)
      expect(metrics.slowQueries).toBeGreaterThanOrEqual(0)
      expect(metrics.errors).toBeGreaterThanOrEqual(0)
      expect(metrics.timeouts).toBeGreaterThanOrEqual(0)
      expect(metrics.poolConfig).toBeDefined()
      expect(metrics.poolConfig.max).toBeGreaterThan(0)
      expect(metrics.poolConfig.queryTimeout).toBeGreaterThan(0)
      expect(metrics.healthStatus).toBeDefined()
      expect(metrics.healthStatus.errorRate).toBeDefined()
      expect(metrics.healthStatus.slowQueryRate).toBeDefined()
    })
  })

  describe('executeWithMetrics', () => {
    it('should execute query and track metrics', async () => {
      const initialMetrics = getDatabaseMetrics()
      const initialTotal = initialMetrics.totalQueries
      
      const result = await executeWithMetrics(
        async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
          return 'success'
        },
        'test-query'
      )
      
      expect(result).toBe('success')
      
      const newMetrics = getDatabaseMetrics()
      expect(newMetrics.totalQueries).toBe(initialTotal + 1)
    })

    it('should track slow queries', async () => {
      const initialMetrics = getDatabaseMetrics()
      const initialSlowQueries = initialMetrics.slowQueries
      
      // 模拟慢查询（超过1秒）
      await executeWithMetrics(
        async () => {
          await new Promise(resolve => setTimeout(resolve, 1100))
          return 'slow-query-result'
        },
        'slow-test-query'
      )
      
      const newMetrics = getDatabaseMetrics()
      expect(newMetrics.slowQueries).toBe(initialSlowQueries + 1)
    }, 10000)

    it('should handle query errors', async () => {
      const initialMetrics = getDatabaseMetrics()
      const initialErrors = initialMetrics.errors
      
      await expect(
        executeWithMetrics(
          async () => {
            throw new Error('Query failed')
          },
          'failing-query'
        )
      ).rejects.toThrow('Query failed')
      
      const newMetrics = getDatabaseMetrics()
      expect(newMetrics.errors).toBe(initialErrors + 1)
    })
  })

  describe('resetMetrics', () => {
    it('should reset all metrics to zero', () => {
      // 先执行一些查询
      executeWithMetrics(async () => 'test', 'test')
      
      // 重置
      resetMetrics()
      
      const metrics = getDatabaseMetrics()
      expect(metrics.totalQueries).toBe(0)
      expect(metrics.slowQueries).toBe(0)
      expect(metrics.errors).toBe(0)
      expect(metrics.timeouts).toBe(0)
    })
  })
})
