'use client'

import { BackButton } from '@/components/ui/BackButton'

import { useEffect, useState } from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, Filler } from 'chart.js'
import { Pie, Line } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, Filler)

interface ReportData {
  totalStudents: number
  activeStudents: number
  attendanceRate: number
  avgScore: number
  totalRevenue: number | null
  churnRiskCount: number
}

interface ChurnStudent {
  id: string
  name: string
  risk_score: number
  risk_factors: string[]
}

interface AttendanceRecord {
  present: boolean
  date?: string
}

interface GradeRecord {
  score: number | string
  subject?: string
  date?: string
}

interface StudentRecord {
  status: string
  created_at?: string
}

interface TrendMonth {
  month: string
  activeStudents: number
  attendanceRate: number
  avgScore: number
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [churnStudents, setChurnStudents] = useState<ChurnStudent[]>([])
  const [rawGrades, setRawGrades] = useState<GradeRecord[]>([])
  const [trendMonths, setTrendMonths] = useState<TrendMonth[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const API_BASE = ''
  const branchId = typeof window !== 'undefined' ? localStorage.getItem('branchId') || '' : ''

  const loadReport = async () => {
    try {
      setLoading(true)
      setError(null)

      // 取得學生統計
      const studentsRes = await fetch(`${API_BASE}/api/admin/students?limit=100`, {
        credentials: 'include',
      })
      const studentsJson = studentsRes.ok ? await studentsRes.json() : { data: { students: [], pagination: { total: 0 } } }
      const studentsData = studentsJson.data ?? studentsJson

      // 取得出席統計
      const attRes = await fetch(`${API_BASE}/api/admin/attendance?limit=500`, {
        credentials: 'include',
      })
      const attJson = attRes.ok ? await attRes.json() : { data: { attendance: [] } }
      const attData = attJson.data ?? attJson

      // 取得成績統計
      const gradesRes = await fetch(`${API_BASE}/api/admin/grades?limit=200`, {
        credentials: 'include',
      })
      const gradesJson = gradesRes.ok ? await gradesRes.json() : { data: { grades: [] } }
      const gradesData = gradesJson.data ?? gradesJson

      // 取得流失風險學生
      const churnRes = await fetch(`${API_BASE}/api/admin/churn/${branchId}?days=30`, {
        credentials: 'include',
      })
      const churnJson = churnRes.ok ? await churnRes.json() : { data: { students: [] } }
      const churnData = churnJson.data ?? churnJson

      // 計算統計
      const attendance = attData.attendance || []
      const presentCount = attendance.filter((a: AttendanceRecord) => a.present).length
      const attendanceRate = attendance.length ? Math.round((presentCount / attendance.length) * 100) : 0
      
      const grades = gradesData.grades || []
      const avgScore = grades.length 
        ? Math.round(grades.reduce((sum: number, g: GradeRecord) => sum + Number(g.score), 0) / grades.length)
        : 0
      
      setData({
        totalStudents: studentsData.pagination?.total || studentsData.students?.length || 0,
        activeStudents: studentsData.students?.filter((s: StudentRecord) => s.status === 'active').length || 0,
        attendanceRate,
        avgScore,
        totalRevenue: null, // 帳務 API 尚未串接
        churnRiskCount: churnData.students?.length || 0
      })
      
      setRawGrades(grades)
      setChurnStudents(churnData.students?.slice(0, 5) || [])

      // 取得歷史趨勢資料
      const trendRes = await fetch(`${API_BASE}/api/admin/reports/trend?months=6`, {
        credentials: 'include',
      })
      if (trendRes.ok) {
        const trendJson = await trendRes.json()
        setTrendMonths(trendJson.data?.months ?? [])
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReport() }, [period])

  // 趨勢資料：使用後端歷史月份資料，fallback 至目前月份
  const currentMonth = period ? new Date(period + '-01') : new Date()
  const fallbackLabels = [0, 1, 2, 3, 4, 5].map(offset => {
    const d = new Date(currentMonth)
    d.setMonth(d.getMonth() - (5 - offset))
    return `${d.getMonth() + 1}月`
  })
  const hasTrend = trendMonths.length > 0
  const trendLabels = hasTrend
    ? trendMonths.map(m => `${parseInt(m.month.slice(5))}月`)
    : fallbackLabels
  const trendData = {
    labels: trendLabels,
    datasets: [
      {
        label: '在讀學生',
        data: hasTrend
          ? trendMonths.map(m => m.activeStudents)
          : fallbackLabels.map((_, i) => i === 5 ? (data?.activeStudents ?? 0) : null),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: false,
        tension: 0.4,
        spanGaps: true,
      },
      {
        label: '出席率 %',
        data: hasTrend
          ? trendMonths.map(m => m.attendanceRate)
          : fallbackLabels.map((_, i) => i === 5 ? (data?.attendanceRate ?? 0) : null),
        borderColor: '#7B9E89',
        backgroundColor: 'rgba(123, 158, 137, 0.1)',
        fill: false,
        tension: 0.4,
        spanGaps: true,
      }
    ]
  }

  // 科目分布：從成績資料中動態計算
  const subjectCounts: Record<string, number> = {}
  for (const g of rawGrades) {
    const subj = g.subject || '其他'
    subjectCounts[subj] = (subjectCounts[subj] || 0) + 1
  }
  const subjectLabels = Object.keys(subjectCounts).length > 0
    ? Object.keys(subjectCounts)
    : ['暫無數據']
  const subjectValues = Object.keys(subjectCounts).length > 0
    ? Object.values(subjectCounts)
    : [1]
  const pieColors = ['#6366f1', '#7B9E89', '#C4956A', '#B5706E', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981']
  const subjectData = {
    labels: subjectLabels,
    datasets: [{
      data: subjectValues,
      backgroundColor: pieColors.slice(0, subjectLabels.length),
      borderWidth: 0,
    }]
  }

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-surface-hover animate-pulse rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-surface-hover animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 返回按鈕 */}
      <BackButton />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">報表中心</h1>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 rounded-xl border border-border bg-white"
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex justify-between items-center">
          <span>{error}</span>
          <button onClick={loadReport} className="text-sm underline">重試</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-4xl">👥</span>
            <span className="text-xs text-[#7B9E89] bg-[#7B9E89]/10 px-2 py-1 rounded-full">
              {data.activeStudents}/{data.totalStudents}
            </span>
          </div>
          <div className="text-3xl font-bold text-text">{data.activeStudents}</div>
          <div className="text-sm text-text-muted">在讀學生</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-4xl">✅</span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              data.attendanceRate >= 90 ? 'text-[#7B9E89] bg-[#7B9E89]/10' : 'text-[#C4956A] bg-[#C4956A]/10'
            }`}>
              {data.attendanceRate >= 90 ? '良好' : '需關注'}
            </span>
          </div>
          <div className="text-3xl font-bold text-[#7B9E89]">{data.attendanceRate}%</div>
          <div className="text-sm text-text-muted">出席率</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-4xl">📊</span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              data.avgScore >= 80 ? 'text-[#7B9E89] bg-[#7B9E89]/10' : 'text-[#C4956A] bg-[#C4956A]/10'
            }`}>
              {data.avgScore >= 80 ? '優秀' : '普通'}
            </span>
          </div>
          <div className="text-3xl font-bold text-text">{data.avgScore}</div>
          <div className="text-sm text-text-muted">平均成績</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-4xl">💰</span>
            <span className="text-xs text-text-muted bg-surface px-2 py-1 rounded-full">暫無數據</span>
          </div>
          <div className="text-3xl font-bold text-text-muted">
            {data.totalRevenue !== null ? `$${(data.totalRevenue / 1000).toFixed(0)}K` : '—'}
          </div>
          <div className="text-sm text-text-muted">本月營收</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <h3 className="text-lg font-semibold text-text mb-4">📈 月度趨勢</h3>
          {!hasTrend && <p className="text-xs text-text-muted mb-2">歷史趨勢載入中...</p>}
          <div className="h-64">
            <Line
              data={trendData}
              options={{
                maintainAspectRatio: false,
                scales: {
                  y: { beginAtZero: true, min: 0, max: 100 }
                },
                plugins: {
                  legend: { position: 'top' }
                }
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <h3 className="text-lg font-semibold text-text mb-4">🎯 科目分布</h3>
          <div className="h-64 flex items-center justify-center">
            <Pie 
              data={subjectData} 
              options={{ 
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Churn Risk */}
      <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text">⚠️ 流失風險學生</h3>
          <span className="text-2xl font-bold text-[#B5706E]">{data.churnRiskCount} 位</span>
        </div>
        
        {churnStudents.length > 0 ? (
          <div className="space-y-3">
            {churnStudents.map((student) => (
              <div key={student.id} className="flex items-center justify-between p-3 bg-surface rounded-xl">
                <div>
                  <div className="font-medium text-text">{student.name}</div>
                  <div className="text-sm text-text-muted">
                    {student.risk_factors?.join('、') || '出席率下降'}
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  student.risk_score >= 70 ? 'bg-[#B5706E]/10 text-[#B5706E]' 
                    : student.risk_score >= 50 ? 'bg-[#C4956A]/10 text-[#C4956A]'
                    : 'bg-[#7B9E89]/10 text-[#7B9E89]'
                }`}>
                  風險 {student.risk_score}%
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-text-muted">
            🎉 目前沒有高風險學生
          </div>
        )}
      </div>
    </div>
  )
}
