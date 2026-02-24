/**
 * Health Check Routes - 健康檢查 API
 * 
 * 提供系統健康狀態監控端點
 */
import { Hono } from 'hono'
import { checkDatabaseHealth, db } from '../db'
import { sql } from 'drizzle-orm'
import { createSuccessResponse, createErrorResponse } from '../types/api-response'

export const healthRoutes = new Hono()

/**
 * GET /health - 基礎健康檢查
 * 返回基本的系統健康狀態
 */
healthRoutes.get('/', async (c) => {
  try {
    const dbHealth = await checkDatabaseHealth()
    
    const health = {
      status: dbHealth ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealth ? 'connected' : 'disconnected'
    }

    if (!dbHealth) {
      return c.json(createErrorResponse('Service unhealthy', 'HEALTH_CHECK_FAILED', { details: health }), 503)
    }

    return c.json(createSuccessResponse(health))
  } catch (error) {
    return c.json(createErrorResponse('Health check failed', 'HEALTH_CHECK_ERROR'), 503)
  }
})

/**
 * GET /health/ready - 就緒探針
 * 檢查服務是否準備好接收流量
 */
healthRoutes.get('/ready', async (c) => {
  try {
    const dbHealth = await checkDatabaseHealth()

    if (!dbHealth) {
      return c.json(createErrorResponse('Service not ready', 'NOT_READY', { details: { database: 'disconnected' } }), 503)
    }

    return c.json(createSuccessResponse({
      status: 'ready',
      timestamp: new Date().toISOString()
    }))
  } catch (error) {
    return c.json(createErrorResponse('Readiness check failed', 'READINESS_CHECK_ERROR'), 503)
  }
})

/**
 * GET /health/live - 存活探針
 * 檢查服務進程是否存活
 */
healthRoutes.get('/live', async (c) => {
  return c.json(createSuccessResponse({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }))
})

// Debug endpoint to check database tables
healthRoutes.get('/debug/tables', async (c) => {
  try {
    const tables = await db.execute(sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    return c.json(createSuccessResponse({ tables }))
  } catch (error) {
    return c.json(createErrorResponse('DB_ERROR', String(error)))
  }
})
