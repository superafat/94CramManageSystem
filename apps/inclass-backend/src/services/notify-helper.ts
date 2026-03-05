/**
 * Unified Notification Helper for inClass
 * 透過 inclass_parents 表查找家長，發送 LINE 通知
 * Fire-and-forget pattern：失敗只 log，不影響主流程
 */

import { sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { sendLinePushMessage } from './line.js'
import { sendTelegramMessage } from './telegram.js'
import { logger } from '../utils/logger.js'

const PARENT_URL = process.env.PARENT_URL || 'https://parent.94cram.com'

interface ParentContact {
  parentId: string
  name: string
  lineUserId: string | null
}

/**
 * 根據學生 ID 查找其家長的聯絡方式（使用 inclass_parents 表）
 */
async function findParentByStudent(tenantId: string, studentId: string): Promise<ParentContact | null> {
  try {
    const result = await db.execute(sql`
      SELECT id as "parentId", name, line_user_id as "lineUserId"
      FROM inclass_parents
      WHERE tenant_id = ${tenantId}
        AND student_id = ${studentId}
        AND notify_enabled = true
        AND deleted_at IS NULL
      LIMIT 1
    `)

    const rows = result as unknown as Array<Record<string, unknown>>
    if (!rows || rows.length === 0) return null

    const row = rows[0]
    return {
      parentId: row.parentId as string,
      name: row.name as string,
      lineUserId: (row.lineUserId as string) ?? null,
    }
  } catch (err) {
    logger.warn({ err, tenantId, studentId }, '[NotifyHelper] findParentByStudent error')
    return null
  }
}

/**
 * 發送 LINE 文字訊息（fire-and-forget）
 */
async function sendLine(lineUserId: string, text: string): Promise<boolean> {
  try {
    const result = await sendLinePushMessage(lineUserId, [{ type: 'text', text }])
    return result.success
  } catch {
    return false
  }
}

/**
 * 發送 Telegram 文字訊息（fire-and-forget）
 */
async function sendTg(telegramId: string, text: string): Promise<boolean> {
  try {
    const result = await sendTelegramMessage(telegramId, text)
    return result.success
  } catch {
    return false
  }
}

/**
 * 通知家長（LINE 為主通道）
 * @returns 是否成功送達
 */
export async function notifyParent(
  tenantId: string,
  studentId: string,
  title: string,
  body: string,
  link?: string
): Promise<boolean> {
  const parent = await findParentByStudent(tenantId, studentId)
  if (!parent) {
    logger.debug({ tenantId, studentId }, '[NotifyHelper] No parent found for student')
    return false
  }

  const fullText = link
    ? `${title}\n\n${body}\n\n${link}`
    : `${title}\n\n${body}`

  if (parent.lineUserId) {
    const ok = await sendLine(parent.lineUserId, fullText)
    if (ok) return true
  }

  logger.info({ tenantId, studentId, parentId: parent.parentId }, '[NotifyHelper] Parent has no LINE binding')
  return false
}

/** 聯絡簿通知 */
export function notifyContactBook(
  tenantId: string,
  studentId: string,
  studentName: string,
  entryDate: string,
  entryId: string
) {
  return notifyParent(
    tenantId,
    studentId,
    '今日聯絡簿通知',
    `${studentName} 同學 ${entryDate} 的聯絡簿已送出，請點擊下方連結查看詳情。`,
    `${PARENT_URL}/my-children/notifications`,
  )
}
