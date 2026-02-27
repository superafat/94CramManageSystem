/**
 * 数据库查询优化示例
 * 
 * 展示如何使用新的数据库连接管理功能和查询优化工具
 */

import { db, executeWithMetrics, getDatabaseMetrics, checkDatabaseHealth, createBatchLoader } from './index'
import { createDataLoader, batchLoadRelated, eagerLoad } from './query-helpers'
import { users, notifications, notificationPreferences } from './schema'
import { eq, inArray } from 'drizzle-orm'

// ============================================
// 1. 使用性能监控包装查询
// ============================================

export async function getUserWithMetrics(userId: string) {
  return executeWithMetrics(
    async () => {
      return await db.query.users.findFirst({
        where: eq(users.id, userId)
      })
    },
    'getUserById'
  )
}

// ============================================
// 2. 批量查询 - 避免 N+1 问题
// ============================================

// ❌ 不好的做法 - N+1 查询
export async function getBadUserNotifications(userIds: string[]) {
  const results = []
  for (const userId of userIds) {
    // 每次循环都执行一次数据库查询
    const userNotifications = await db.query.notifications.findMany({
      where: eq(notifications.recipientId, userId)
    })
    results.push(userNotifications)
  }
  return results
}

// ✅ 好的做法 - 批量查询
export async function getGoodUserNotifications(userIds: string[]) {
  // 一次查询获取所有数据
  const allNotifications = await db.query.notifications.findMany({
    where: inArray(notifications.recipientId, userIds)
  })
  
  // 按用户分组
  const grouped = new Map<string, typeof allNotifications>()
  for (const notification of allNotifications) {
    const userId = notification.recipientId
    if (!grouped.has(userId)) {
      grouped.set(userId, [])
    }
    grouped.get(userId)!.push(notification)
  }
  
  return userIds.map(id => grouped.get(id) || [])
}

// ✅ 更好的做法 - 使用辅助函数
export async function getBetterUserNotifications(userIds: string[]) {
  return await batchLoadRelated(
    notifications,
    'recipientId',
    userIds,
    'recipientId'
  )
}

// ============================================
// 3. 使用 DataLoader 模式
// ============================================

// 创建用户 DataLoader
const userLoader = createDataLoader(async (userIds: string[]) => {
  const usersResult = await db.query.users.findMany({
    where: inArray(users.id, userIds)
  })
  
  // 确保返回的数组顺序与输入 keys 一致
  return userIds.map(id => usersResult.find(u => u.id === id) || null)
})

export async function getNotificationsWithUserDetails(notificationIds: string[]) {
  const notificationList = await db.query.notifications.findMany({
    where: inArray(notifications.id, notificationIds)
  })
  
  // 使用 DataLoader 批量加载用户信息
  // 即使有重复的 recipientId，也只会查询一次
  return await Promise.all(
    notificationList.map(async (notification) => ({
      ...notification,
      recipient: await userLoader.load(notification.recipientId)
    }))
  )
}

// ============================================
// 4. 预加载关联数据 (Eager Loading)
// ============================================

export async function getStudentsWithNotifications(studentIds: string[]) {
  const students = await db.query.users.findMany({
    where: inArray(users.id, studentIds)
  })
  
  // 预加载通知数据
  return await eagerLoad(
    students,
    'id',
    async (ids) => {
      return await db.query.notifications.findMany({
        where: inArray(notifications.recipientId, ids as string[])
      })
    },
    'recipientId',
    'notifications'
  )
}

// ============================================
// 5. 连接健康检查和监控
// ============================================

export async function getDatabaseStatus() {
  const health = await checkDatabaseHealth()
  const metrics = getDatabaseMetrics()
  
  return {
    ...health,
    metrics: {
      totalQueries: metrics.totalQueries,
      slowQueries: metrics.slowQueries,
      errorRate: metrics.totalQueries > 0 
        ? (metrics.errors / metrics.totalQueries * 100).toFixed(2) + '%'
        : '0%',
      avgQueryTime: Math.round(metrics.avgQueryTime) + 'ms',
      poolConfig: metrics.poolConfig
    }
  }
}

// ============================================
// 6. 使用通用批量加载器
// ============================================

// 创建通知偏好加载器
const preferencesLoader = createBatchLoader(
  async (userIds: string[]) => {
    const prefs = await db.query.notificationPreferences.findMany({
      where: inArray(notificationPreferences.userId, userIds)
    })
    
    // 按用户分组
    const grouped = new Map<string, typeof prefs>()
    for (const pref of prefs) {
      if (!grouped.has(pref.userId)) {
        grouped.set(pref.userId, [])
      }
      grouped.get(pref.userId)!.push(pref)
    }
    
    return userIds.map(id => grouped.get(id) || [])
  },
  { maxBatchSize: 50 }
)

export async function getUsersWithPreferences(userIds: string[]) {
  const results = []
  
  for (const userId of userIds) {
    const preferences = await preferencesLoader(userId)
    results.push({ userId, preferences })
  }
  
  return results
}

// ============================================
// 7. 实际应用示例
// ============================================

/**
 * 获取租户下所有用户及其通知统计
 * 这是一个常见的场景，容易出现 N+1 问题
 */
export async function getTenantUsersWithStats(tenantId: string) {
  // 1. 获取所有用户
  const tenantUsers = await executeWithMetrics(
    () => db.query.users.findMany({
      where: eq(users.tenantId, tenantId)
    }),
    'getTenantUsers'
  )
  
  const userIds = tenantUsers.map(u => u.id)
  
  // 2. 批量加载通知数据
  const notificationsMap = await batchLoadRelated(
    notifications,
    'recipientId',
    userIds,
    'recipientId'
  )
  
  // 3. 批量加载偏好设置
  const preferencesMap = await batchLoadRelated(
    notificationPreferences,
    'userId',
    userIds,
    'userId'
  )
  
  // 4. 组合数据
  return tenantUsers.map(user => ({
    ...user,
    notificationCount: notificationsMap.get(user.id)?.length || 0,
    unreadCount: notificationsMap.get(user.id)?.filter(n => n.status === 'sent').length || 0,
    preferences: preferencesMap.get(user.id) || []
  }))
}
