/**
 * Chart Generation — PNG charts for Telegram
 * Uses chartjs-node-canvas (no browser needed)
 */
import { ChartJSNodeCanvas } from 'chartjs-node-canvas'
import { db } from '../db/index'
import { sql } from 'drizzle-orm'

const chartCanvas = new ChartJSNodeCanvas({ width: 800, height: 400, backgroundColour: 'white' })

/**
 * Generate attendance trend chart (bar chart per student)
 */
export async function generateAttendanceChart(tenantId: string, branchId: string, days = 14): Promise<Buffer> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const rows = await db.execute(sql`
    SELECT s.name,
      COUNT(*) FILTER (WHERE a.status IN ('present','late'))::int as attended,
      COUNT(*)::int as total
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    WHERE a.tenant_id = ${tenantId}
      AND s.branch_id = ${branchId}
      AND a.date >= ${cutoffStr}::date
    GROUP BY s.name ORDER BY s.name
  `) as unknown as { name: string; attended: number; total: number }[]

  const labels = rows.map(r => r.name)
  const rates = rows.map(r => r.total > 0 ? Math.round(r.attended / r.total * 100) : 0)
  const colors = rates.map(r => r >= 80 ? '#4CAF50' : r >= 60 ? '#FFC107' : '#F44336')

  return chartCanvas.renderToBuffer({
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '出席率 (%)',
        data: rates,
        backgroundColor: colors,
        borderRadius: 6,
      }]
    },
    options: {
      plugins: {
        title: { display: true, text: `📊 近${days}天出席率`, font: { size: 20 } },
        legend: { display: false },
      },
      scales: {
        y: { min: 0, max: 100, ticks: { callback: (v) => v + '%' } },
      },
    },
  })
}

/**
 * Generate grade trend chart (line chart for a student or all)
 */
export async function generateGradeTrendChart(tenantId: string, branchId: string): Promise<Buffer> {
  const rows = await db.execute(sql`
    SELECT s.name, g.exam_name, g.score, g.date::text
    FROM grades g
    JOIN students s ON g.student_id = s.id
    WHERE g.tenant_id = ${tenantId} AND s.branch_id = ${branchId}
    ORDER BY g.date
  `) as unknown as { name: string; exam_name: string; score: number; date: string }[]

  // Group by student
  const studentData = new Map<string, { scores: number[]; labels: string[] }>()
  for (const r of rows) {
    if (!studentData.has(r.name)) studentData.set(r.name, { scores: [], labels: [] })
    const d = studentData.get(r.name)!
    d.scores.push(Number(r.score))
    d.labels.push(r.exam_name)
  }

  const colorPalette = ['#E57373', '#64B5F6', '#81C784', '#FFB74D', '#BA68C8', '#4DB6AC', '#FF8A65', '#A1887F']
  const datasets = Array.from(studentData.entries()).map(([name, data], i) => ({
    label: name,
    data: data.scores,
    borderColor: colorPalette[i % colorPalette.length],
    backgroundColor: colorPalette[i % colorPalette.length] + '33',
    tension: 0.3,
    fill: false,
  }))

  // Use longest label set
  const allLabels = Array.from(studentData.values()).reduce((a, b) => a.labels.length > b.labels.length ? a : b).labels

  return chartCanvas.renderToBuffer({
    type: 'line',
    data: { labels: allLabels, datasets },
    options: {
      plugins: {
        title: { display: true, text: '📈 成績趨勢', font: { size: 20 } },
      },
      scales: {
        y: { min: 0, max: 100 },
      },
    },
  })
}

/**
 * Generate revenue chart (pie chart by course)
 */
export async function generateRevenueChart(tenantId: string, branchId: string): Promise<Buffer> {
  const rows = await db.execute(sql`
    SELECT e.course_name, SUM(e.fee_monthly)::int as revenue
    FROM enrollments e
    JOIN students s ON e.student_id = s.id
    WHERE e.tenant_id = ${tenantId} AND s.branch_id = ${branchId} AND e.status = 'active'
    GROUP BY e.course_name ORDER BY revenue DESC
  `) as unknown as { course_name: string; revenue: number }[]

  const colorPalette = ['#E57373', '#64B5F6', '#81C784', '#FFB74D', '#BA68C8', '#4DB6AC']

  return chartCanvas.renderToBuffer({
    type: 'doughnut',
    data: {
      labels: rows.map(r => `${r.course_name} $${r.revenue.toLocaleString()}`),
      datasets: [{
        data: rows.map(r => r.revenue),
        backgroundColor: colorPalette.slice(0, rows.length),
      }]
    },
    options: {
      plugins: {
        title: { display: true, text: '💰 月營收分佈', font: { size: 20 } },
      },
    },
  })
}
