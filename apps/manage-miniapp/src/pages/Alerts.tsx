import { useState } from 'react'
import { BRANCH_ID } from '../App'
import { useApi } from '../hooks/useApi'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { PullToRefresh } from '../components/PullToRefresh'
import { useToast } from '../components/Toast'
import { normalizeAlert } from '../utils/normalizers'
import { getUser, getUserRole } from '../utils/auth'

const LEVEL_STYLES: Record<string, { bg: string; color: string; icon: string }> = {
  critical: { bg: '#c9a9a633', color: 'var(--rose)', icon: '🔴' },
  warning: { bg: '#c4b5a033', color: '#c4b5a0', icon: '🟡' },
  info: { bg: '#94a7b822', color: 'var(--blue)', icon: '🔵' },
}

export default function Alerts() {
  const user = getUser()
  const userRole = getUserRole()
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all')
  const [readAlerts, setReadAlerts] = useState<Set<string>>(new Set())
  const { showToast } = useToast()
  
  // 依角色決定 API endpoint
  const getAlertsEndpoint = () => {
    const baseUrl = `/admin/churn/${BRANCH_ID}`;
    switch (userRole) {
      case 'admin':
      case 'demo':
        return baseUrl;
      case 'teacher':
        return `${baseUrl}?teacherId=${user?.id || ''}`;
      case 'parent':
        return `${baseUrl}?parentId=${user?.id || ''}`;
      case 'student':
        return `${baseUrl}?studentId=${user?.id || ''}`;
      default:
        return baseUrl;
    }
  };
  
  const { data, loading, error, refetch } = useApi<any>(
    getAlertsEndpoint(),
    { retry: true }
  )

  const handleRefresh = async () => {
    await refetch()
    showToast('success', '已更新通知')
  }

  // API returns { total, students: [...] } — convert students to alerts
  const rawAlerts = data?.alerts || data?.students || []
  const alerts = rawAlerts.map(normalizeAlert)
  const filtered = filter === 'all' ? alerts : alerts.filter((a: any) => a.level === filter)

  const toggleRead = (alertId: string) => {
    setReadAlerts(prev => {
      const next = new Set(prev)
      if (next.has(alertId)) {
        next.delete(alertId)
      } else {
        next.add(alertId)
      }
      return next
    })
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4">
        {/* 展示模式提示（僅在無資料時） */}
        {alerts.length === 0 && !loading && (
          <div className="rounded-xl px-3 py-2 text-xs text-center" style={{ background: '#94a7b822', color: 'var(--blue)' }}>
            📋 展示模式
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto">
          {([
            { key: 'all', label: `全部 (${alerts.length})` },
            { key: 'critical', label: `🔴 緊急 (${alerts.filter((a: any) => a.level === 'critical').length})` },
            { key: 'warning', label: `🟡 警告 (${alerts.filter((a: any) => a.level === 'warning').length})` },
            { key: 'info', label: `🔵 提醒 (${alerts.filter((a: any) => a.level === 'info').length})` },
          ] as const).map(f => (
            <button 
              key={f.key} 
              onClick={() => setFilter(f.key)}
              className="flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ 
                background: filter === f.key ? 'var(--sage)' : 'white', 
                color: filter === f.key ? 'white' : 'var(--stone)', 
                border: '1px solid var(--sage)' 
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Loading skeleton */}
        {loading && <LoadingSkeleton type="list" count={5} />}

        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-12" style={{ color: 'var(--rose)' }}>
            <p className="text-4xl mb-2">⚠️</p>
            <p className="font-medium">載入失敗</p>
            <p className="text-sm mt-1">{error.message}</p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 rounded-lg text-white"
              style={{ background: 'var(--sage)' }}
            >
              重試
            </button>
          </div>
        )}

        {/* Alert list */}
        {!loading && !error && (
          <div className="space-y-3">
            {filtered.map((alert: any) => {
              const style = LEVEL_STYLES[alert.level] || LEVEL_STYLES.info
              const isRead = readAlerts.has(alert.id)
              return (
                <div 
                  key={alert.id} 
                  className="bg-white rounded-xl p-4 shadow-sm cursor-pointer active:scale-[0.99] transition-all" 
                  style={{ 
                    borderLeft: `4px solid ${style.color}`,
                    opacity: isRead ? 0.6 : 1
                  }}
                  onClick={() => toggleRead(alert.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">{style.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold" style={{ color: '#4a5568' }}>{alert.title}</p>
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full" style={{ background: style.color }} />
                        )}
                      </div>
                      <p className="text-sm mt-1" style={{ color: 'var(--stone)' }}>{alert.detail}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs" style={{ color: 'rgba(155,149,144,0.6)' }}>{alert.time}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ 
                          background: isRead ? 'rgba(155,149,144,0.1)' : `${style.color}22`, 
                          color: isRead ? 'var(--stone)' : style.color 
                        }}>
                          {isRead ? '✓ 已讀' : '未讀'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12" style={{ color: 'var(--stone)' }}>
                <p className="text-4xl mb-2">✅</p>
                <p>沒有{filter === 'all' ? '' : '此類'}通知</p>
              </div>
            )}
          </div>
        )}
      </div>
    </PullToRefresh>
  )
}
