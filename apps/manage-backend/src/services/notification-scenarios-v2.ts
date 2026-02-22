/**
 * Notification Scenarios (Event-Driven)
 * 使用事件驅動架構重構的業務場景通知
 */

import { sql } from 'drizzle-orm'
import { db } from '../db'
import {
  emitScheduleChangeEvent,
  emitBillingReminderEvent,
  emitAttendanceAlertEvent,
  emitGradeNotificationEvent
} from '../events/helpers'
import type { NotificationChannel } from '../db/schema'

const DEFAULT_TENANT_ID = '11111111-1111-1111-1111-111111111111'

/**
 * 格式化日期時間
 */
function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleString('zh-TW', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * 發送調課通知（事件驅動版本）
 */
export async function sendScheduleChangeNotification(
  scheduleId: string,
  options?: {
    originalTime?: Date
    newTime?: Date
    reason?: string
  }
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  try {
    // 使用原始 SQL 查詢課程資訊
    const scheduleResult = await db.execute(sql`
      SELECT s.id, s.start_time, s.end_time, s.course_id, c.name as course_name, u.name as teacher_name
      FROM schedules s
      JOIN courses c ON s.course_id = c.id
      LEFT JOIN users u ON s.teacher_id = u.id
      WHERE s.id = ${scheduleId}
    `)

    if ((scheduleResult as any[]).length === 0) {
      throw new Error(`Schedule ${scheduleId} not found`)
    }

    const schedule = (scheduleResult as any[])[0]

    // 查詢該課程的所有學生和家長
    const recipientsResult = await db.execute(sql`
      SELECT DISTINCT 
        COALESCE(s.user_id, ps.parent_id) as recipient_id,
        s.id as student_id,
        s.name as student_name
      FROM course_enrollments ce
      JOIN students s ON ce.student_id = s.id
      LEFT JOIN parent_students ps ON s.id = ps.student_id
      WHERE ce.course_id = ${schedule.course_id}
    `)

    if ((recipientsResult as any[]).length === 0) {
      return { success: true, sentCount: 0 }
    }

    const recipientIds = (recipientsResult as any[]).map((r: any) => r.recipient_id).filter(Boolean)
    const studentId = (recipientsResult as any[])[0]?.student_id

    // 使用事件驅動發送通知
    const originalTime = options?.originalTime || schedule.start_time
    const newTime = options?.newTime || schedule.start_time

    const results = await emitScheduleChangeEvent({
      tenantId: DEFAULT_TENANT_ID,
      recipientIds,
      studentId,
      courseName: schedule.course_name,
      teacherName: schedule.teacher_name,
      originalTime: formatDateTime(originalTime),
      newTime: formatDateTime(newTime),
      reason: options?.reason,
      channels: ['telegram'] as NotificationChannel[]
    })

    const totalSent = results.reduce((sum, r) => sum + r.sentCount, 0)
    const hasError = results.some(r => !r.success)

    return {
      success: !hasError,
      sentCount: totalSent,
      error: hasError ? 'Some notifications failed' : undefined
    }
  } catch (error: any) {
    console.error('sendScheduleChangeNotification error:', error)
    return { success: false, sentCount: 0, error: error.message }
  }
}

/**
 * 發送繳費提醒（事件驅動版本）
 */
export async function sendBillingReminder(
  invoiceId: string
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  try {
    // 查詢帳單資訊
    const invoiceResult = await db.execute(sql`
      SELECT i.id, i.amount, i.due_date, i.student_id, s.name as student_name
      FROM invoices i
      JOIN students s ON i.student_id = s.id
      WHERE i.id = ${invoiceId}
    `)

    if ((invoiceResult as any[]).length === 0) {
      throw new Error(`Invoice ${invoiceId} not found`)
    }

    const invoice = (invoiceResult as any[])[0]

    // 查詢家長
    const parentsResult = await db.execute(sql`
      SELECT parent_id
      FROM parent_students
      WHERE student_id = ${invoice.student_id}
    `)

    const recipientIds = (parentsResult as any[]).map((r: any) => r.parent_id)

    if (recipientIds.length === 0) {
      return { success: true, sentCount: 0 }
    }

    // 計算距離到期日
    const daysUntilDue = Math.ceil(
      (new Date(invoice.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )

    // 使用事件驅動發送通知
    const results = await emitBillingReminderEvent({
      tenantId: DEFAULT_TENANT_ID,
      recipientIds,
      studentId: invoice.student_id,
      studentName: invoice.student_name,
      amount: Number(invoice.amount),
      dueDate: formatDate(invoice.due_date),
      daysUntilDue,
      channels: ['telegram'] as NotificationChannel[]
    })

    const totalSent = results.reduce((sum, r) => sum + r.sentCount, 0)
    const hasError = results.some(r => !r.success)

    return {
      success: !hasError,
      sentCount: totalSent,
      error: hasError ? 'Some notifications failed' : undefined
    }
  } catch (error: any) {
    console.error('sendBillingReminder error:', error)
    return { success: false, sentCount: 0, error: error.message }
  }
}

/**
 * 檢查並發送出席異常通知（事件驅動版本）
 */
export async function checkAndSendAttendanceAlert(
  studentId: string
): Promise<{ success: boolean; sentCount: number; alertSent: boolean; error?: string }> {
  try {
    // 查詢最近 10 次出席記錄
    const attendanceResult = await db.execute(sql`
      SELECT status, date
      FROM attendance
      WHERE student_id = ${studentId}
        AND date >= NOW() - INTERVAL '30 days'
      ORDER BY date DESC
      LIMIT 10
    `)

    // 檢查連續缺席
    let consecutiveAbsences = 0
    for (const record of attendanceResult as any[]) {
      if (record.status === 'absent') {
        consecutiveAbsences++
      } else {
        break
      }
    }

    // 連續缺席 3 次以上才通知
    if (consecutiveAbsences < 3) {
      return { success: true, sentCount: 0, alertSent: false }
    }

    // 查詢學生資訊
    const studentResult = await db.execute(sql`
      SELECT name FROM students WHERE id = ${studentId}
    `)

    if ((studentResult as any[]).length === 0) {
      throw new Error(`Student ${studentId} not found`)
    }

    const studentName = (studentResult as any[])[0].name

    // 查詢家長
    const parentsResult = await db.execute(sql`
      SELECT parent_id
      FROM parent_students
      WHERE student_id = ${studentId}
    `)

    const recipientIds = (parentsResult as any[]).map((r: any) => r.parent_id)

    if (recipientIds.length === 0) {
      return { success: true, sentCount: 0, alertSent: false }
    }

    // 使用事件驅動發送通知
    const results = await emitAttendanceAlertEvent({
      tenantId: DEFAULT_TENANT_ID,
      recipientIds,
      studentId,
      studentName,
      consecutiveAbsences,
      channels: ['telegram'] as NotificationChannel[]
    })

    const totalSent = results.reduce((sum, r) => sum + r.sentCount, 0)
    const hasError = results.some(r => !r.success)

    return {
      success: !hasError,
      sentCount: totalSent,
      alertSent: true,
      error: hasError ? 'Some notifications failed' : undefined
    }
  } catch (error: any) {
    console.error('checkAndSendAttendanceAlert error:', error)
    return { success: false, sentCount: 0, alertSent: false, error: error.message }
  }
}

/**
 * 發送成績通知（事件驅動版本）
 */
export async function sendGradeNotification(
  gradeId: string
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  try {
    // 查詢成績資訊
    const gradeResult = await db.execute(sql`
      SELECT g.id, g.score, g.exam_type, g.student_id, 
             s.name as student_name, c.name as course_name
      FROM grades g
      JOIN students s ON g.student_id = s.id
      LEFT JOIN courses c ON g.course_id = c.id
      WHERE g.id = ${gradeId}
    `)

    if ((gradeResult as any[]).length === 0) {
      throw new Error(`Grade ${gradeId} not found`)
    }

    const grade = (gradeResult as any[])[0]

    // 查詢家長
    const parentsResult = await db.execute(sql`
      SELECT parent_id
      FROM parent_students
      WHERE student_id = ${grade.student_id}
    `)

    const recipientIds = (parentsResult as any[]).map((r: any) => r.parent_id)

    if (recipientIds.length === 0) {
      return { success: true, sentCount: 0 }
    }

    // 使用事件驅動發送通知
    const results = await emitGradeNotificationEvent({
      tenantId: DEFAULT_TENANT_ID,
      recipientIds,
      studentId: grade.student_id,
      studentName: grade.student_name,
      courseName: grade.course_name || '未知課程',
      examType: grade.exam_type,
      score: grade.score,
      channels: ['telegram'] as NotificationChannel[]
    })

    const totalSent = results.reduce((sum, r) => sum + r.sentCount, 0)
    const hasError = results.some(r => !r.success)

    return {
      success: !hasError,
      sentCount: totalSent,
      error: hasError ? 'Some notifications failed' : undefined
    }
  } catch (error: any) {
    console.error('sendGradeNotification error:', error)
    return { success: false, sentCount: 0, error: error.message }
  }
}

/**
 * W8 兼容：發送調課通知（給 w8.ts 使用）
 * @deprecated 請改用 sendScheduleChangeNotification 配合事件驅動
 */
export async function sendScheduleChangeNotifications(
  payload: {
    change_type: 'cancel' | 'reschedule'
    course_name: string
    teacher_name: string
    original_date: string
    original_time: string
    new_date?: string
    new_time?: string
    reason?: string
  },
  recipients: Array<{
    student_name: string
    parent_telegram_id?: string
    parent_email?: string
  }>
): Promise<{ sent: number; failed: number }> {
  const title = payload.change_type === 'cancel' 
    ? '📅 課程取消通知' 
    : '📅 課程調整通知'

  const body = payload.change_type === 'cancel'
    ? `您好，以下課程已取消：\n\n**課程**：${payload.course_name}\n**原時間**：${payload.original_date} ${payload.original_time}\n**老師**：${payload.teacher_name}${payload.reason ? `\n**原因**：${payload.reason}` : ''}\n\n如有問題請聯繫櫃台，謝謝！`
    : `您好，以下課程有異動：\n\n**課程**：${payload.course_name}\n**原時間**：${payload.original_date} ${payload.original_time}\n**新時間**：${payload.new_date} ${payload.new_time}\n**老師**：${payload.teacher_name}${payload.reason ? `\n**原因**：${payload.reason}` : ''}\n\n如有問題請聯繫櫃台，謝謝！`

  let sent = 0
  let failed = 0

  for (const recipient of recipients) {
    if (!recipient.parent_telegram_id) {
      failed++
      continue
    }

    try {
      const result = await fetch(
        `https://api.telegram.org/bot8497754195:AAHkZcV3vXNnAv3UlM9QGe_FsnUioDvBtxg/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: recipient.parent_telegram_id,
            text: `*${title}*\n\n${body}`,
            parse_mode: 'Markdown'
          })
        }
      )

      const data = await result.json()
      if (data.ok) {
        sent++
      } else {
        failed++
      }
    } catch (error) {
      failed++
    }
  }

  return { sent, failed }
}
