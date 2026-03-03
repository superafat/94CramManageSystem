import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { RBACVariables } from '../../middleware/rbac'
import { requireRole, Role } from '../../middleware/rbac'
import { ingestChunk } from '../../ai/rag'
import { uuidSchema } from '../../utils/validation'
import { success, badRequest, internalError, logger } from './_helpers'

const knowledgeRoutes = new Hono<{ Variables: RBACVariables }>()

const ingestSchema = z.object({
  branchId: uuidSchema.optional(),
  tenantId: uuidSchema.optional(),
  content: z.string().min(1).max(50000).optional(),
  chunks: z.array(z.object({
    content: z.string().min(1).max(50000),
    metadata: z.record(z.string(), z.any()).optional(),
  })).max(100).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
}).refine(
  (data) => data.content || (data.chunks && data.chunks.length > 0),
  { message: 'Provide "content" or "chunks" array' }
)

knowledgeRoutes.post('/knowledge/ingest', requireRole(Role.ADMIN), zValidator('json', ingestSchema), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const tenantId = body.tenantId ?? user.tenant_id

  try {
    if (body.chunks && Array.isArray(body.chunks)) {
      let stored = 0
      for (const chunk of body.chunks) {
        await ingestChunk(body.branchId ?? '', chunk.content, chunk.metadata ?? {}, tenantId)
        stored++
      }
      return success(c, { stored })
    } else if (body.content) {
      await ingestChunk(body.branchId ?? '', body.content, body.metadata ?? {}, tenantId)
      return success(c, { stored: 1 })
    }
    return badRequest(c, 'Provide "content" or "chunks" array')
  } catch (err) {
    logger.error({ err: err }, 'Ingest error:')
    return internalError(c, err)
  }
})

export { knowledgeRoutes }
