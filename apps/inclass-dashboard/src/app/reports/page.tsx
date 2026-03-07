'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'

interface DailyStats {
  total: number
  arrived: number
  late: number
  absent: number
}

interface StudentStats {
  studentId: string
  studentName: string
  arrived: number
  late: number
  absent: number
  total: number
  rate: number
}

interface ReportData {
  month: string
  dailyStats: Record<string, DailyStats>
  studentStats: StudentStats[]
  summary: {
    totalDays: number
    totalAttendances: number
    averageRate: number
    totalStudents: number
  }
}

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null ? value as UnknownRecord : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

function normalizeAttendanceReport(value: unknown): ReportData {
  const record = asRecord(value)
  const topLevelDailyStats = asRecord(record.dailyStats)
  const topLevelStudentStats = asArray(record.studentStats).map((entry) => asRecord(entry))
  const topLevelSummary = asRecord(record.summary)

  if (Object.keys(topLevelDailyStats).length > 0 || topLevelStudentStats.length > 0) {
    const dailyStats = Object.entries(topLevelDailyStats).reduce<Record<string, DailyStats>>((acc, [date, stats]) => {
      const statRecord = asRecord(stats)
      acc[date] = {
        total: asNumber(statRecord.total),
        arrived: asNumber(statRecord.arrived),
        late: asNumber(statRecord.late),
        absent: asNumber(statRecord.absent),
      }
      return acc
    }, {})

    const studentStats = topLevelStudentStats.map((entry) => ({
      studentId: asString(entry.studentId),
      studentName: asString(entry.studentName, '未命名學生'),
      arrived: asNumber(entry.arrived),
      late: asNumber(entry.late),
      absent: asNumber(entry.absent),
      total: asNumber(entry.total),
      rate: asNumber(entry.rate),
    }))

    return {
      month: asString(record.month),
      dailyStats,
      studentStats,
      summary: {
        totalDays: asNumber(topLevelSummary.totalDays, Object.keys(dailyStats).length),
        totalAttendances: asNumber(topLevelSummary.totalAttendances, studentStats.reduce((sum, student) => sum + student.total, 0)),
        averageRate: asNumber(topLevelSummary.averageRate, studentStats.length > 0 ? Math.round(studentStats.reduce((sum, student) => sum + student.rate, 0) / studentStats.length) : 0),
        totalStudents: asNumber(topLevelSummary.totalStudents, studentStats.length),
      },
    }
  }

  const report = asRecord(record.report)
  const records = asArray(report.records).map((entry) => asRecord(entry))
  const dailyStats = records.reduce<Record<string, DailyStats>>((acc, entry) => {
    const rawDate = asString(entry.date)
    const date = rawDate ? new Date(rawDate).toISOString().split('T')[0] : 'unknown'
    const rawStatus = asString(entry.status)
    const status = rawStatus === 'present' ? 'arrived' : rawStatus
    const current = acc[date] ?? { total: 0, arrived: 0, late: 0, absent: 0 }
    current.total += 1
    if (status === 'arrived') current.arrived += 1
    if (status === 'late') current.late += 1
    if (status === 'absent') current.absent += 1
    acc[date] = current
    return acc
  }, {})

  const studentMap = new Map<string, StudentStats>()
  for (const entry of records) {
    const studentId = asString(entry.studentId)
    const studentName = asString(entry.studentName, '未命名學生')
    const rawStatus = asString(entry.status)
    const status = rawStatus === 'present' ? 'arrived' : rawStatus
    const current = studentMap.get(studentId) ?? {
      studentId,
      studentName,
      arrived: 0,
      late: 0,
      absent: 0,
      total: 0,
      rate: 0,
    }
    current.total += 1
    if (status === 'arrived') current.arrived += 1
    if (status === 'late') current.late += 1
    if (status === 'absent') current.absent += 1
    studentMap.set(studentId, current)
  }

  const studentStats = Array.from(studentMap.values())
    .map((student) => ({
      ...student,
      rate: student.total > 0 ? Math.round(((student.arrived + student.late) / student.total) * 100) : 0,
    }))
    .sort((a, b) => b.rate - a.rate)

  return {
    month: asString(report.period),
    dailyStats,
    studentStats,
    summary: {
      totalDays: Object.keys(dailyStats).length,
      totalAttendances: asNumber(report.total, records.length),
      averageRate: studentStats.length > 0
        ? Math.round(studentStats.reduce((sum, student) => sum + student.rate, 0) / studentStats.length)
        : 0,
      totalStudents: studentStats.length,
    },
  }
}

export default function AttendanceReportPage() {
  const router = useRouter()
  const { school } = useAuth()
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    fetchReport()
  }, [selectedMonth])

  const fetchReport = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.getAttendanceReport(selectedMonth)
      setReport(normalizeAttendanceReport(data))
    } catch (e) {
      console.error('Failed to fetch report:', e)
      setReport(null)
      setError('讀取報表失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!report) return
    
    // CSV field escaping to prevent injection and handle special characters
    const escapeCSV = (field: string | number): string => {
      const str = String(field)
      // Prevent formula injection (=, +, -, @, \t, \r)
      const sanitized = str.replace(/^([=+\-@\t\r])/, "'$1")
      // Wrap in quotes if contains comma, quote, or newline
      if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n')) {
        return `"${sanitized.replace(/"/g, '""')}"`
      }
      return sanitized
    }
    
    // CSV 標題
    let csv = '學生姓名,出勤次數,遲到次數,缺席次數,總次數,出勤率\n'
    
    // 學生資料
    report.studentStats.forEach(s => {
      csv += `${escapeCSV(s.studentName)},${s.arrived},${s.late},${s.absent},${s.total},${s.rate}%\n`
    })
    
    // 下載
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `出勤報表_${report.month}.csv`
    link.click()
    // Cleanup to prevent memory leak
    URL.revokeObjectURL(url)
  }

  const isEmptyReport =
    !!report &&
    report.studentStats.length === 0 &&
    Object.keys(report.dailyStats).length === 0 &&
    report.summary.totalAttendances === 0

  if (loading) {
    return (
      <main style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <h1 style={{ fontSize: '22px', color: 'var(--primary)', marginBottom: '8px' }}>📊 出勤報表</h1>
        <div style={{ marginBottom: '8px' }}>載入中...</div>
        <div style={{ fontSize: '13px' }}>正在整理本月出勤資料</div>
      </main>
    )
  }

  if (error) {
    return (
      <main style={{ padding: '20px', textAlign: 'center', color: 'var(--text-primary)' }}>
        <div style={{ marginBottom: '12px', color: 'var(--error)' }}>{error}</div>
        <button
          onClick={fetchReport}
          style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'white', border: 'none', fontSize: '13px', cursor: 'pointer' }}
        >
          重新載入
        </button>
      </main>
    )
  }

  if (!report || isEmptyReport) {
    return (
      <main style={{ padding: '20px', textAlign: 'center', color: 'var(--text-primary)' }}>
        <h1 style={{ fontSize: '22px', color: 'var(--primary)', marginBottom: '8px' }}>📊 出勤報表</h1>
        <div style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
          目前沒有可顯示的報表資料，完成點名後即可查看統計
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={fetchReport}
            style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'white', border: 'none', fontSize: '13px', cursor: 'pointer' }}
          >
            重新載入
          </button>
          <button
            onClick={() => router.push('/main')}
            style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: '13px', cursor: 'pointer' }}
          >
            前往主控台
          </button>
        </div>
      </main>
    )
  }

  const dailyList = Object.entries(report?.dailyStats || {}).sort((a, b) => b[0].localeCompare(a[0]))

  return (
    <main style={{ padding: '16px', background: 'var(--background)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', color: 'var(--primary)', margin: 0 }}>
            📊 出勤報表
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {school?.name}
          </p>
        </div>
        <button 
          onClick={() => router.push('/main')}
          style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'white', border: 'none', fontSize: '13px', cursor: 'pointer' }}
        >
          ← 返回首頁
        </button>
      </div>

      {/* 月份選擇 */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '16px', border: '1px solid var(--border)' }}>
        <label style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 'bold', marginRight: '12px' }}>
          ⚡ 選擇月份：
        </label>
        <input 
          type="month" 
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '14px' }}
        />
      </div>

      {/* 本月統計 */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: '18px', color: 'var(--primary)', marginBottom: '16px', fontWeight: 'bold' }}>
          📈 本月統計
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <MiniCard label="平均出勤率" value={`${report?.summary.averageRate || 0}%`} color="var(--accent)" />
          <MiniCard label="上課天數" value={report?.summary.totalDays || 0} color="var(--primary)" />
          <MiniCard label="總出勤次數" value={report?.summary.totalAttendances || 0} color="var(--success)" />
          <MiniCard label="學生總數" value={report?.summary.totalStudents || 0} color="var(--warning)" />
        </div>
      </div>

      {/* 每日明細 */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: '18px', color: 'var(--primary)', marginBottom: '16px', fontWeight: 'bold' }}>
          📅 每日明細
        </h2>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {dailyList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              本月尚無出勤記錄
            </div>
          ) : (
            dailyList.map(([date, stats]) => (
              <div key={date} style={{ padding: '12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {new Date(date).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit', weekday: 'short' })}
                </span>
                <div style={{ display: 'flex', gap: '12px', fontSize: '14px' }}>
                  <span style={{ color: 'var(--success)' }}>✅ {stats.arrived}人</span>
                  {stats.late > 0 && <span style={{ color: 'var(--warning)' }}>⏰ {stats.late}人</span>}
                  {stats.absent > 0 && <span style={{ color: 'var(--error)' }}>❌ {stats.absent}人</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 學生出勤排行 */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: '18px', color: 'var(--primary)', marginBottom: '16px', fontWeight: 'bold' }}>
          👥 學生出勤排行
        </h2>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {report?.studentStats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              尚無出勤資料
            </div>
          ) : (
            report?.studentStats.map((s, index) => (
              <div key={s.studentId} style={{ padding: '12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : s.rate < 80 ? '⚠️' : '👤'}
                  </span>
                  <div>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{s.studentName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      到課 {s.arrived} · 遲到 {s.late} · 缺席 {s.absent}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: s.rate >= 90 ? 'var(--success)' : s.rate >= 80 ? 'var(--warning)' : 'var(--error)' }}>
                    {s.rate}%
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {s.total} 次
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 匯出按鈕 */}
      <button 
        onClick={exportToCSV}
        disabled={!report || report.studentStats.length === 0}
        style={{ 
          width: '100%', 
          padding: '16px', 
          borderRadius: 'var(--radius-md)', 
          background: report && report.studentStats.length > 0 ? 'var(--accent)' : 'var(--text-secondary)', 
          color: 'white', 
          border: 'none', 
          fontSize: '16px', 
          fontWeight: 'bold', 
          cursor: report && report.studentStats.length > 0 ? 'pointer' : 'not-allowed',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        📥 匯出 Excel (CSV)
      </button>
    </main>
  )
}

function MiniCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: color, borderRadius: 'var(--radius-sm)', padding: '12px', textAlign: 'center', color: 'white' }}>
      <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{value}</div>
    </div>
  )
}
