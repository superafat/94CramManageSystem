import { db } from '../db/index'
import { sql } from 'drizzle-orm'
import type { ChatResponse } from './types'

export async function logConversation(
  branchId: string,
  channel: string,
  query: string,
  response: ChatResponse,
  userId?: string,
  tenantId?: string,
) {
  try {
    await db.execute(sql`
      INSERT INTO conversations (branch_id, tenant_id, channel, query, answer, model, intent, latency_ms, tokens_used)
      VALUES (${branchId}, ${tenantId ?? null}, ${channel}, ${query}, ${response.answer}, ${response.model}, ${response.intent}, ${response.latencyMs}, ${response.tokensUsed ?? null})
    `)
  } catch (err: any) {
    console.error('[logger] failed to log conversation:', err.message)
  }
}
