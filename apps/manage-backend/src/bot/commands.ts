/**
 * Bot Command System — Telegram 即 Dashboard
 * 教室長用手機操作一切
 */
import { db } from '../db/index'
import { sql } from 'drizzle-orm'
import { rows, first } from '../db/helpers'
import { analyzeChurnRisk } from '../ai/churn'
import { generateBranchReport } from '../ai/reports'
import { generateInvoices } from '../ai/billing'
import { checkConflicts, createTimeSlot } from '../ai/scheduling'
import { logger } from '../utils/logger'

const DEFAULT_TENANT = '11111111-1111-1111-1111-111111111111'

interface CmdContext {
  tenantId: string
  branchId: string
  userId: string
}

/**
 * Parse natural language into structured command
 * Returns {action, params} or null if not a command
 */
export function parseCommand(text: string): { action: string; params: Record<string, string> } | null {
  const t = text.trim()

  // === Reply keyboard buttons ===
  if (t === '📊 報告') return { action: 'branch_report', params: {} }
  if (t === '📅 課表') return { action: 'schedule', params: {} }
  if (t === '👥 學生列表') return { action: 'list_students', params: {} }
  if (t === '💰 帳單') return { action: 'billing', params: {} }
  if (t === '⚠️ 預警') return { action: 'churn_alert', params: {} }
  if (t === '🎯 招生') return { action: 'leads', params: {} }

  // === 出席/報告 ===
  if (/本週出席|出席報告|出席率/i.test(t)) return { action: 'attendance_report', params: {} }
  if (/月報|本月報告|分校報告|報告/i.test(t)) return { action: 'branch_report', params: {} }
  if (/預警|流失|風險/i.test(t)) return { action: 'churn_alert', params: {} }

  // === 學生管理 ===
  const addStudent = t.match(/新增學生\s+(\S+)\s+(\S+)\s*(.*)/i)
  if (addStudent) {
    return { action: 'add_student', params: { name: addStudent[1], grade: addStudent[2], courses: addStudent[3] || '' } }
  }

  if (/學生列表|學生名單|所有學生/i.test(t)) return { action: 'list_students', params: {} }

  const studentInfo = t.match(/(?:查|找)\s*(\S+)\s*(?:的)?(?:資料|狀況|成績|出席)/i)
  if (studentInfo) return { action: 'student_info', params: { name: studentInfo[1] } }

  // === 排課 ===
  if (/本週課表|下週課表|排課表|課表/i.test(t)) return { action: 'schedule', params: {} }

  const addSchedule = t.match(/排課\s+(\S+)\s+(\S+)\s+(?:週|星期)([一二三四五六日])\s*(\d{1,2}:\d{2})/i)
  if (addSchedule) {
    return { action: 'add_schedule', params: {
      student: addSchedule[1], subject: addSchedule[2],
      day: addSchedule[3], time: addSchedule[4]
    }}
  }

  // === 帳單 ===
  if (/帳單|學費|本月學費|生成帳單/i.test(t)) return { action: 'billing', params: {} }
  if (/未繳|欠費|逾期/i.test(t)) return { action: 'unpaid', params: {} }

  // === 招生 ===
  const addLead = t.match(/(?:試聽|問班)\s+(\S+)\s+(\S+)\s+(\S+)\s*(.*)/i)
  if (addLead) {
    return { action: 'add_lead', params: {
      parentName: addLead[1], studentName: addLead[2],
      grade: addLead[3], note: addLead[4] || ''
    }}
  }

  if (/招生|試聽列表|追蹤/i.test(t)) return { action: 'leads', params: {} }

  // === 教練 ===
  if (/教練列表|老師列表/i.test(t)) return { action: 'list_teachers', params: {} }

  // === 控制台 ===
  if (/打開控制台|開啟控制台|控制台|dashboard/i.test(t)) return { action: 'open_app', params: {} }

  return null
}

// ===== Command Handlers =====

export async function handleCommand(
  action: string,
  params: Record<string, string>,
  ctx: CmdContext
): Promise<string> {
  try {
    switch (action) {
      case 'attendance_report': return await cmdAttendanceReport(ctx)
      case 'branch_report': return await cmdBranchReport(ctx)
      case 'churn_alert': return await cmdChurnAlert(ctx)
      case 'add_student': return await cmdAddStudent(ctx, params)
      case 'list_students': return await cmdListStudents(ctx)
      case 'student_info': return await cmdStudentInfo(ctx, params)
      case 'schedule': return await cmdSchedule(ctx)
      case 'billing': return await cmdBilling(ctx)
      case 'unpaid': return await cmdUnpaid(ctx)
      case 'add_lead': return await cmdAddLead(ctx, params)
      case 'leads': return await cmdLeads(ctx)
      case 'list_teachers': return await cmdListTeachers(ctx)
      case 'open_app': return '📱 請使用 /app 指令開啟控制台，或直接點選下方按鈕！'
      default: return '❌ 不支援的指令'
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error({ err }, `[cmd/${action}]: ${msg}`)
    return `❌ 執行失敗：${msg}`
  }
}

// --- 出席報告 ---
async function cmdAttendanceReport(ctx: CmdContext): Promise<string> {
  const today = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(today.getDate() - 7)
  const startStr = weekAgo.toISOString().slice(0, 10)
  const endStr = today.toISOString().slice(0, 10)

  const attendanceRows = rows(await db.execute(sql`
    SELECT s.name,
      COUNT(*) FILTER (WHERE a.status = 'present')::int as present,
      COUNT(*) FILTER (WHERE a.status = 'absent')::int as absent,
      COUNT(*) FILTER (WHERE a.status = 'late')::int as late,
      COUNT(*)::int as total
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    WHERE a.tenant_id = ${ctx.tenantId}
      AND a.date >= ${startStr}::date AND a.date <= ${endStr}::date
    GROUP BY s.name ORDER BY s.name
  `))

  if (!attendanceRows.length) return '📊 本週無出席紀錄'

  let msg = `📊 *本週出席報告*\n${startStr} ~ ${endStr}\n\n`
  let totalPresent = 0, totalAbsent = 0, totalAll = 0
  for (const _r of attendanceRows) {
    const r = _r as { name: string; present: number; absent: number; late: number; total: number }
    const rate = r.total > 0 ? Math.round(r.present / r.total * 100) : 0
    const emoji = rate >= 80 ? '✅' : rate >= 60 ? '⚠️' : '🔴'
    msg += `${emoji} ${r.name}：${rate}%（到${r.present}/缺${r.absent}/遲${r.late}）\n`
    totalPresent += r.present
    totalAbsent += r.absent
    totalAll += r.total
  }
  const overallRate = totalAll > 0 ? Math.round(totalPresent / totalAll * 100) : 0
  msg += `\n📈 整體出席率：${overallRate}%`
  return msg
}

// --- 分校月報 ---
async function cmdBranchReport(ctx: CmdContext): Promise<string> {
  const period = new Date().toISOString().slice(0, 7)
  const report = await generateBranchReport(ctx.tenantId, ctx.branchId, period)
  const s = report.summary

  let msg = `📋 *${period} 分校月報*\n\n`
  msg += `👨‍🎓 學生：${s.activeStudents}人（新${s.newStudents}/退${s.droppedStudents}）\n`
  msg += `📊 出席率：${Math.round(s.avgAttendanceRate * 100)}%\n`
  msg += `📝 平均成績：${s.avgGrade}\n`
  msg += `💰 月營收：$${s.totalRevenue.toLocaleString()}\n\n`

  if (report.churnAlerts.length > 0) {
    msg += `⚠️ *流失預警：*\n`
    for (const a of report.churnAlerts) {
      const emoji = a.riskLevel === 'high' ? '🔴' : '🟡'
      msg += `${emoji} ${a.studentName}（${a.riskScore}分）\n`
    }
  }

  msg += `\n📚 *課程統計：*\n`
  for (const c of report.courseStats) {
    msg += `• ${c.courseName}：${c.studentCount}人 $${c.monthlyRevenue.toLocaleString()}/月\n`
  }

  return msg
}

// --- 流失預警 ---
async function cmdChurnAlert(ctx: CmdContext): Promise<string> {
  const risks = await analyzeChurnRisk(ctx.tenantId, ctx.branchId, 60)
  const alerts = risks.filter(r => r.riskLevel !== 'low')

  if (!alerts.length) return '✅ 目前所有學生狀況良好，無流失風險'

  let msg = `⚠️ *流失預警報告*\n\n`
  for (const r of alerts) {
    const emoji = r.riskLevel === 'high' ? '🔴' : '🟡'
    msg += `${emoji} *${r.studentName}*（${r.grade}）— 風險 ${r.riskScore}分\n`
    for (const f of r.factors) {
      msg += `   • ${f.detail}\n`
    }
    msg += `   💡 ${r.recommendation}\n\n`
  }
  return msg
}

// --- 新增學生 ---
async function cmdAddStudent(ctx: CmdContext, params: Record<string, string>): Promise<string> {
  const { name, grade, courses } = params

  // Parse grade: '三年級'→'小3', '國二'→'國2', '高一'→'高1', or direct
  const gradeNorm = normalizeGrade(grade)

  const studentId = (first(await db.execute(sql`
    INSERT INTO students (tenant_id, branch_id, name, grade, status, enrolled_at)
    VALUES (${ctx.tenantId}, ${ctx.branchId}, ${name}, ${gradeNorm}, 'active', NOW())
    RETURNING id
  `)) as { id: string } | undefined)?.id
  let msg = `✅ 已新增學生 *${name}*（${gradeNorm}）\n`

  // Auto-create enrollments if courses specified
  if (courses.trim()) {
    const courseList = courses.split(/[、,，\s]+/).filter(Boolean)
    for (const course of courseList) {
      const fee = estimateFee(gradeNorm, course)
      await db.execute(sql`
        INSERT INTO enrollments (tenant_id, student_id, course_name, fee_monthly, status)
        VALUES (${ctx.tenantId}, ${studentId}, ${course}, ${fee}, 'active')
      `)
      msg += `📚 選課：${course}（$${fee.toLocaleString()}/月）\n`
    }
  }

  msg += `\n📱 Dashboard 已同步更新`
  return msg
}

// --- 學生列表 ---
async function cmdListStudents(ctx: CmdContext): Promise<string> {
  const studentList = rows(await db.execute(sql`
    SELECT s.name, s.grade, s.status, s.risk_score,
      (SELECT string_agg(e.course_name, '、')
       FROM enrollments e WHERE e.student_id = s.id AND e.status = 'active') as courses
    FROM students s
    WHERE s.tenant_id = ${ctx.tenantId}
      AND s.branch_id = ${ctx.branchId}
      AND s.status = 'active'
      AND s.deleted_at IS NULL
    ORDER BY s.name
  `))

  if (!studentList.length) return '📭 目前沒有學生'

  let msg = `👨‍🎓 *學生列表*（${studentList.length}人）\n\n`
  for (const _r of studentList) {
    const r = _r as { name: string; grade: string; risk_score: number; courses: string | null }
    const riskEmoji = r.risk_score >= 60 ? '🔴' : r.risk_score >= 30 ? '🟡' : ''
    msg += `• ${r.name}（${r.grade}）${riskEmoji}\n  📚 ${r.courses || '未選課'}\n`
  }
  return msg
}

// --- 查詢學生 ---
async function cmdStudentInfo(ctx: CmdContext, params: Record<string, string>): Promise<string> {
  const { name } = params
  const studentRows = rows(await db.execute(sql`
    SELECT s.*,
      (SELECT json_agg(json_build_object('course', e.course_name, 'fee', e.fee_monthly))
       FROM enrollments e WHERE e.student_id = s.id AND e.status = 'active') as courses
    FROM students s
    WHERE s.tenant_id = ${ctx.tenantId} AND s.name LIKE ${'%' + name + '%'}
    LIMIT 1
  `))

  if (!studentRows.length) return `❌ 找不到學生「${name}」`

  const s = studentRows[0] as { id: string; name: string; grade: string; phone: string | null; parent_name: string | null; school: string | null; courses: Array<{ course: string; fee: number }> | null }
  let msg = `👤 *${s.name}*（${s.grade}）\n`
  msg += `📱 ${s.phone || '未設定'} | 家長：${s.parent_name || '未設定'}\n`
  msg += `🏫 ${s.school || '未設定'}\n`

  if (s.courses) {
    msg += `\n📚 *選課：*\n`
    for (const c of s.courses) {
      msg += `• ${c.course} — $${c.fee?.toLocaleString()}/月\n`
    }
  }

  // Recent attendance
  const att = rows(await db.execute(sql`
    SELECT status, COUNT(*)::int as cnt FROM attendance
    WHERE student_id = ${s.id} AND date >= NOW() - INTERVAL '30 days'
    GROUP BY status
  `))

  if (att.length > 0) {
    const attMap: Record<string, number> = {}
    let total = 0
    for (const _a of att) { const a = _a as { status: string; cnt: number }; attMap[a.status] = a.cnt; total += a.cnt }
    const rate = total > 0 ? Math.round(((attMap['present'] ?? 0) + (attMap['late'] ?? 0)) / total * 100) : 0
    msg += `\n📊 近30天出席率：${rate}%（到${attMap['present'] ?? 0}/缺${attMap['absent'] ?? 0}/遲${attMap['late'] ?? 0}）`
  }

  // Recent grades
  const grades = rows(await db.execute(sql`
    SELECT exam_name, score, date::text FROM grades
    WHERE student_id = ${s.id} ORDER BY date DESC LIMIT 3
  `))

  if (grades.length > 0) {
    msg += `\n\n📝 *最近成績：*\n`
    for (const _g of grades) {
      const g = _g as { exam_name: string; score: number; date: string }
      msg += `• ${g.exam_name}：${g.score}分（${g.date}）\n`
    }
  }

  return msg
}

// --- 課表 ---
async function cmdSchedule(ctx: CmdContext): Promise<string> {
  const scheduleRows = rows(await db.execute(sql`
    SELECT ts.day_of_week, ts.start_time::text, ts.end_time::text, ts.subject,
           s.name as student_name, t.name as teacher_name
    FROM time_slots ts
    LEFT JOIN students s ON ts.student_id = s.id
    LEFT JOIN teachers t ON ts.teacher_id = t.id
    WHERE ts.tenant_id = ${ctx.tenantId} AND ts.branch_id = ${ctx.branchId}
      AND ts.status = 'active'
    ORDER BY ts.day_of_week, ts.start_time
  `))

  if (!scheduleRows.length) return '📅 目前無排課紀錄'

  const dayNames = ['', '一', '二', '三', '四', '五', '六', '日']
  let msg = `📅 *本週課表*\n\n`
  let currentDay = 0

  for (const _r of scheduleRows) {
    const r = _r as { day_of_week: number; start_time: string; end_time: string; student_name: string; subject: string; teacher_name: string | null }
    if (r.day_of_week !== currentDay) {
      currentDay = r.day_of_week
      msg += `\n*週${dayNames[currentDay]}*\n`
    }
    msg += `  ${r.start_time.slice(0, 5)}-${r.end_time.slice(0, 5)} | ${r.student_name} | ${r.subject}`
    if (r.teacher_name) msg += ` | 教練${r.teacher_name}`
    msg += '\n'
  }
  return msg
}

// --- 帳單 ---
async function cmdBilling(ctx: CmdContext): Promise<string> {
  const period = new Date().toISOString().slice(0, 7)

  // Try to generate if not exists
  const result = await generateInvoices(ctx.tenantId, ctx.branchId, period)

  // Fetch all invoices
  const invoiceRows = rows(await db.execute(sql`
    SELECT i.*, s.name as student_name FROM invoices i
    JOIN students s ON i.student_id = s.id
    WHERE i.tenant_id = ${ctx.tenantId} AND i.branch_id = ${ctx.branchId} AND i.period = ${period}
    ORDER BY s.name
  `))

  if (!invoiceRows.length) return `💰 ${period} 無帳單`

  let totalAmount = 0
  let paidCount = 0
  let msg = `💰 *${period} 學費帳單*\n\n`

  for (const _r of invoiceRows) {
    const r = _r as { status: string; student_name: string; total: number }
    const statusEmoji = r.status === 'paid' ? '✅' : r.status === 'overdue' ? '🔴' : '⏳'
    msg += `${statusEmoji} ${r.student_name}：$${Number(r.total).toLocaleString()}\n`
    totalAmount += Number(r.total)
    if (r.status === 'paid') paidCount++
  }

  msg += `\n💵 總額：$${totalAmount.toLocaleString()}`
  msg += `\n📊 已繳：${paidCount}/${invoiceRows.length}`

  if (result.generated > 0) {
    msg += `\n\n🆕 本次新生成 ${result.generated} 張帳單`
  }

  return msg
}

// --- 未繳 ---
async function cmdUnpaid(ctx: CmdContext): Promise<string> {
  const unpaidRows = rows(await db.execute(sql`
    SELECT i.period, i.total, s.name, s.phone
    FROM invoices i
    JOIN students s ON i.student_id = s.id
    WHERE i.tenant_id = ${ctx.tenantId} AND i.status IN ('pending', 'overdue')
    ORDER BY i.period, s.name
  `))

  if (!unpaidRows.length) return '✅ 全部已繳清！'

  let msg = `🔴 *未繳學費列表*\n\n`
  let total = 0
  for (const _r of unpaidRows) {
    const r = _r as { name: string; period: string; total: number; phone: string | null }
    msg += `• ${r.name}（${r.period}）：$${Number(r.total).toLocaleString()}\n`
    if (r.phone) msg += `  📱 ${r.phone}\n`
    total += Number(r.total)
  }
  msg += `\n💵 未繳總額：$${total.toLocaleString()}`
  return msg
}

// --- 新增試聽 ---
async function cmdAddLead(ctx: CmdContext, params: Record<string, string>): Promise<string> {
  const { parentName, studentName, grade, note } = params

  await db.execute(sql`
    INSERT INTO leads (tenant_id, branch_id, parent_name, student_name, grade, source, follow_up_notes, next_follow_up)
    VALUES (${ctx.tenantId}, ${ctx.branchId}, ${parentName}, ${studentName},
            ${normalizeGrade(grade)}, 'phone', ${note || null},
            (CURRENT_DATE + INTERVAL '3 days')::date)
  `)

  return `✅ 已新增試聽紀錄\n👤 家長：${parentName}\n🎒 學生：${studentName}（${normalizeGrade(grade)}）\n📅 3天後追蹤提醒\n\n📱 Dashboard 已同步`
}

// --- 招生列表 ---
async function cmdLeads(ctx: CmdContext): Promise<string> {
  const leadsRows = rows(await db.execute(sql`
    SELECT * FROM leads
    WHERE tenant_id = ${ctx.tenantId}
      AND status IN ('inquiry', 'scheduled', 'trial')
    ORDER BY created_at DESC LIMIT 10
  `))

  if (!leadsRows.length) return '📭 目前無招生追蹤紀錄'

  let msg = `🎯 *招生追蹤*（${leadsRows.length}筆）\n\n`
  const statusMap: Record<string, string> = {
    inquiry: '📞 問班', scheduled: '📅 已約', trial: '🎓 試聽中',
  }
  for (const _r of leadsRows) {
    const r = _r as { status: string; student_name: string; grade: string; parent_name: string | null; next_follow_up: string | null }
    msg += `${statusMap[r.status] ?? r.status} ${r.student_name}（${r.grade}）\n`
    msg += `  👤 ${r.parent_name || '未知'}`
    if (r.next_follow_up) msg += ` | 📅 追蹤：${r.next_follow_up}`
    msg += '\n'
  }
  return msg
}

// --- 教練列表 ---
async function cmdListTeachers(ctx: CmdContext): Promise<string> {
  const teacherRows = rows(await db.execute(sql`
    SELECT name, phone, school, department, specialty, status
    FROM teachers
    WHERE tenant_id = ${ctx.tenantId} AND deleted_at IS NULL
    ORDER BY name
  `))

  if (!teacherRows.length) return '📭 目前無教練紀錄'

  let msg = `👩‍🏫 *教練列表*（${teacherRows.length}人）\n\n`
  for (const _r of teacherRows) {
    const r = _r as { name: string; phone: string | null; school: string | null; department: string | null; specialty: string }
    const spec = r.specialty === 'arts' ? '文' : r.specialty === 'science' ? '理' : '文理'
    msg += `• ${r.name}（${spec}）— ${r.school ?? ''} ${r.department ?? ''}\n`
    if (r.phone) msg += `  📱 ${r.phone}\n`
  }
  return msg
}

// ===== Helpers =====

function normalizeGrade(input: string): string {
  // '三年級'→'小3', '國二'→'國2', '高一'→'高1', '小5'→'小5'
  const numMap: Record<string, string> = { 一: '1', 二: '2', 三: '3', 四: '4', 五: '5', 六: '6' }

  if (/^(小|國|高)\d$/.test(input)) return input // already normalized

  const m1 = input.match(/^([一二三四五六])年級?$/)
  if (m1) return '小' + (numMap[m1[1]] ?? m1[1])

  const m2 = input.match(/^國([一二三])$/)
  if (m2) return '國' + (numMap[m2[1]] ?? m2[1])

  const m3 = input.match(/^高([一二三])$/)
  if (m3) return '高' + (numMap[m3[1]] ?? m3[1])

  const m4 = input.match(/^(\d{1,2})$/)
  if (m4) {
    const n = parseInt(m4[1])
    if (n <= 6) return '小' + n
    if (n <= 9) return '國' + (n - 6)
    return '高' + (n - 9)
  }

  return input
}

function estimateFee(grade: string, course: string): number {
  const level = grade.startsWith('小') ? 'elementary' : grade.startsWith('國') ? 'junior' : 'senior'
  const baseFees: Record<string, number> = { elementary: 3500, junior: 4500, senior: 5500 }
  return baseFees[level] ?? 4500
}
