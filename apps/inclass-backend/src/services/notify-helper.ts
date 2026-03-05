/**
 * Unified Notification Helper
 * 透過 guardianPhone 查找家長，發送 LINE + Telegram 通知
 * Fire-and-forget pattern：失敗只 log，不影響主流程
 */

import { eq, and, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users, manageStudents, manageTeachers } from '@94cram/shared/db'
import { sendLinePushMessage } from './line.js'
import { sendTelegramMessage } from './telegram.js'
import { logger } from '../utils/logger.js'

const PARENT_URL = process.env.PARENT_URL || 'https://parent.94cram.com'

interface ParentContact {
  userId: string
  name: string | null
  lineUserId: string | null
  telegramId: string | null
}

/**
 * 根據學生 ID 查找其家長的聯絡方式
 */
async function findParentByStudent(tenantId: string, studentId: string): Promise<ParentContact | null> {
  try {
    const [student] = await db
      .select({ guardianPhone: manageStudents.guardianPhone })
      .from(manageStudents)
      .where(and(eq(manageStudents.id, studentId), eq(manageStudents.tenantId, tenantId)))
      .limit(1)

    if (!student?.guardianPhone) return null

    const [parent] = await db
      .select({
        userId: users.id,
        name: users.name,
        lineUserId: users.lineUserId,
        telegramId: users.telegramId,
      })
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          eq(users.role, 'parent'),
          sql`${users.phone} = ${student.guardianPhone}`,
        )
      )
      .limit(1)

    return parent ?? null
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
 * 通知家長（LINE + Telegram 雙通道）
 * @returns 是否成功送達至少一個通道
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

  const tgText = link
    ? `*${title}*\n\n${body}\n\n[查看詳情](${link})`
    : `*${title}*\n\n${body}`

  let sent = false

  if (parent.lineUserId) {
    const ok = await sendLine(parent.lineUserId, fullText)
    if (ok) sent = true
  }

  if (parent.telegramId) {
    const ok = await sendTg(parent.telegramId, tgText)
    if (ok) sent = true
  }

  if (!sent) {
    logger.info({ tenantId, studentId, parentId: parent.userId }, '[NotifyHelper] Parent has no LINE/Telegram binding')
  }

  return sent
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
