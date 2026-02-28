'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

interface DashboardStats {
  totalStudents: number
  newStudentsThisMonth: number
  attendanceRate: number
  totalRevenue: number
  stats: {
    totalStudents: number
    activeStudents: number
    totalClasses: number
    totalTeachers: number
  }
}

export default function DashboardPage() {
  const { school } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setError('')
    setLoading(true)
    try {
      const data = await api.getDashboardStats()
      setStats(data)
    } catch (e) {
      console.error('Failed to fetch stats:', e)
      setError('讀取儀表板資料失敗，請稍後再試')
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  const isEmptyDashboard =
    !!stats &&
    stats.totalStudents === 0 &&
    stats.newStudentsThisMonth === 0 &&
    stats.totalRevenue === 0 &&
    stats.stats.totalStudents === 0 &&
    stats.stats.activeStudents === 0 &&
    stats.stats.totalClasses === 0 &&
    stats.stats.totalTeachers === 0

  if (loading) {
    return (
      <main style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <h1 style={{ fontSize: '22px', color: 'var(--primary)', marginBottom: '8px' }}>📊 教室儀表板</h1>
        <div style={{ marginBottom: '8px' }}>載入中...</div>
        <div style={{ fontSize: '13px' }}>正在同步最新教室狀態</div>
      </main>
    )
  }

  if (error) {
    return (
      <main style={{ padding: '20px', textAlign: 'center', color: 'var(--text-primary)' }}>
        <div style={{ marginBottom: '12px', color: 'var(--error)' }}>{error}</div>
        <button
          onClick={fetchStats}
          style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'white', border: 'none', fontSize: '13px', cursor: 'pointer' }}
        >
          重新載入
        </button>
      </main>
    )
  }

  if (!stats || isEmptyDashboard) {
    return (
      <main style={{ padding: '20px', textAlign: 'center', color: 'var(--text-primary)' }}>
        <h1 style={{ fontSize: '22px', color: 'var(--primary)', marginBottom: '8px' }}>📊 教室儀表板</h1>
        <div style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
          目前沒有可顯示的儀表板資料，先建立班級或學生後再查看
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push('/main')}
            style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'white', border: 'none', fontSize: '13px', cursor: 'pointer' }}
          >
            前往主控台
          </button>
          <button
            onClick={fetchStats}
            style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: '13px', cursor: 'pointer' }}
          >
            重新載入
          </button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ padding: '16px', background: 'var(--background)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* 整合提示橫幅 */}
      <div style={{ background: 'linear-gradient(135deg, #FFF4E6 0%, #FFE8CC 100%)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '12px', border: '1px solid #FFDD99', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <span style={{ fontSize: '16px', marginTop: '2px' }}>💡</span>
          <div style={{ flex: 1, fontSize: '12px', color: '#8B6914', lineHeight: 1.5 }}>
            <strong>提示：</strong>完整營運報表（財務、招生、流失預警）請使用 <a href="https://cram94-manage-dashboard-1015149159553.asia-east1.run.app" target="_blank" rel="noopener" style={{ color: '#6B5014', textDecoration: 'underline', fontWeight: '500' }}>蜂神榜 Ai 管理系統</a>。<br/>
            這裡只顯示<strong>教室即時狀態</strong>。
          </div>
        </div>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', color: 'var(--primary)', margin: 0 }}>
            📊 教室儀表板
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

      {/* 4 大統計卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <StatCard 
          title="總學生數" 
          value={stats.totalStudents} 
          emoji="👥" 
          color="var(--primary)" 
        />
        <StatCard 
          title="本月新增" 
          value={stats.newStudentsThisMonth} 
          emoji="🆕" 
          color="var(--success)" 
        />
        <StatCard 
          title="今日出勤率" 
          value={`${stats.attendanceRate}%`} 
          emoji="📈" 
          color="var(--accent)" 
        />
        <StatCard 
          title="本月營收" 
          value={`NT$ ${stats.totalRevenue.toLocaleString()}`} 
          emoji="💰" 
          color="var(--warning)" 
        />
      </div>

      {/* 詳細統計 */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: '20px', color: 'var(--primary)', marginBottom: '20px', fontWeight: 'bold' }}>
          系統統計
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <DetailRow label="總學生數" value={stats.stats.totalStudents} />
          <DetailRow label="活躍學生" value={stats.stats.activeStudents} />
          <DetailRow label="班級數" value={stats.stats.totalClasses} />
          <DetailRow label="教師數" value={stats.stats.totalTeachers} />
        </div>
      </div>

      {/* 快捷功能 */}
      <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <QuickAction 
          emoji="📋" 
          label="學生管理" 
          onClick={() => router.push('/main')} 
        />
        <QuickAction 
          emoji="📊" 
          label="出勤報表" 
          onClick={() => router.push('/reports')} 
        />
        <QuickAction 
          emoji="📝" 
          label="成績管理" 
          onClick={() => router.push('/grades')} 
        />
      </div>
    </main>
  )
}

function StatCard({ title, value, emoji, color }: { title: string; value: string | number; emoji: string; color: string }) {
  return (
    <div style={{ background: color, borderRadius: 'var(--radius-md)', padding: '20px', textAlign: 'center', color: 'white', boxShadow: 'var(--shadow-md)' }}>
      <div style={{ fontSize: '36px', marginBottom: '12px' }}>{emoji}</div>
      <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px' }}>{title}</div>
      <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{value}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'var(--background)', borderRadius: 'var(--radius-sm)' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{label}</span>
      <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '18px' }}>{value}</span>
    </div>
  )
}

function QuickAction({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-sm)', transition: 'transform 0.2s' }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ fontSize: '32px' }}>{emoji}</div>
      <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 'bold' }}>{label}</div>
    </button>
  )
}
