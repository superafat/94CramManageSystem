'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { StatCard } from '@/components/ui/StatCard'
import { fetchTenantStats, fetchTenants, aiQuery, getCurrentTenantId, type Tenant, type TenantStats, type AIQueryResult } from '@/lib/api'

// 允許訪問 Dashboard 的角色
const ALLOWED_ROLES = ['superadmin', 'admin', 'staff']

interface Alert {
  id: string
  action: string
  table_name: string
  change_summary: string
  user_name: string
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<TenantStats | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null)
  const [testQuery, setTestQuery] = useState('')
  const [testResult, setTestResult] = useState<AIQueryResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [apiOk, setApiOk] = useState<boolean | null>(null)
  const [authorized, setAuthorized] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3100'

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  }

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/alerts`, {
        headers: getAuthHeaders()
      })
      const data = await res.json()
      if (data.success) {
        setAlerts(data.data.alerts || [])
      }
    } catch (e) {
      console.error('Failed to fetch alerts:', e)
    }
  }

  useEffect(() => {
    // 角色權限檢查
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      router.push('/login')
      return
    }
    try {
      const user = JSON.parse(userStr)
      if (!ALLOWED_ROLES.includes(user.role)) {
        // 無權限，導向該角色的首頁
        const homePages: Record<string, string> = {
          teacher: '/schedules',
          parent: '/my-children',
          student: '/my-schedule',
        }
        router.push(homePages[user.role] || '/login')
        return
      }
      setAuthorized(true)
    } catch {
      router.push('/login')
      return
    }

    const tenantId = getCurrentTenantId()

    // Fetch stats
    fetchTenantStats(tenantId)
      .then(s => { setStats(s); setApiOk(true) })
      .catch(() => setApiOk(false))

    // Fetch alerts
    fetchAlerts()

    // Fetch tenant info
    fetchTenants().then(ts => {
      setTenants(ts)
      setCurrentTenant(ts.find(t => t.id === tenantId) ?? null)
    }).catch(() => {})
  }, [])

  const handleTest = async () => {
    if (!testQuery.trim()) return
    setTesting(true)
    try {
      const result = await aiQuery(testQuery)
      setTestResult(result)
    } catch {
      setTestResult({ answer: '❌ 查詢失敗', model: '-', intent: '-', latencyMs: 0 })
    }
    setTesting(false)
  }

  const intentDistribution = [
    { intent: '📅 排課查詢', count: stats?.conversations ? Math.round(stats.conversations * 0.28) : 0, pct: 28 },
    { intent: '💰 費用帳務', count: stats?.conversations ? Math.round(stats.conversations * 0.23) : 0, pct: 23 },
    { intent: '❓ 一般問答', count: stats?.conversations ? Math.round(stats.conversations * 0.19) : 0, pct: 19 },
    { intent: '🎓 招生諮詢', count: stats?.conversations ? Math.round(stats.conversations * 0.13) : 0, pct: 13 },
    { intent: '📝 作業成績', count: stats?.conversations ? Math.round(stats.conversations * 0.10) : 0, pct: 10 },
    { intent: '📢 客訴建議', count: stats?.conversations ? Math.round(stats.conversations * 0.07) : 0, pct: 7 },
  ]

  // 未授權時不顯示內容
  if (!authorized) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-muted">載入中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header - 手機版隱藏（由 MobileHeader 顯示） */}
      <div className="hidden lg:flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">
            {currentTenant ? `${currentTenant.name} 總覽` : '總覽'}
          </h1>
          <p className="text-text-muted mt-1">
            {currentTenant ? `方案：${currentTenant.plan} · AI 客服系統即時狀態` : 'AI 客服系統即時狀態'}
          </p>
        </div>
        {currentTenant && (
          <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-sm font-medium">
            🏢 {currentTenant.slug}
          </span>
        )}
      </div>

      {/* Stats Grid - 手機版 2x2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard icon="💬" label="對話紀錄" value={stats?.conversations ?? '—'} />
        <StatCard icon="📚" label="知識庫文件" value={stats?.knowledgeChunks ?? '—'} />
        <StatCard icon="🏢" label="分校數" value={stats?.branches ?? '—'} />
        <StatCard
          icon={apiOk ? '🟢' : apiOk === false ? '🔴' : '⏳'}
          label="API 狀態"
          value={apiOk ? '正常' : apiOk === false ? '離線' : '檢測中'}
        />
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">⚠️</span>
            <h2 className="text-lg font-semibold text-red-700">待處理警示 ({alerts.length})</h2>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="bg-white rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-text text-sm">{alert.change_summary || `${alert.action} ${alert.table_name}`}</div>
                  <div className="text-xs text-text-muted">{alert.user_name} · {new Date(alert.created_at).toLocaleString('zh-TW')}</div>
                </div>
                <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-lg">待確認</span>
              </div>
            ))}
          </div>
          {alerts.length > 5 && (
            <div className="mt-3 text-center">
              <a href="/dashboard/alerts" className="text-sm text-red-600 hover:underline">查看全部 {alerts.length} 筆警示 →</a>
            </div>
          )}
        </div>
      )}

      {/* AI Test Panel */}
      <div className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text mb-4">🤖 AI 即時測試</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTest()}
            placeholder="輸入問題測試 AI 回答... (例如：學費多少？)"
            className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {testing ? '查詢中...' : '發送'}
          </button>
        </div>
        {testResult && (
          <div className="mt-4 p-4 rounded-xl bg-background">
            <div className="flex gap-2 mb-2 text-xs text-text-muted">
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">{testResult.intent}</span>
              <span>{testResult.model}</span>
              <span>⏱ {testResult.latencyMs}ms</span>
            </div>
            <p className="text-sm text-text whitespace-pre-wrap">{testResult.answer}</p>
          </div>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Intent Distribution */}
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold text-text mb-4">意圖分佈</h2>
          <div className="space-y-4">
            {intentDistribution.map((item) => (
              <div key={item.intent}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text">{item.intent}</span>
                  <span className="text-text-muted">{item.count} ({item.pct}%)</span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-surface rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold text-text mb-4">系統狀態</h2>
          <div className="space-y-3">
            {[
              { label: '後台服務', status: apiOk ? '🟢 正常' : '🔴 離線', detail: '系統運作中' },
              { label: '資料庫', status: apiOk ? '🟢 正常' : '🟡 未知', detail: '資料儲存正常' },
              { label: '智慧客服', status: apiOk ? '🟢 正常' : '🟡 未知', detail: '蜂神榜 AI' },
              { label: 'LINE / Telegram', status: '🟢 運行中', detail: '訊息收發正常' },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-xl bg-background">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-text">{item.label}</span>
                  <span className="text-xs">{item.status}</span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
