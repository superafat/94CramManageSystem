import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { chat } from '../ai/llm'
import { ragSearch } from '../ai/rag'
import { logConversation } from '../ai/logger'
import { authMiddleware } from '../middleware/auth'
import { getTenantId } from '../middleware/tenant'
import type { ChatRequest, RAGSearchRequest } from '../ai/types'

export const botRoutes = new Hono()

botRoutes.use('*', authMiddleware)

const aiQuerySchema = z.object({
  query: z.string().min(1, 'Query is required').max(2000, 'Query too long'),
  branchId: z.string().uuid('Invalid branch ID format'),
  tenantId: z.string().uuid('Invalid tenant ID format').optional(),
  userId: z.string().min(1, 'User ID cannot be empty').max(255, 'User ID too long').optional(),
  context: z.record(z.string(), z.unknown()).optional(),
})

const ragSearchSchema = z.object({
  query: z.string().min(1, 'Query is required').max(1000, 'Query too long'),
  branchId: z.string().uuid('Invalid branch ID format'),
  tenantId: z.string().uuid('Invalid tenant ID format').optional(),
  topK: z.number().int('topK must be an integer').min(1, 'topK must be at least 1').max(20, 'topK cannot exceed 20').optional(),
  threshold: z.number().min(0, 'Threshold must be between 0 and 1').max(1, 'Threshold must be between 0 and 1').optional(),
})

botRoutes.post('/ai-query', zValidator('json', aiQuerySchema), async (c) => {
  const body = c.req.valid('json')
  const tenantId = getTenantId(c)
  const { tenantId: bodyTenantId, ...payload } = body
  if (bodyTenantId && bodyTenantId !== tenantId) {
    return c.json({ error: 'Tenant mismatch' }, 403)
  }
  
  try {
    // RAG-augmented: search knowledge base, pass as context to LLM system prompt
    let ragContext = ''
    try {
      const sources = await ragSearch({ query: body.query, branchId: body.branchId, tenantId, topK: 3, threshold: 0.7 })
      if (sources.length > 0) {
        ragContext = sources.map(s => {
          const title = typeof s.metadata?.title === 'string' ? s.metadata.title : '知識庫'
          return `[來源: ${title}]\n${s.content}`
        }).join('\n---\n')
      }
    } catch (ragErr) {
      // RAG failure is non-fatal, log but continue
      console.warn('[ai-query] RAG search failed:', ragErr instanceof Error ? ragErr.message : String(ragErr))
    }

    const chatReq: ChatRequest = { ...payload, tenantId }
    const result = await chat(chatReq, ragContext || undefined)

    // Log conversation asynchronously with tenantId
    logConversation(body.branchId, 'api', body.query, result, body.userId, tenantId).catch(logErr => {
      console.error('[ai-query] Failed to log conversation:', logErr instanceof Error ? logErr.message : String(logErr))
    })

    return c.json(result)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    console.error('[ai-query] error:', errorMessage, err)
    return c.json({ error: 'AI query failed' }, 500)
  }
})

botRoutes.post('/rag-search', zValidator('json', ragSearchSchema), async (c) => {
  const body = c.req.valid('json')
  const tenantId = getTenantId(c)
  const { tenantId: bodyTenantId, ...payload } = body
  if (bodyTenantId && bodyTenantId !== tenantId) {
    return c.json({ error: 'Tenant mismatch' }, 403)
  }
  
  try {
    const searchReq: RAGSearchRequest = { ...payload, tenantId }
    const sources = await ragSearch(searchReq)
    return c.json({ sources, count: sources.length })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    console.error('[rag-search] error:', errorMessage, err)
    return c.json({ error: 'RAG search failed' }, 500)
  }
})
