/**
 * Markdown Report Generators
 * Convert structured data → clean Markdown for agents & export
 */

import type { BranchReport } from '../ai/reports'
import type { ChurnRisk } from '../ai/churn'

export function branchReportToMd(report: BranchReport): string {
  const s = report.summary
  let md = `# 📊 ${report.period} 分校月報\n\n`
  md += `> 生成時間：${report.generatedAt}\n\n`

  md += `## 總覽\n\n`
  md += `| 指標 | 數值 |\n|------|------|\n`
  md += `| 在籍學生 | ${s.activeStudents}/${s.totalStudents} |\n`
  md += `| 新生 | ${s.newStudents} |\n`
  md += `| 退班 | ${s.droppedStudents} |\n`
  md += `| 出席率 | ${Math.round(s.avgAttendanceRate * 100)}% |\n`
  md += `| 平均成績 | ${s.avgGrade} |\n`
  md += `| 月營收 | $${s.totalRevenue.toLocaleString()} |\n\n`

  if (report.courseStats.length > 0) {
    md += `## 課程統計\n\n`
    md += `| 課程 | 學生數 | 月營收 |\n|------|--------|--------|\n`
    for (const c of report.courseStats) {
      md += `| ${c.courseName} | ${c.studentCount} | $${c.monthlyRevenue.toLocaleString()} |\n`
    }
    md += '\n'
  }

  if (report.churnAlerts.length > 0) {
    md += `## ⚠️ 流失預警\n\n`
    for (const a of report.churnAlerts) {
      const emoji = a.riskLevel === 'high' ? '🔴' : '🟡'
      md += `### ${emoji} ${a.studentName}（風險 ${a.riskScore}）\n\n`
      for (const f of a.factors) md += `- ${f}\n`
      md += `\n💡 ${a.recommendation}\n\n`
    }
  }

  if (report.students.length > 0) {
    md += `## 學生明細\n\n`
    md += `| 姓名 | 年級 | 出席率 | 平均分 | 風險 |\n|------|------|--------|--------|------|\n`
    for (const st of report.students) {
      const risk = st.riskLevel === 'high' ? '🔴' : st.riskLevel === 'medium' ? '🟡' : '🟢'
      md += `| ${st.name} | ${st.grade} | ${Math.round(st.attendanceRate * 100)}% | ${st.avgScore ?? '—'} | ${risk} |\n`
    }
  }

  return md
}

export function churnRisksToMd(risks: ChurnRisk[]): string {
  const high = risks.filter(r => r.riskLevel === 'high')
  const med = risks.filter(r => r.riskLevel === 'medium')

  let md = `# ⚠️ 流失預警報告\n\n`
  md += `- 🔴 高風險：${high.length}\n`
  md += `- 🟡 中風險：${med.length}\n`
  md += `- 🟢 低風險：${risks.length - high.length - med.length}\n\n`

  for (const r of risks.filter(r => r.riskLevel !== 'low')) {
    const emoji = r.riskLevel === 'high' ? '🔴' : '🟡'
    md += `## ${emoji} ${r.studentName}（${r.grade}）— ${r.riskScore}分\n\n`
    md += `**課程**：${r.courses.join('、')}\n`
    md += `**家長**：${r.parentName ?? '—'} | **電話**：${r.phone ?? '—'}\n\n`
    md += `**風險因子**：\n`
    for (const f of r.factors) md += `- ${f.detail}\n`
    md += `\n**建議**：${r.recommendation}\n\n---\n\n`
  }

  return md
}

export function studentsToMd(students: any[]): string {
  let md = `# 👥 學生名單\n\n`
  md += `| 姓名 | 年級 | 狀態 | 課程 |\n|------|------|------|------|\n`
  for (const s of students) {
    const courses = s.courses?.map((c: any) => c.course).join('、') ?? '—'
    md += `| ${s.name} | ${s.grade} | ${s.status} | ${courses} |\n`
  }
  return md
}

export function invoicesToMd(invoices: any[], period: string): string {
  let md = `# 💰 ${period} 學費帳單\n\n`
  md += `| 學生 | 金額 | 狀態 |\n|------|------|------|\n`
  let total = 0
  for (const inv of invoices) {
    const status = inv.status === 'paid' ? '✅ 已繳' : inv.status === 'overdue' ? '🔴 逾期' : '⏳ 待繳'
    md += `| ${inv.student_name} | $${Number(inv.total).toLocaleString()} | ${status} |\n`
    total += Number(inv.total)
  }
  md += `\n**總額**：$${total.toLocaleString()}\n`
  return md
}

export function scheduleToMd(slots: any[]): string {
  const dayNames = ['', '一', '二', '三', '四', '五', '六', '日']
  let md = `# 📅 週課表\n\n`

  const byDay = new Map<number, any[]>()
  for (const s of slots) {
    if (!byDay.has(s.day_of_week)) byDay.set(s.day_of_week, [])
    byDay.get(s.day_of_week)!.push(s)
  }

  for (const [day, daySlots] of [...byDay].sort((a, b) => a[0] - b[0])) {
    md += `## 週${dayNames[day]}\n\n`
    md += `| 時間 | 學生 | 科目 | 教練 |\n|------|------|------|------|\n`
    for (const s of daySlots.sort((a: any, b: any) => a.start_time.localeCompare(b.start_time))) {
      md += `| ${s.start_time?.slice(0, 5)}-${s.end_time?.slice(0, 5)} | ${s.student_name} | ${s.subject} | ${s.teacher_name ?? '—'} |\n`
    }
    md += '\n'
  }
  return md
}
