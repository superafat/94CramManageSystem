import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { config } from '../config'
import * as schema from '@94cram/shared/db'
import { logger } from '../utils/logger'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null
let _client: ReturnType<typeof postgres> | null = null

// 性能监控指标
interface DBMetrics {
  totalQueries: number
  slowQueries: number
  errors: number
  reconnections: number
  activeConnections: number
  avgQueryTime: number
  queryTimes: number[]
  timeouts: number
  poolStats: {
    idle: number
    waiting: number
    total: number
  }
}

const metrics: DBMetrics = {
  totalQueries: 0,
  slowQueries: 0,
  errors: 0,
  reconnections: 0,
  activeConnections: 0,
  avgQueryTime: 0,
  queryTimes: [],
  timeouts: 0,
  poolStats: {
    idle: 0,
    waiting: 0,
    total: 0
  }
}

const SLOW_QUERY_THRESHOLD = 1000 // 1秒

/**
 * Parse DATABASE_URL for Cloud SQL Unix socket support
 * Format: postgres://user:pass@/database?host=/cloudsql/project:region:instance
 */
function createPostgresClient() {
  const url = config.DATABASE_URL
  if (!url || url === 'placeholder') {
    throw new Error('DATABASE_URL not configured')
  }

  let clientOptions: postgres.Options<{}>

  // Check if this is a Cloud SQL Unix socket URL
  const socketMatch = url.match(/\?host=(.+)$/)
  if (socketMatch) {
    const socketPath = decodeURIComponent(socketMatch[1])

    // Manual parsing since URL can't handle @/database format
    const withoutProtocol = url.replace(/^postgres(ql)?:\/\//, '')
    const [credentials, rest] = withoutProtocol.split('@')
    const [username, password] = credentials.split(':')
    const database = rest.split('?')[0].replace(/^\//, '')

    clientOptions = {
      host: socketPath,
      port: 5432,
      database,
      username,
      password: decodeURIComponent(password),
      // 连接池配置
      max: config.DB_POOL_MAX,
      idle_timeout: config.DB_POOL_IDLE_TIMEOUT,
      max_lifetime: config.DB_POOL_MAX_LIFETIME,
      connect_timeout: config.DB_CONNECT_TIMEOUT,
      // 查询超时
      fetch_types: false,
      // 监控钩子
      onnotice: (notice) => {
        logger.info({ notice }, '[DB Notice]')
      },
      onparameter: (key, value) => {
        if (config.NODE_ENV === 'development') {
          logger.info({ key, value }, '[DB Parameter]')
        }
      },
      connection: {
        application_name: '94manage-backend',
        statement_timeout: config.DB_QUERY_TIMEOUT
      }
    }
  } else {
    // Standard TCP connection with pool options
    clientOptions = {
      // 连接池配置
      max: config.DB_POOL_MAX,
      idle_timeout: config.DB_POOL_IDLE_TIMEOUT,
      max_lifetime: config.DB_POOL_MAX_LIFETIME,
      connect_timeout: config.DB_CONNECT_TIMEOUT,
      // 查询超时
      fetch_types: false,
      // 监控钩子
      onnotice: (notice) => {
        logger.info({ notice }, '[DB Notice]')
      },
      onparameter: (key, value) => {
        if (config.NODE_ENV === 'development') {
          logger.info({ key, value }, '[DB Parameter]')
        }
      },
      connection: {
        application_name: '94manage-backend',
        statement_timeout: config.DB_QUERY_TIMEOUT
      }
    }
  }

  const client = socketMatch
    ? postgres(clientOptions)
    : postgres(url, clientOptions)

  // 连接池监控
  setupConnectionMonitoring(client)

  return client
}

/**
 * 设置连接监控
 */
function setupConnectionMonitoring(client: ReturnType<typeof postgres>) {
  // 定期收集连接池统计
  setInterval(() => {
    try {
      // 更新连接池统计
      // postgres.js 会自动管理连接，我们通过查询活动来估算

      // 计算平均查询时间
      if (metrics.queryTimes.length > 0) {
        const sum = metrics.queryTimes.reduce((a, b) => a + b, 0)
        metrics.avgQueryTime = sum / metrics.queryTimes.length

        // 只保留最近 1000 次查询的时间
        if (metrics.queryTimes.length > 1000) {
          metrics.queryTimes = metrics.queryTimes.slice(-1000)
        }
      }

      // 估算活跃连接数（基于最近的查询活动）
      const recentQueries = metrics.queryTimes.slice(-10).length
      metrics.activeConnections = Math.min(recentQueries, config.DB_POOL_MAX)

      if (config.NODE_ENV === 'development') {
        logger.info({
          totalQueries: metrics.totalQueries,
          slowQueries: metrics.slowQueries,
          timeouts: metrics.timeouts,
          errors: metrics.errors,
          avgQueryTime: Math.round(metrics.avgQueryTime),
          reconnections: metrics.reconnections,
          activeConnections: metrics.activeConnections
        }, '[DB Metrics]')
      }
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[DB Monitoring Error]')
    }
  }, 60000) // 每分钟
}

/**
 * 健康检查
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean
  latency?: number
  error?: string
  details?: {
    totalQueries: number
    slowQueries: number
    timeouts: number
    errors: number
    errorRate: number
    avgQueryTime: number
  }
}> {
  try {
    const start = Date.now()
    if (!_client) {
      // 触发初始化
      const _ = db.query
    }

    // 执行简单的健康检查查询
    await _client!.unsafe('SELECT 1 as health_check')
    const latency = Date.now() - start

    // 计算错误率
    const errorRate = metrics.totalQueries > 0
      ? (metrics.errors / metrics.totalQueries) * 100
      : 0

    return {
      healthy: true,
      latency,
      details: {
        totalQueries: metrics.totalQueries,
        slowQueries: metrics.slowQueries,
        timeouts: metrics.timeouts,
        errors: metrics.errors,
        errorRate: parseFloat(errorRate.toFixed(2)),
        avgQueryTime: Math.round(metrics.avgQueryTime)
      }
    }
  } catch (error: unknown) {
    metrics.errors++
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      healthy: false,
      error: errorMessage,
      details: {
        totalQueries: metrics.totalQueries,
        slowQueries: metrics.slowQueries,
        timeouts: metrics.timeouts,
        errors: metrics.errors,
        errorRate: 100,
        avgQueryTime: Math.round(metrics.avgQueryTime)
      }
    }
  }
}

/**
 * 获取数据库连接统计
 */
export function getDatabaseMetrics() {
  return {
    ...metrics,
    poolConfig: {
      max: config.DB_POOL_MAX,
      idleTimeout: config.DB_POOL_IDLE_TIMEOUT,
      maxLifetime: config.DB_POOL_MAX_LIFETIME,
      queryTimeout: config.DB_QUERY_TIMEOUT,
      connectTimeout: config.DB_CONNECT_TIMEOUT
    },
    healthStatus: {
      errorRate: metrics.totalQueries > 0
        ? ((metrics.errors / metrics.totalQueries) * 100).toFixed(2) + '%'
        : '0%',
      slowQueryRate: metrics.totalQueries > 0
        ? ((metrics.slowQueries / metrics.totalQueries) * 100).toFixed(2) + '%'
        : '0%',
      timeoutRate: metrics.totalQueries > 0
        ? ((metrics.timeouts / metrics.totalQueries) * 100).toFixed(2) + '%'
        : '0%'
    }
  }
}

/**
 * 重置统计指标
 */
export function resetMetrics() {
  metrics.totalQueries = 0
  metrics.slowQueries = 0
  metrics.errors = 0
  metrics.timeouts = 0
  metrics.avgQueryTime = 0
  metrics.queryTimes = []
}

/**
 * 执行查询并记录性能指标，带超时控制
 */
export async function executeWithMetrics<T>(
  queryFn: () => Promise<T>,
  queryName?: string
): Promise<T> {
  const start = Date.now()
  metrics.totalQueries++

  // 创建超时 Promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      metrics.timeouts++
      reject(new Error(`Query timeout after ${config.DB_QUERY_TIMEOUT}ms: ${queryName || 'Unknown'}`))
    }, config.DB_QUERY_TIMEOUT)
  })

  try {
    // 竞争查询和超时
    const result = await Promise.race([queryFn(), timeoutPromise])
    const duration = Date.now() - start

    metrics.queryTimes.push(duration)

    if (duration > SLOW_QUERY_THRESHOLD) {
      metrics.slowQueries++
      logger.warn(`[Slow Query] ${queryName || 'Unknown'} took ${duration}ms`)
    }

    return result
  } catch (error) {
    metrics.errors++
    const duration = Date.now() - start

    // 记录错误查询的时间
    if (duration < config.DB_QUERY_TIMEOUT) {
      metrics.queryTimes.push(duration)
    }

    throw error
  }
}

/**
 * 批量查询工具 - 防止 N+1 问题
 */
export function createBatchLoader<K, V>(
  batchLoadFn: (keys: K[]) => Promise<V[]>,
  options?: {
    maxBatchSize?: number
    batchScheduleFn?: (callback: () => void) => void
  }
) {
  const maxBatchSize = options?.maxBatchSize || 100
  const batchScheduleFn = options?.batchScheduleFn || ((cb) => setTimeout(cb, 0))

  let queue: Array<{
    key: K
    resolve: (value: V | null) => void
    reject: (error: unknown) => void
  }> = []
  let scheduled = false

  const dispatch = async () => {
    const batch = queue.splice(0, maxBatchSize)
    if (batch.length === 0) return

    try {
      const keys = batch.map(item => item.key)
      const results = await batchLoadFn(keys)

      batch.forEach((item, index) => {
        item.resolve(results[index] || null)
      })
    } catch (error) {
      batch.forEach(item => item.reject(error))
    }

    if (queue.length > 0) {
      scheduled = true
      batchScheduleFn(dispatch)
    } else {
      scheduled = false
    }
  }

  return (key: K): Promise<V | null> => {
    return new Promise((resolve, reject) => {
      queue.push({ key, resolve, reject })

      if (!scheduled) {
        scheduled = true
        batchScheduleFn(dispatch)
      }
    })
  }
}

/**
 * 初始化数据库连接
 */
function initializeDatabase() {
  if (_db) return _db

  try {
    _client = createPostgresClient()
    _db = drizzle(_client, { schema })

    logger.info({
      poolMax: config.DB_POOL_MAX,
      queryTimeout: config.DB_QUERY_TIMEOUT,
      nodeEnv: config.NODE_ENV
    }, '[DB] Database connection initialized')

    // 预热连接池
    checkDatabaseHealth().then(health => {
      if (health.healthy) {
        logger.info(`[DB] Health check passed, latency: ${health.latency}ms`)
      } else {
        logger.error({ err: new Error(health.error ?? 'unknown') }, '[DB] Health check failed')
      }
    })

    return _db
  } catch (error) {
    metrics.errors++
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[DB] Failed to initialize database')
    throw error
  }
}

/**
 * 优雅关闭数据库连接
 */
export async function closeDatabaseConnection() {
  if (_client) {
    logger.info('[DB] Closing database connection...')
    await _client.end()
    _client = null
    _db = null
    logger.info('[DB] Database connection closed')
  }
}

// Lazy initialization with Proxy
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const instance = initializeDatabase()
    return Reflect.get(instance as object, prop)
  }
})
