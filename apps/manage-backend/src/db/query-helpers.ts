/**
 * 查询优化工具
 * 提供批量查询和 DataLoader 模式，防止 N+1 查询问题
 */

import { eq, inArray } from 'drizzle-orm'
import { db } from './index'
import type { PgTable } from 'drizzle-orm/pg-core'

/**
 * 批量查询 by ID
 * 用于替代循环中的单个查询
 * 
 * @example
 * // 不好的做法 (N+1)
 * for (const userId of userIds) {
 *   const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
 * }
 * 
 * // 好的做法 (批量查询)
 * const users = await batchFindByIds(users, userIds)
 */
export async function batchFindByIds<T extends PgTable>(
  table: T,
  ids: string[],
  idColumn: any = 'id'
): Promise<any[]> {
  if (ids.length === 0) return []
  
  // @ts-ignore - Drizzle 类型推断问题
  return await db.select().from(table).where(inArray(table[idColumn], ids))
}

/**
 * 创建一个简单的 DataLoader
 * 
 * @example
 * const userLoader = createDataLoader(async (userIds: string[]) => {
 *   const users = await db.query.users.findMany({
 *     where: inArray(users.id, userIds)
 *   })
 *   return userIds.map(id => users.find(u => u.id === id) || null)
 * })
 * 
 * // 在循环中使用
 * const user1 = await userLoader.load('user-1')
 * const user2 = await userLoader.load('user-2')
 * // 这两个查询会被批量执行
 */
export function createDataLoader<K extends string | number, V>(
  batchLoadFn: (keys: K[]) => Promise<(V | null)[]>,
  options?: {
    maxBatchSize?: number
    cacheEnabled?: boolean
    cacheKeyFn?: (key: K) => string
  }
) {
  const maxBatchSize = options?.maxBatchSize || 100
  const cacheEnabled = options?.cacheEnabled ?? true
  const cacheKeyFn = options?.cacheKeyFn || ((key: K) => String(key))
  
  const cache = new Map<string, Promise<V | null>>()
  let queue: Array<{
    key: K
    resolve: (value: V | null) => void
    reject: (error: any) => void
  }> = []
  let batchTimeout: NodeJS.Timeout | null = null
  
  const processBatch = async () => {
    const batch = queue.splice(0, maxBatchSize)
    if (batch.length === 0) return
    
    const keys = batch.map(item => item.key)
    
    try {
      const results = await batchLoadFn(keys)
      
      if (results.length !== keys.length) {
        throw new Error(`Batch function returned ${results.length} results for ${keys.length} keys`)
      }
      
      batch.forEach((item, index) => {
        const result = results[index]
        item.resolve(result)
        
        // 缓存结果
        if (cacheEnabled && result !== null) {
          const cacheKey = cacheKeyFn(item.key)
          cache.set(cacheKey, Promise.resolve(result))
        }
      })
    } catch (error) {
      batch.forEach(item => item.reject(error))
    }
    
    // 如果还有待处理的项目，继续处理
    if (queue.length > 0) {
      batchTimeout = setTimeout(processBatch, 0)
    }
  }
  
  const load = (key: K): Promise<V | null> => {
    // 检查缓存
    if (cacheEnabled) {
      const cacheKey = cacheKeyFn(key)
      const cached = cache.get(cacheKey)
      if (cached) return cached
    }
    
    const promise = new Promise<V | null>((resolve, reject) => {
      queue.push({ key, resolve, reject })
      
      // 使用 setTimeout 批量处理请求
      if (!batchTimeout) {
        batchTimeout = setTimeout(() => {
          batchTimeout = null
          processBatch()
        }, 0)
      }
    })
    
    // 缓存 promise
    if (cacheEnabled) {
      const cacheKey = cacheKeyFn(key)
      cache.set(cacheKey, promise)
    }
    
    return promise
  }
  
  const loadMany = async (keys: K[]): Promise<(V | null)[]> => {
    return Promise.all(keys.map(key => load(key)))
  }
  
  const clear = (key: K): void => {
    if (cacheEnabled) {
      const cacheKey = cacheKeyFn(key)
      cache.delete(cacheKey)
    }
  }
  
  const clearAll = (): void => {
    cache.clear()
  }
  
  return {
    load,
    loadMany,
    clear,
    clearAll
  }
}

/**
 * 批量查询关联数据
 * 
 * @example
 * // 查询用户及其通知偏好
 * const users = await db.query.users.findMany()
 * const userIds = users.map(u => u.id)
 * 
 * // 批量加载通知偏好
 * const preferencesMap = await batchLoadRelated(
 *   notificationPreferences,
 *   'userId',
 *   userIds,
 *   'userId'
 * )
 * 
 * // 组合数据
 * const usersWithPreferences = users.map(user => ({
 *   ...user,
 *   preferences: preferencesMap.get(user.id) || []
 * }))
 */
export async function batchLoadRelated<T extends PgTable>(
  table: T,
  foreignKeyColumn: string,
  foreignKeyValues: string[],
  groupByKey: string = foreignKeyColumn
): Promise<Map<string, any[]>> {
  if (foreignKeyValues.length === 0) return new Map()
  
  // @ts-ignore - Dynamic column access
  const records = await db.select().from(table).where(
    inArray((table as any)[foreignKeyColumn], foreignKeyValues)
  )
  
  // 按外键分组
  const grouped = new Map<string, any[]>()
  for (const record of records) {
    const key = (record as any)[groupByKey]
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(record)
  }
  
  return grouped
}

/**
 * 预加载关联数据（Eager Loading）
 * 
 * @example
 * const studentsWithParents = await eagerLoad(
 *   students,
 *   'id',
 *   async (studentIds) => {
 *     return await db.query.parents.findMany({
 *       where: inArray(parents.studentId, studentIds)
 *     })
 *   },
 *   'studentId',
 *   'parents'
 * )
 */
export async function eagerLoad<T, R>(
  records: T[],
  recordKey: keyof T,
  loadFn: (keys: any[]) => Promise<R[]>,
  foreignKey: keyof R,
  targetField: string
): Promise<(T & { [key: string]: R[] })[]> {
  if (records.length === 0) return []
  
  const keys = records.map(r => r[recordKey])
  const relatedRecords = await loadFn(keys)
  
  // 建立索引
  const relatedMap = new Map<any, R[]>()
  for (const related of relatedRecords) {
    const key = related[foreignKey]
    if (!relatedMap.has(key)) {
      relatedMap.set(key, [])
    }
    relatedMap.get(key)!.push(related)
  }
  
  // 合并数据
  return records.map(record => ({
    ...record,
    [targetField]: relatedMap.get(record[recordKey]) || []
  }))
}

/**
 * 分页批量查询
 * 避免一次加载过多数据
 */
export async function* batchIterator<T>(
  items: T[],
  batchSize: number = 100
): AsyncGenerator<T[], void, unknown> {
  for (let i = 0; i < items.length; i += batchSize) {
    yield items.slice(i, i + batchSize)
  }
}

/**
 * 查询性能分析器
 */
export class QueryAnalyzer {
  private queries: Array<{
    sql: string
    duration: number
    timestamp: number
  }> = []
  
  private enabled: boolean = process.env.NODE_ENV === 'development'
  
  track(sql: string, duration: number) {
    if (!this.enabled) return
    
    this.queries.push({
      sql,
      duration,
      timestamp: Date.now()
    })
    
    // 只保留最近 100 条
    if (this.queries.length > 100) {
      this.queries.shift()
    }
  }
  
  getSlowQueries(threshold: number = 1000) {
    return this.queries.filter(q => q.duration > threshold)
  }
  
  getStats() {
    if (this.queries.length === 0) {
      return {
        total: 0,
        avgDuration: 0,
        maxDuration: 0,
        slowQueries: 0
      }
    }
    
    const durations = this.queries.map(q => q.duration)
    return {
      total: this.queries.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      maxDuration: Math.max(...durations),
      slowQueries: this.getSlowQueries().length
    }
  }
  
  clear() {
    this.queries = []
  }
}

export const queryAnalyzer = new QueryAnalyzer()
