/**
 * 流失預警 API 路由
 * 提供即時風險列表、歷史趨勢、手動掃描、學生詳情等功能
 * 
 * 修復項目：
 * 1. ✅ 從 Express 語法轉換為 Hono 語法
 * 2. ✅ 增加 Input Validation (Zod)
 * 3. ✅ 統一 API Response Format
 * 4. ✅ 防止 SQL Injection
 * 5. ✅ 改善 Error Handling
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../db'
import { sql } from 'drizzle-orm'
import {
  calculateBranchChurnRisks,
  calculateChurnRisk,
  ChurnRiskScore,
} from '../ai/churn-v2'
import {
  dailyScan,
  weeklyDigest,
  getStudentRiskHistory,
} from '../ai/churn-scanner'
import { authMiddleware } from '../middleware/auth'
import { requireRole, requirePermission, Role, Permission, type RBACVariables } from '../middleware/rbac'
import { uuidSchema } from '../utils/validation'
import { success, notFound, internalError, badRequest } from '../utils/response'
import { logger } from '../utils/logger'

// ===== Row Interfaces =====
interface BranchRow {
  id: string
  name: string
}

interface ChurnScanRow {
  id: string
  branch_id: string
  scan_type: string
  total_students: number
  at_risk_count: number
  avg_risk_score: number | null
  created_at: string
}

interface StudentRow {
  id: string
  full_name: string
  student_code: string
  branch_name: string | null
}

interface ChurnRiskHistoryRow {
  risk_level: string
  risk_score: number
  factors: unknown
  created_at: string
}

function normalizeRows<T>(result: unknown): T[] {
  return Array.isArray(result) ? result : Array.from(result as Iterable<T>)
}

export const churnV2Routes = new Hono<{ Variables: RBACVariables }>()

// Apply auth middleware
churnV2Routes.use('*', authMiddleware)

// ===== Validation Schemas =====
const branchIdSchema = z.object({
  branchId: uuidSchema,
})

const historyQuerySchema = z.object({
  branchId: uuidSchema,
  days: z.coerce.number().int().min(1).max(365).default(30),
})

const scanSchema = z.object({
  branchId: uuidSchema,
  type: z.enum(['daily', 'weekly']).default('daily'),
})

const studentQuerySchema = z.object({
  studentId: uuidSchema,
  days: z.coerce.number().int().min(1).max(365).default(30),
})

// ============ API 端點 ============

/**
 * GET /api/admin/churn/:branchId
 * 取得分校即時風險列表
 */
churnV2Routes.get('/admin/churn/:branchId', 
  requirePermission(Permission.REPORTS_READ),
  zValidator('param', branchIdSchema),
  zValidator('query', z.object({ minRisk: z.enum(['low', 'medium', 'high', 'critical']).optional() })),
  async (c) => {
    try {
      const { branchId } = c.req.valid('param')
      const { minRisk } = c.req.valid('query')

      // 驗證分校存在
      const branchResult = normalizeRows<BranchRow>(await db.execute(sql`
        SELECT id, name FROM branches WHERE id = ${branchId} LIMIT 1
      `))

      const branch = branchResult[0]
      if (!branch) {
        return notFound(c, 'Branch')
      }

      // 計算風險
      let risks = await calculateBranchChurnRisks(branchId)

      // 篩選風險等級
      if (minRisk) {
        const riskLevelOrder: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 }
        const minLevel = riskLevelOrder[minRisk]
        risks = risks.filter((r: ChurnRiskScore) => riskLevelOrder[r.riskLevel] >= minLevel)
      }

      return success(c, {
        branchId,
        branchName: branch.name,
        risks,
        summary: {
          total: risks.length,
          critical: risks.filter((r: ChurnRiskScore) => r.riskLevel === 'critical').length,
          high: risks.filter((r: ChurnRiskScore) => r.riskLevel === 'high').length,
          medium: risks.filter((r: ChurnRiskScore) => r.riskLevel === 'medium').length,
          low: risks.filter((r: ChurnRiskScore) => r.riskLevel === 'low').length,
        },
        generatedAt: new Date().toISOString(),
      })
    } catch (err) {
      logger.error({ err: err }, 'Churn risk error:')
      return internalError(c, err)
    }
  }
)

/**
 * GET /api/admin/churn/:branchId/history
 * 取得分校歷史趨勢
 */
churnV2Routes.get('/admin/churn/:branchId/history',
  requirePermission(Permission.REPORTS_READ),
  zValidator('param', branchIdSchema),
  zValidator('query', z.object({ days: z.coerce.number().int().min(1).max(365).default(30) })),
  async (c) => {
    try {
      const { branchId } = c.req.valid('param')
      const { days } = c.req.valid('query')

      // 驗證分校存在
      const branchResult = normalizeRows<BranchRow>(await db.execute(sql`
        SELECT id, name FROM branches WHERE id = ${branchId} LIMIT 1
      `))

      const branch = branchResult[0]
      if (!branch) {
        return notFound(c, 'Branch')
      }

      // 取得歷史掃描記錄
      const historyResult = normalizeRows<ChurnScanRow>(await db.execute(sql`
        SELECT
          id,
          branch_id,
          scan_type,
          total_students,
          at_risk_count,
          avg_risk_score,
          created_at
        FROM churn_scans
        WHERE branch_id = ${branchId}
          AND created_at >= NOW() - INTERVAL '${days} days'
        ORDER BY created_at DESC
      `))

      // 計算趨勢統計
      const stats = {
        scans: historyResult.length,
        avgAtRisk: historyResult.length > 0 
          ? historyResult.reduce((sum, r) => sum + Number(r.at_risk_count), 0) / historyResult.length 
          : 0,
        trend: 'stable' as 'improving' | 'stable' | 'worsening',
      }

      // 簡單趨勢判斷
      if (historyResult.length >= 2) {
        const latest = Number(historyResult[0].avg_risk_score || 0)
        const oldest = Number(historyResult[historyResult.length - 1].avg_risk_score || 0)
        if (latest < oldest - 5) stats.trend = 'improving'
        else if (latest > oldest + 5) stats.trend = 'worsening'
      }

      return success(c, {
        branchId,
        branchName: branch.name,
        history: historyResult,
        stats,
        period: { days },
      })
    } catch (err) {
      logger.error({ err: err }, 'Churn history error:')
      return internalError(c, err)
    }
  }
)

/**
 * POST /api/admin/churn/:branchId/scan
 * 手動觸發掃描
 */
churnV2Routes.post('/admin/churn/:branchId/scan',
  requireRole(Role.ADMIN, Role.MANAGER),
  zValidator('param', branchIdSchema),
  zValidator('json', z.object({ type: z.enum(['daily', 'weekly']).default('daily') })),
  async (c) => {
    try {
      const { branchId } = c.req.valid('param')
      const { type } = c.req.valid('json')

      // 驗證分校存在
      const branchResult = normalizeRows<BranchRow>(await db.execute(sql`
        SELECT id, name FROM branches WHERE id = ${branchId} LIMIT 1
      `))

      const branch = branchResult[0]
      if (!branch) {
        return notFound(c, 'Branch')
      }

      // 執行掃描
      let result
      if (type === 'daily') {
        result = await dailyScan(branchId)
      } else {
        result = await weeklyDigest(branchId)
      }

      return success(c, {
        branchId,
        scanType: type,
        result,
        scannedAt: new Date().toISOString(),
      })
    } catch (err) {
      logger.error({ err: err }, 'Churn scan error:')
      return internalError(c, err)
    }
  }
)

/**
 * GET /api/admin/churn/student/:studentId
 * 取得學生個人風險詳情
 */
churnV2Routes.get('/admin/churn/student/:studentId',
  requirePermission(Permission.REPORTS_READ),
  zValidator('param', z.object({ studentId: uuidSchema })),
  zValidator('query', z.object({ days: z.coerce.number().int().min(1).max(365).default(30) })),
  async (c) => {
    try {
      const { studentId } = c.req.valid('param')
      const { days } = c.req.valid('query')

      // 驗證學生存在
      const studentResult = normalizeRows<StudentRow>(await db.execute(sql`
        SELECT s.id, s.full_name, s.student_code, b.name as branch_name
        FROM students s
        LEFT JOIN branches b ON s.branch_id = b.id
        WHERE s.id = ${studentId}
          AND s.deleted_at IS NULL
        LIMIT 1
      `))

      const student = studentResult[0]
      if (!student) {
        return notFound(c, 'Student')
      }

      // 計算當前風險
      const currentRisk = await calculateChurnRisk(studentId)

      // 取得歷史風險記錄
      const historyResult = normalizeRows<ChurnRiskHistoryRow>(await db.execute(sql`
        SELECT
          risk_level,
          risk_score,
          factors,
          created_at
        FROM churn_risk_history
        WHERE student_id = ${studentId}
          AND created_at >= NOW() - INTERVAL '${days} days'
        ORDER BY created_at DESC
      `))

      return success(c, {
        student: {
          id: student.id,
          name: student.full_name,
          code: student.student_code,
          branch: student.branch_name,
        },
        currentRisk,
        history: historyResult,
        period: { days },
      })
    } catch (err) {
      logger.error({ err: err }, 'Student churn detail error:')
      return internalError(c, err)
    }
  }
)

/**
 * GET /api/admin/churn/:branchId/export
 * 匯出風險報告
 */
churnV2Routes.get('/admin/churn/:branchId/export',
  requirePermission(Permission.REPORTS_READ),
  zValidator('param', branchIdSchema),
  async (c) => {
    try {
      const { branchId } = c.req.valid('param')
      const format = c.req.query('format') || 'json'

      // 取得分校風險資料
      const risks = await calculateBranchChurnRisks(branchId)

      if (format === 'csv') {
        // CSV 格式
        const csvHeader = 'Student ID,Name,Risk Level,Risk Score,Factors,Generated At\n'
        const csvRows = risks.map((r: ChurnRiskScore) => 
          `${r.studentId},${r.studentName},${r.riskLevel},${r.riskScore},"${r.factors?.join('; ') || ''}",${r.generatedAt}`
        ).join('\n')
        
        return c.text(csvHeader + csvRows, 200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="churn-risk-${branchId}.csv"`,
        })
      }

      // JSON 格式（預設）
      return success(c, { risks, exportedAt: new Date().toISOString() })
    } catch (err) {
      logger.error({ err: err }, 'Churn export error:')
      return internalError(c, err)
    }
  }
)
