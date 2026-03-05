/**
 * Platform Knowledge Routes — 全域知識庫管理
 * 僅 SUPERADMIN 可存取（由 platform/index.ts 統一掛 middleware）
 *
 * Routes:
 *   GET    /     — 全域知識列表
 *   POST   /     — 新增知識條目
 *   PUT    /:id  — 編輯知識條目
 *   DELETE /:id  — 刪除知識條目
 *
 * 使用 platform_settings key='knowledge_entries' 存 JSON array
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from '../../db'
import { sql } from 'drizzle-orm'
import { success, badRequest, notFound, internalError } from '../../utils/response'
import { logger } from '../../utils/logger'
import type { RBACVariables } from '../../middleware/rbac'
import { getRows } from './_helpers'

export const platformKnowledgeRoutes = new Hono<{ Variables: RBACVariables }>()

interface KnowledgeEntry {
  id: string
  title: string
  content: string
  category: string
  tenantId: string | null
  createdAt: string
  updatedAt: string
}

const SETTINGS_KEY = 'knowledge_entries'

async function getKnowledgeEntries(): Promise<KnowledgeEntry[]> {
  const result = await db.execute(sql`
    SELECT value FROM platform_settings WHERE key = ${SETTINGS_KEY}
  `)
  const rows = getRows(result)
  if (rows.length === 0) return []
  const value = rows[0]?.value
  if (Array.isArray(value)) return value as KnowledgeEntry[]
  return []
}

async function saveKnowledgeEntries(entries: KnowledgeEntry[]): Promise<void> {
  const jsonStr = JSON.stringify(entries)
  await db.execute(sql`
    INSERT INTO platform_settings (id, key, value, updated_at)
    VALUES (gen_random_uuid(), ${SETTINGS_KEY}, ${jsonStr}::jsonb, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${jsonStr}::jsonb, updated_at = NOW()
  `)
}

// ─────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────

const createKnowledgeSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }).max(200),
  content: z.string().min(1, { message: 'Content is required' }).max(50000),
  category: z.string().min(1).max(100).default('general'),
  tenantId: z.string().uuid().optional(),
})

const updateKnowledgeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(50000).optional(),
  category: z.string().min(1).max(100).optional(),
  tenantId: z.string().uuid().nullable().optional(),
})

const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid knowledge entry ID' }),
})

// ─────────────────────────────────────────────
// GET / — 全域知識列表
// ─────────────────────────────────────────────
platformKnowledgeRoutes.get('/', async (c) => {
  try {
    const entries = await getKnowledgeEntries()
    return success(c, entries)
  } catch (err) {
    logger.error({ err }, '[Platform Knowledge] GET / error')
    return internalError(c, err)
  }
})

// ─────────────────────────────────────────────
// POST / — 新增知識條目
// ─────────────────────────────────────────────
platformKnowledgeRoutes.post(
  '/',
  zValidator('json', createKnowledgeSchema),
  async (c) => {
    const body = c.req.valid('json')

    try {
      const entries = await getKnowledgeEntries()
      const now = new Date().toISOString()
      const newEntry: KnowledgeEntry = {
        id: crypto.randomUUID(),
        title: body.title,
        content: body.content,
        category: body.category,
        tenantId: body.tenantId ?? null,
        createdAt: now,
        updatedAt: now,
      }

      entries.push(newEntry)
      await saveKnowledgeEntries(entries)

      logger.info({ entryId: newEntry.id, title: newEntry.title }, '[Platform Knowledge] Entry created')
      return success(c, newEntry, 201)
    } catch (err) {
      logger.error({ err }, '[Platform Knowledge] POST / error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// PUT /:id — 編輯知識條目
// ─────────────────────────────────────────────
platformKnowledgeRoutes.put(
  '/:id',
  zValidator('param', idParamSchema),
  zValidator('json', updateKnowledgeSchema),
  async (c) => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')

    if (Object.keys(body).length === 0) {
      return badRequest(c, 'At least one field is required')
    }

    try {
      const entries = await getKnowledgeEntries()
      const idx = entries.findIndex((e) => e.id === id)
      if (idx === -1) {
        return notFound(c, 'Knowledge entry')
      }

      const entry = entries[idx]!
      if (body.title !== undefined) entry.title = body.title
      if (body.content !== undefined) entry.content = body.content
      if (body.category !== undefined) entry.category = body.category
      if (body.tenantId !== undefined) entry.tenantId = body.tenantId
      entry.updatedAt = new Date().toISOString()

      await saveKnowledgeEntries(entries)

      logger.info({ entryId: id }, '[Platform Knowledge] Entry updated')
      return success(c, entry)
    } catch (err) {
      logger.error({ err, entryId: id }, '[Platform Knowledge] PUT /:id error')
      return internalError(c, err)
    }
  }
)

// ─────────────────────────────────────────────
// DELETE /:id — 刪除知識條目
// ─────────────────────────────────────────────
platformKnowledgeRoutes.delete(
  '/:id',
  zValidator('param', idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param')

    try {
      const entries = await getKnowledgeEntries()
      const idx = entries.findIndex((e) => e.id === id)
      if (idx === -1) {
        return notFound(c, 'Knowledge entry')
      }

      entries.splice(idx, 1)
      await saveKnowledgeEntries(entries)

      logger.info({ entryId: id }, '[Platform Knowledge] Entry deleted')
      return success(c, { id, deleted: true })
    } catch (err) {
      logger.error({ err, entryId: id }, '[Platform Knowledge] DELETE /:id error')
      return internalError(c, err)
    }
  }
)
