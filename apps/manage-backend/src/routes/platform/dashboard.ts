/**
 * Platform Dashboard Routes - 總後台總覽 API
 *
 * GET / — 回傳總覽數據（tenants 統計、財務、待處理項目、趨勢）
 */
import { Hono } from 'hono'
import type { RBACVariables } from '../../middleware/rbac'
import { db } from '../../db'
import { sql } from 'drizzle-orm'
import { success, internalError } from '../../utils/response'
import { logger } from '../../utils/logger'

export const platformDashboardRoutes = new Hono<{ Variables: RBACVariables }>()

type CountRow = { count: string }
type StatusCountRow = { status: string; count: string }
type SumRow = { total: string | null }
type TrendRow = { date: string; new_tenants: string }

type QueryResultRows<T> = T[] | { rows?: T[] }

function getRows<T>(result: QueryResultRows<T>): T[] {
  if (Array.isArray(result)) return result
  return result.rows ?? []
}

function firstRow<T>(result: QueryResultRows<T>): T | null {
  const rows = getRows(result)
  return rows[0] ?? null
}

// ========================================================================
// GET / - Platform Dashboard Overview
// ========================================================================
platformDashboardRoutes.get('/', async (c) => {
  try {
    // 並行查詢所有統計數據
    const [
      statusCounts,
      trialCount,
      monthlyRevenue,
      monthlyCost,
      pendingAccounts,
      pendingTrials,
      overdueCount,
      recentTrend,
    ] = await Promise.all([
      // Tenant 各狀態統計
      db.execute(sql`
        SELECT COALESCE(status, 'unknown') as status, COUNT(*)::text as count
        FROM tenants
        WHERE deleted_at IS NULL
        GROUP BY status
      `) as Promise<QueryResultRows<StatusCountRow>>,

      // Trial 統計
      db.execute(sql`
        SELECT COUNT(*)::text as count
        FROM tenants
        WHERE trial_status IN ('pending', 'approved')
          AND deleted_at IS NULL
      `) as Promise<QueryResultRows<CountRow>>,

      // 本月營收
      db.execute(sql`
        SELECT COALESCE(SUM(amount), 0)::text as total
        FROM platform_payments
        WHERE paid_at >= date_trunc('month', NOW())
      `) as Promise<QueryResultRows<SumRow>>,

      // 本月支出
      db.execute(sql`
        SELECT COALESCE(SUM(amount), 0)::text as total
        FROM platform_costs
        WHERE date >= date_trunc('month', NOW())
      `) as Promise<QueryResultRows<SumRow>>,

      // 待處理帳號
      db.execute(sql`
        SELECT COUNT(*)::text as count
        FROM users
        WHERE is_active = false
          AND deleted_at IS NULL
      `) as Promise<QueryResultRows<CountRow>>,

      // 待處理 trial
      db.execute(sql`
        SELECT COUNT(*)::text as count
        FROM tenants
        WHERE trial_status = 'pending'
      `) as Promise<QueryResultRows<CountRow>>,

      // 逾期未付款
      db.execute(sql`
        SELECT COUNT(*)::text as count
        FROM tenants
        WHERE payment_due_at < NOW()
          AND status = 'active'
          AND plan != 'free'
      `) as Promise<QueryResultRows<CountRow>>,

      // 最近 7 天新增 tenant 趨勢
      db.execute(sql`
        SELECT
          created_at::date::text as date,
          COUNT(*)::text as new_tenants
        FROM tenants
        WHERE created_at >= NOW() - INTERVAL '7 days'
          AND deleted_at IS NULL
        GROUP BY created_at::date
        ORDER BY created_at::date DESC
      `) as Promise<QueryResultRows<TrendRow>>,
    ])

    // 彙整 tenant 狀態統計
    const statusMap: Record<string, number> = {}
    for (const row of getRows(statusCounts)) {
      statusMap[row.status] = parseInt(row.count, 10)
    }

    const trialCountVal = parseInt(firstRow(trialCount)?.count ?? '0', 10)
    const revenueVal = parseFloat(firstRow(monthlyRevenue)?.total ?? '0')
    const costVal = parseFloat(firstRow(monthlyCost)?.total ?? '0')
    const pendingAccountsVal = parseInt(firstRow(pendingAccounts)?.count ?? '0', 10)
    const pendingTrialsVal = parseInt(firstRow(pendingTrials)?.count ?? '0', 10)
    const overdueVal = parseInt(firstRow(overdueCount)?.count ?? '0', 10)

    const trendData = getRows(recentTrend).map((row) => ({
      date: row.date,
      newTenants: parseInt(row.new_tenants, 10),
    }))

    return success(c, {
      tenants: {
        active: statusMap['active'] ?? 0,
        trial: trialCountVal,
        suspended: statusMap['suspended'] ?? 0,
      },
      finance: {
        monthlyRevenue: revenueVal,
        monthlyCost: costVal,
        profit: revenueVal - costVal,
      },
      pending: {
        accounts: pendingAccountsVal,
        trials: pendingTrialsVal,
        overdue: overdueVal,
      },
      recentTrend: trendData,
    })
  } catch (err: unknown) {
    logger.error({ err }, 'Platform dashboard error')
    return internalError(c, err instanceof Error ? err : undefined)
  }
})
