import { embed } from './embedding'
import { db } from '../db/index'
import { sql } from 'drizzle-orm'
import type { RAGSearchRequest, RAGSource } from './types'

export async function ragSearch(req: RAGSearchRequest): Promise<RAGSource[]> {
  const topK = req.topK ?? 5
  const threshold = req.threshold ?? 0.5

  const queryVec = await embed(req.query)
  const vecStr = `[${queryVec.join(',')}]`

  // pgvector cosine similarity search with tenant isolation
  const results = await db.execute(sql`
    SELECT content, metadata,
           1 - (embedding <=> ${vecStr}::vector) as score
    FROM knowledge_chunks
    WHERE branch_id = ${req.branchId}
      AND (tenant_id = ${req.tenantId ?? null} OR tenant_id IS NULL)
      AND 1 - (embedding <=> ${vecStr}::vector) >= ${threshold}
    ORDER BY embedding <=> ${vecStr}::vector
    LIMIT ${topK}
  `)

  return (results as any[]).map(row => ({
    content: row.content,
    score: Number(row.score),
    metadata: row.metadata ?? {},
  }))
}

/** Insert knowledge chunk with embedding */
export async function ingestChunk(
  branchId: string,
  content: string,
  metadata: Record<string, unknown> = {},
  tenantId?: string,
) {
  const vec = await embed(content)
  const vecStr = `[${vec.join(',')}]`

  await db.execute(sql`
    INSERT INTO knowledge_chunks (branch_id, content, metadata, embedding, tenant_id)
    VALUES (${branchId}, ${content}, ${JSON.stringify(metadata)}::jsonb, ${vecStr}::vector, ${tenantId ?? null})
  `)
}
