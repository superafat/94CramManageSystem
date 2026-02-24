/**
 * Notification Scenarios (Simplified)
 * 使用原始 SQL 查詢，不依賴 Drizzle schema 關聯
 */

import { sql } from 'drizzle-orm'
import { db } from '../db'
import { sendBulkNotifications } from './notification'
import type { NotificationType, NotificationChannel } from '../db/schema'
import type { RowList } from 'postgres'

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

interface ScheduleRow {
  id: string
  tenant_id: string
  course_id: string
  start_time: string | Date
  end_time: string | Date
  course_name: string
  teacher_name?: string | null
}

interface RecipientRow {
  recipient_id: string | null
  student_id: string
  student_name: string
}

interface InvoiceRow {
  id: string
  tenant_id: string
  amount: number
  due_date: string | Date
  student_id: string
  student_name: string
}

interface ParentRow {
  parent_id: string | null
}

interface AttendanceRow {
  status: string
  date: string | Date
}

interface StudentRow {
  name: string
  tenant_id: string
}

interface GradeRow {
  id: string
  tenant_id: string
  score: number
  exam_type: string
  student_id: string
  student_name: string
  course_name?: string | null
  course_id?: string | null
}

function normalizeRows<T>(result: RowList<T> | T[]): T[] {
  return Array.isArray(result) ? result : Array.from(result)
}

/**
 * 發送調課通知
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
      SELECT s.id, s.tenant_id, s.course_id, s.start_time, s.end_time, c.name as course_name, u.name as teacher_name
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
        AND s.tenant_id = ${schedule.tenant_id}
    `)

    if ((recipientsResult as any[]).length === 0) {
      return { success: true, sentCount: 0 }
    }

    const recipientIds = (recipientsResult as any[]).map((r: any) => r.recipient_id).filter(Boolean)
    const studentId = (recipientsResult as any[])[0]?.student_id

    // 組成通知內容
    const originalTime = options?.originalTime || schedule.start_time
    const newTime = options?.newTime || schedule.start_time

    const title = '📅 課程異動通知'
    const body = `
您好，以下課程有異動：

**課程**：${schedule.course_name}
**原時間**：${formatDateTime(originalTime)}
**新時間**：${formatDateTime(newTime)}
**老師**：${schedule.teacher_name || '待定'}${options?.reason ? `\n**原因**：${options.reason}` : ''}

如有問題請聯繫櫃台，謝謝！
    `.trim()

    // 批次發送
    const result = await sendBulkNotifications({
      tenantId: schedule.tenant_id,
      type: 'schedule_change' as NotificationType,
      recipientIds,
      studentId,
      title,
      body,
      channel: 'telegram' as NotificationChannel,
      metadata: {
        schedule_id: scheduleId,
        course_id: schedule.course_id,
        original_time: originalTime,
        new_time: newTime,
        reason: options?.reason
      }
    })

    return {
      success: result.success,
      sentCount: result.sentCount,
      error: result.errors.length > 0 ? result.errors[0].error : undefined
    }
  } catch (error: any) {
    console.error('sendScheduleChangeNotification error:', error)
    return { success: false, sentCount: 0, error: error.message }
  }
}

/**
 * 發送繳費提醒
 */
export async function sendBillingReminder(
  invoiceId: string
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  try {
    // 查詢帳單資訊
    const invoiceResult = await db.execute(sql`
      SELECT i.id, i.tenant_id, i.amount, i.due_date, i.student_id, s.name as student_name
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
      SELECT ps.parent_id
      FROM parent_students ps
      JOIN students s ON ps.student_id = s.id
      WHERE ps.student_id = ${invoice.student_id}
        AND s.tenant_id = ${invoice.tenant_id}
    `)

    const recipientIds = (parentsResult as any[]).map((r: any) => r.parent_id)

    if (recipientIds.length === 0) {
      return { success: true, sentCount: 0 }
    }

    // 計算距離到期日
    const daysUntilDue = Math.ceil(
      (new Date(invoice.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )

    // 組成通知內容
    const title = '💰 繳費提醒'
    const body = `
您好，以下帳單即將到期：

**學生**：${invoice.student_name}
**金額**：NT$ ${Number(invoice.amount).toLocaleString()}
**到期日**：${formatDate(invoice.due_date)} (剩餘 ${daysUntilDue} 天)

請盡快完成繳費，謝謝！
    `.trim()

    const result = await sendBulkNotifications({
      tenantId: invoice.tenant_id,
      type: 'billing_reminder' as NotificationType,
      recipientIds,
      studentId: invoice.student_id,
      title,
      body,
      channel: 'telegram' as NotificationChannel,
      metadata: {
        invoice_id: invoiceId,
        amount: invoice.amount,
        due_date: invoice.due_date,
        days_until_due: daysUntilDue
      }
    })

    return {
      success: result.success,
      sentCount: result.sentCount,
      error: result.errors.length > 0 ? result.errors[0].error : undefined
    }
  } catch (error: any) {
    console.error('sendBillingReminder error:', error)
    return { success: false, sentCount: 0, error: error.message }
  }
}

/**
 * 檢查並發送出席異常通知
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
      SELECT name, tenant_id FROM students WHERE id = ${studentId}
    `)

    if ((studentResult as any[]).length === 0) {
      throw new Error(`Student ${studentId} not found`)
    }

    const studentName = (studentResult as any[])[0].name
    const tenantId = (studentResult as any[])[0].tenant_id

    // 查詢家長
    const parentsResult = await db.execute(sql`
      SELECT ps.parent_id
      FROM parent_students ps
      JOIN students s ON ps.student_id = s.id
      WHERE ps.student_id = ${studentId}
        AND s.tenant_id = ${tenantId}
    `)

    const recipientIds = (parentsResult as any[]).map((r: any) => r.parent_id)

    if (recipientIds.length === 0) {
      return { success: true, sentCount: 0, alertSent: false }
    }

    // 組成通知內容
    const title = '⚠️ 出席異常通知'
    const body = `
您好，${studentName} 同學已連續缺席 ${consecutiveAbsences} 次課程。

請確認學生是否有特殊狀況，如需請假請提前告知，謝謝！
    `.trim()

    const result = await sendBulkNotifications({
      tenantId,
      type: 'attendance_alert' as NotificationType,
      recipientIds,
      studentId: studentId,
      title,
      body,
      channel: 'telegram' as NotificationChannel,
      metadata: {
        consecutive_absences: consecutiveAbsences,
        last_attendance_date: (attendanceResult as any[])[0]?.date
      }
    })

    return {
      success: result.success,
      sentCount: result.sentCount,
      alertSent: true,
      error: result.errors.length > 0 ? result.errors[0].error : undefined
    }
  } catch (error: any) {
    console.error('checkAndSendAttendanceAlert error:', error)
    return { success: false, sentCount: 0, alertSent: false, error: error.message }
  }
}

/**
 * 發送成績通知
 */
export async function sendGradeNotification(
  gradeId: string
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  try {
    // 查詢成績資訊
    const gradeResult = await db.execute(sql`
      SELECT g.id, g.tenant_id, g.score, g.exam_type, g.student_id, 
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
      SELECT ps.parent_id
      FROM parent_students ps
      JOIN students s ON ps.student_id = s.id
      WHERE ps.student_id = ${grade.student_id}
        AND s.tenant_id = ${grade.tenant_id}
    `)

    const recipientIds = (parentsResult as any[]).map((r: any) => r.parent_id)

    if (recipientIds.length === 0) {
      return { success: true, sentCount: 0 }
    }

    // 組成通知內容
    const examTypeMap: Record<string, string> = {
      quiz: '小考',
      midterm: '期中考',
      final: '期末考',
      homework: '作業',
      project: '專題'
    }

    const title = '📊 成績通知'
    const body = `
您好，${grade.student_name} 的成績已登錄：

**課程**：${grade.course_name || '未知課程'}
**類型**：${examTypeMap[grade.exam_type] || grade.exam_type}
**分數**：${grade.score} 分

請登入系統查看詳細資訊。
    `.trim()

    const result = await sendBulkNotifications({
      tenantId: grade.tenant_id,
      type: 'grade_notification' as NotificationType,
      recipientIds,
      studentId: grade.student_id,
      title,
      body,
      channel: 'telegram' as NotificationChannel,
      metadata: {
        grade_id: gradeId,
        course_id: grade.course_id,
        score: grade.score,
        exam_type: grade.exam_type
      }
    })

    return {
      success: result.success,
      sentCount: result.sentCount,
      error: result.errors.length > 0 ? result.errors[0].error : undefined
    }
  } catch (error: any) {
    console.error('sendGradeNotification error:', error)
    return { success: false, sentCount: 0, error: error.message }
  }
}

/**
 * W8 兼容：發送調課通知（給 w8.ts 使用）
 * @deprecated 請改用 sendScheduleChangeNotification
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
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN

  if (!telegramBotToken) {
    console.error('sendScheduleChangeNotifications error: TELEGRAM_BOT_TOKEN is not configured')
    return { sent: 0, failed: recipients.length }
  }

  for (const recipient of recipients) {
    if (!recipient.parent_telegram_id) {
      failed++
      continue
    }

    try {
      const result = await fetch(
        `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
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
