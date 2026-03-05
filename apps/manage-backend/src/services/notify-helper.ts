/**
 * Unified Notification Helper
 * 透過 guardianPhone 查找家長，發送 LINE + Telegram 通知
 * 透過 teacher userId 查找老師，發送 Telegram 通知
 * Fire-and-forget pattern：失敗只 log，不影響主流程
 */

import { eq, and, sql, isNotNull } from 'drizzle-orm'
import { db } from '../db'
import { users } from '../db/schema'
import { manageStudents, manageTeachers } from '@94cram/shared/db'
import { sendLinePushMessage } from './line'
import { sendTelegramMessage } from './notification'
import { logger } from '../utils/logger'

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://manage.94cram.com'
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
 * 根據老師 ID 查找老師的聯絡方式
 */
async function findTeacherContact(tenantId: string, teacherId: string): Promise<{
  userId: string | null
  name: string
  telegramId: string | null
  lineUserId: string | null
} | null> {
  try {
    // 先從 manage_teachers 取 userId
    const [teacher] = await db
      .select({ userId: manageTeachers.userId, name: manageTeachers.name })
      .from(manageTeachers)
      .where(and(eq(manageTeachers.id, teacherId), eq(manageTeachers.tenantId, tenantId)))
      .limit(1)

    if (!teacher) return null

    if (!teacher.userId) {
      return { userId: null, name: teacher.name, telegramId: null, lineUserId: null }
    }

    const [user] = await db
      .select({ telegramId: users.telegramId, lineUserId: users.lineUserId })
      .from(users)
      .where(eq(users.id, teacher.userId))
      .limit(1)

    return {
      userId: teacher.userId,
      name: teacher.name,
      telegramId: user?.telegramId ?? null,
      lineUserId: user?.lineUserId ?? null,
    }
  } catch (err) {
    logger.warn({ err, tenantId, teacherId }, '[NotifyHelper] findTeacherContact error')
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

/**
 * 批次通知多位學生的家長
 */
export async function notifyParents(
  tenantId: string,
  studentIds: string[],
  title: string,
  body: string,
  link?: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  for (const studentId of studentIds) {
    const ok = await notifyParent(tenantId, studentId, title, body, link)
    if (ok) sent++
    else failed++
    // Rate limit: 100ms between sends
    if (studentIds.length > 1) await new Promise(r => setTimeout(r, 100))
  }

  return { sent, failed }
}

/**
 * 通知老師（Telegram 優先，LINE 備援）
 */
export async function notifyTeacher(
  tenantId: string,
  teacherId: string,
  title: string,
  body: string,
  link?: string
): Promise<boolean> {
  const teacher = await findTeacherContact(tenantId, teacherId)
  if (!teacher) return false

  const tgText = link
    ? `*${title}*\n\n${body}\n\n[查看詳情](${link})`
    : `*${title}*\n\n${body}`

  const plainText = link
    ? `${title}\n\n${body}\n\n${link}`
    : `${title}\n\n${body}`

  if (teacher.telegramId) {
    const ok = await sendTg(teacher.telegramId, tgText)
    if (ok) return true
  }

  if (teacher.lineUserId) {
    const ok = await sendLine(teacher.lineUserId, plainText)
    if (ok) return true
  }

  logger.info({ tenantId, teacherId }, '[NotifyHelper] Teacher has no Telegram/LINE binding')
  return false
}

/**
 * 批次通知多位老師
 */
export async function notifyTeachers(
  tenantId: string,
  teacherIds: string[],
  title: string,
  body: string,
  link?: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  for (const teacherId of teacherIds) {
    const ok = await notifyTeacher(tenantId, teacherId, title, body, link)
    if (ok) sent++
    else failed++
    if (teacherIds.length > 1) await new Promise(r => setTimeout(r, 100))
  }

  return { sent, failed }
}

// ─── Pre-built notification templates ───────────────────────────────────────

/** 出缺勤通知 */
export function notifyAttendance(
  tenantId: string,
  studentId: string,
  studentName: string,
  status: 'present' | 'late' | 'absent' | 'leave',
  time?: string
) {
  const statusMap: Record<string, string> = {
    present: '已簽到',
    late: '遲到簽到',
    absent: '缺課（曠課）',
    leave: '已請假',
  }
  const statusLabel = statusMap[status] || status
  const timeStr = time ? `\n時間：${time}` : ''

  const title = status === 'present' ? '簽到通知' : status === 'late' ? '遲到通知' : status === 'absent' ? '缺課通知' : '請假通知'

  return notifyParent(
    tenantId,
    studentId,
    title,
    `${studentName} 同學${statusLabel}。${timeStr}\n\n如有疑問請聯繫補習班。`,
  )
}

/** 簽退通知 */
export function notifyCheckout(
  tenantId: string,
  studentId: string,
  studentName: string,
  time: string
) {
  return notifyParent(
    tenantId,
    studentId,
    '簽退通知',
    `${studentName} 同學已於 ${time} 簽退離開。`,
  )
}

/** 繳費單開立通知 */
export function notifyBillingCreated(
  tenantId: string,
  studentId: string,
  studentName: string,
  courseName: string,
  amount: number
) {
  return notifyParent(
    tenantId,
    studentId,
    '繳費單通知',
    `${studentName} 同學的「${courseName}」課程費用 NT$${amount.toLocaleString()} 繳費單已開立，請盡速繳費。`,
    `${PARENT_URL}/my-children/billing`,
  )
}

/** 繳費完成通知 */
export function notifyBillingPaid(
  tenantId: string,
  studentId: string,
  studentName: string,
  courseName: string,
  amount: number
) {
  return notifyParent(
    tenantId,
    studentId,
    '繳費確認通知',
    `${studentName} 同學的「${courseName}」課程費用 NT$${amount.toLocaleString()} 已收到繳費，感謝您！`,
  )
}

/** 欠繳催繳通知 */
export function notifyBillingOverdue(
  tenantId: string,
  studentId: string,
  studentName: string,
  unpaidItems: Array<{ courseName: string; amount: number }>
) {
  const itemLines = unpaidItems
    .map(i => `- ${i.courseName}：NT$${i.amount.toLocaleString()}`)
    .join('\n')
  const total = unpaidItems.reduce((s, i) => s + i.amount, 0)

  return notifyParent(
    tenantId,
    studentId,
    '課程費用催繳通知',
    `${studentName} 同學尚有以下課程費用未繳：\n\n${itemLines}\n\n合計：NT$${total.toLocaleString()}\n\n課程已開始上課，請盡速完成繳費，謝謝！`,
    `${PARENT_URL}/my-children/billing`,
  )
}

/** 調課/補課/停課通知 */
export function notifyScheduleChange(
  tenantId: string,
  studentId: string,
  studentName: string,
  changeType: 'reschedule' | 'makeup' | 'cancel',
  details: {
    courseName: string
    originalDate?: string
    originalTime?: string
    newDate?: string
    newTime?: string
    teacherName?: string
    room?: string
    reason?: string
  }
) {
  const typeLabel = changeType === 'reschedule' ? '調課通知' : changeType === 'makeup' ? '補課通知' : '停課通知'

  let body = `${studentName} 同學的課程有異動：\n\n課程：${details.courseName}`
  if (details.originalDate) body += `\n原日期：${details.originalDate}${details.originalTime ? ' ' + details.originalTime : ''}`
  if (changeType !== 'cancel' && details.newDate) body += `\n新日期：${details.newDate}${details.newTime ? ' ' + details.newTime : ''}`
  if (details.teacherName) body += `\n老師：${details.teacherName}`
  if (details.room) body += `\n教室：${details.room}`
  if (details.reason) body += `\n原因：${details.reason}`
  body += '\n\n如有疑問請聯繫補習班。'

  return notifyParent(tenantId, studentId, typeLabel, body)
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

/** 月度 AI 學習總結通知 */
export function notifyMonthlyAiSummary(
  tenantId: string,
  studentId: string,
  studentName: string,
  month: string,
  summary: string
) {
  return notifyParent(
    tenantId,
    studentId,
    `${month} 學習狀況總結`,
    `${studentName} 同學本月學習狀況：\n\n${summary}`,
    `${PARENT_URL}/my-children/grades`,
  )
}

/** 薪資發放通知（Telegram 為主） */
export function notifySalaryPaid(
  tenantId: string,
  teacherId: string,
  teacherName: string,
  period: string,
  totalAmount: number
) {
  return notifyTeacher(
    tenantId,
    teacherId,
    '薪資發放通知',
    `${teacherName} 老師您好，${period} 薪資 NT$${totalAmount.toLocaleString()} 已發放，請查看薪資條明細。`,
    `${DASHBOARD_URL}/my-salary`,
  )
}
