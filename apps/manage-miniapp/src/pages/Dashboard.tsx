import { Bar, Doughnut } from 'react-chartjs-2'
import '../utils/chart-setup'
import { TENANT_ID } from '../App'
import { useApi } from '../hooks/useApi'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { PullToRefresh } from '../components/PullToRefresh'
import { toast } from '../components/Toast'
import { DEMO_STATS } from '../data/demo'
import type { DashboardStats } from '../types'
import { getUserRole } from '../utils/auth'

// Accept both flat API format and nested format
interface StatsResponse {
  // Flat format (actual API)
  totalStudents?: number
  attendanceRate?: number
  avgGrade?: number
  monthlyRevenue?: number
  weeklyAttendance?: { day: string; present: number; absent: number; late: number }[]
  revenueByMonth?: { month: string; revenue: number }[]
  // Nested format (legacy)
  summary?: {
    totalStudents: number
    activeStudents: number
    avgAttendanceRate: number
    avgGrade: number
    totalRevenue: number
  }
  churn?: {
    highRisk: number
  }
  // Student list format (teacher/parent endpoints)
  students?: { id: string; name: string }[]
  student?: { id: string; name: string }
  pagination?: { total: number }
}

interface DashboardProps {
  onNavigate?: (tab: 'students' | 'schedule' | 'reports' | 'alerts') => void
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const userRole = getUserRole()
  
  // Mini App 只有管理角色能進，直接打 admin API
  const getStatsEndpoint = () => {
    switch (userRole) {
      case 'teacher':
        return `/admin/students?limit=5`
      case 'superadmin':
      case 'admin':
      case 'staff':
      default:
        return `/admin/tenants/${TENANT_ID}/stats`
    }
  }
  
  const { data, loading, error, refetch } = useApi<StatsResponse>(
    getStatsEndpoint()
  )

  const handleRefresh = async () => {
    try {
      await refetch()
      toast.success('資料已更新')
    } catch (err) {
      toast.error('更新失敗，請稍後再試')
    }
  }

  // Transform API data to Stats format, fallback to demo data
  // Handle different response shapes: tenant stats (admin) vs students list (parent/teacher)
  const hasData = data && (data.totalStudents != null || data.summary != null || data.students != null || data.student != null)

  const studentCount = data?.students?.length ?? data?.pagination?.total ?? data?.totalStudents ?? data?.summary?.totalStudents ?? 0
  
  const stats: DashboardStats = hasData ? {
    totalStudents: studentCount || 8,
    activeStudents: data?.summary?.activeStudents ?? (studentCount || 8),
    avgAttendance: data?.attendanceRate != null 
      ? Math.round(data.attendanceRate) 
      : data?.summary?.avgAttendanceRate != null 
        ? Math.round(data.summary.avgAttendanceRate * 100) 
        : 87,
    avgGrade: data?.avgGrade ?? data?.summary?.avgGrade ?? 78.5,
    monthlyRevenue: data?.monthlyRevenue ?? data?.summary?.totalRevenue ?? 49700,
    highRisk: data?.churn?.highRisk ?? 0,
  } : DEMO_STATS

  const isDemo = !hasData

  // Use real weekly attendance data if available
  const weeklyAtt = data?.weeklyAttendance
  const totalPresent = weeklyAtt?.reduce((s, d) => s + d.present, 0) ?? stats.avgAttendance
  const totalLate = weeklyAtt?.reduce((s, d) => s + d.late, 0) ?? 5
  const totalAbsent = weeklyAtt?.reduce((s, d) => s + d.absent, 0) ?? (100 - stats.avgAttendance - 8)

  const attendanceData = {
    labels: ['出席', '遲到', '缺席'],
    datasets: [{ 
      data: [totalPresent, totalLate, totalAbsent], 
      backgroundColor: ['#8fa89a', '#c4b5a0', '#c9a9a6'], 
      borderWidth: 0 
    }]
  }

  // Use real revenue data if available
  const revByMonth = data?.revenueByMonth
  const revenueData = {
    labels: revByMonth?.map(r => r.month) ?? ['國中數學', '國中英文', '高中物理', '高中數學', '小學數學'],
    datasets: [{ 
      label: '月營收', 
      data: revByMonth?.map(r => r.revenue) ?? [18000, 12600, 10000, 5500, 3500], 
      backgroundColor: ['#8fa89a', '#c9a9a6', '#94a7b8', '#c4b5a0', '#b8a5c4'], 
      borderRadius: 8 
    }]
  }

  // Error state with retry button
  if (error && !loading) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="text-6xl mb-4">😕</div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--rose)' }}>
            載入資料失敗
          </h3>
          <p className="text-sm text-center mb-6" style={{ color: 'var(--stone)' }}>
            {error.message || '無法連接到伺服器，請檢查網路連線'}
          </p>
          <button
            onClick={() => {
              refetch()
              toast.info('正在重新載入...')
            }}
            className="px-6 py-3 rounded-xl font-medium text-white shadow-sm active:scale-95 transition-transform"
            style={{ background: 'var(--sage)' }}
          >
            🔄 重試
          </button>
        </div>
      </PullToRefresh>
    )
  }

  // Loading state
  if (loading) {
    return <LoadingSkeleton type="card" count={4} />
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4">
        {isDemo && (
          <div className="rounded-xl px-3 py-2 text-xs text-center" style={{ background: '#94a7b822', color: 'var(--blue)' }}>
            📋 展示模式 — 顯示範例資料
          </div>
        )}
        
        {!isDemo && userRole === 'teacher' && (
          <div className="rounded-xl px-3 py-2 text-xs text-center" style={{ background: '#8fa89a22', color: 'var(--sage)' }}>
            📚 顯示你的班級統計
          </div>
        )}
        
        {!isDemo && (userRole === 'parent' || userRole === 'student') && (
          <div className="rounded-xl px-3 py-2 text-xs text-center" style={{ background: '#c4b5a033', color: 'var(--sand)' }}>
            📊 顯示個人資料摘要
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <StatCard icon="👥" label="在籍學生" value={`${stats.activeStudents}人`} color="var(--sage)" onClick={() => onNavigate?.('students')} />
          <StatCard icon="📊" label="出席率" value={`${stats.avgAttendance}%`} color={stats.avgAttendance >= 80 ? 'var(--sage)' : 'var(--rose)'} onClick={() => onNavigate?.('reports')} />
          <StatCard icon="📝" label="平均成績" value={`${stats.avgGrade}`} color="var(--blue)" onClick={() => onNavigate?.('reports')} />
          <StatCard icon="💰" label="月營收" value={`$${stats.monthlyRevenue.toLocaleString()}`} color="var(--sand)" onClick={() => onNavigate?.('reports')} />
        </div>

        {stats.highRisk > 0 && (
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: '#c9a9a622', border: '1px solid var(--rose)' }}>
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold" style={{ color: 'var(--rose)' }}>{stats.highRisk} 位學生有流失風險</p>
              <p className="text-sm" style={{ color: 'var(--stone)' }}>建議盡快聯繫家長</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold mb-3" style={{ color: '#4a5568' }}>📊 出席統計</h3>
          <div className="h-48">
            <Doughnut 
              data={attendanceData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { position: 'bottom' } } 
              }} 
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold mb-3" style={{ color: '#4a5568' }}>💰 課程營收</h3>
          <div className="h-48">
            <Bar 
              data={revenueData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } }, 
                scales: { 
                  y: { 
                    ticks: { 
                      callback: (v) => '$' + (Number(v) / 1000) + 'k' 
                    } 
                  } 
                } 
              }} 
            />
          </div>
        </div>
      </div>
    </PullToRefresh>
  )
}

function StatCard({ icon, label, value, color, onClick }: { icon: string; label: string; value: string; color: string; onClick?: () => void }) {
  return (
    <div 
      className="bg-white rounded-2xl p-4 shadow-sm active:scale-95 transition-transform cursor-pointer"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm" style={{ color: 'var(--stone)' }}>{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  )
}
