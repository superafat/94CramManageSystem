'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface HealthItem {
  botType: string
  platform: string
  lastEventAt: string
  messagesReceived24h: number
  repliesSent24h: number
  errors24h: number
  avgLatencyMs24h: number
}

interface OverviewData {
  today: { total: number; byBot: Record<string, number> }
  month: { total: number; byBot: Record<string, number>; byRole: Record<string, number> }
  health: HealthItem[]
}

const BOT_INFO: Record<string, { name: string; icon: string; platform: string; href: string }> = {
  clairvoyant: { name: '千里眼', icon: '🔮', platform: 'Telegram', href: '/dashboard/clairvoyant' },
  windear: { name: '順風耳', icon: '👂', platform: 'Telegram', href: '/dashboard/windear' },
  'ai-tutor': { name: '神算子', icon: '📐', platform: 'Telegram', href: '/dashboard/ai-tutor' },
  wentaishi: { name: '聞仲老師', icon: '📖', platform: 'LINE', href: '/dashboard/wentaishi' },
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(() => {
    fetch('/api/analytics/overview', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        setOverview(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const todayTotal = overview?.today?.total ?? 0
  const monthTotal = overview?.month?.total ?? 0
  const activeRoles = overview?.month?.byRole ? Object.keys(overview.month.byRole).length : 0
  const healthMap = new Map((overview?.health ?? []).map((h) => [h.botType, h]))

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">94BOT 總覽</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">今日對話</p>
          <p className="text-2xl font-bold text-text">{todayTotal}</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">本月對話</p>
          <p className="text-2xl font-bold text-text">{monthTotal}</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">活躍角色類型</p>
          <p className="text-2xl font-bold text-text">{activeRoles}</p>
        </div>
      </div>

      {/* Bot Status Cards */}
      <h2 className="text-lg font-semibold text-text mb-4">Bot 狀態</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Object.entries(BOT_INFO).map(([botType, info]) => {
          const health = healthMap.get(botType)
          const lastEvent = health?.lastEventAt ? new Date(health.lastEventAt) : null
          const minutesAgo = lastEvent ? Math.floor((Date.now() - lastEvent.getTime()) / 60000) : null

          let statusIcon = '⚪'
          let statusText = '未啟用'
          if (minutesAgo !== null && minutesAgo < 30) { statusIcon = '🟢'; statusText = '運作中' }
          else if (minutesAgo !== null && minutesAgo < 1440) { statusIcon = '🟡'; statusText = '閒置' }
          else if (minutesAgo !== null) { statusIcon = '🔴'; statusText = '異常' }

          const todayCount = overview?.today?.byBot?.[botType] ?? 0

          return (
            <Link
              key={botType}
              href={info.href}
              className="bg-surface rounded-2xl border border-border p-5 hover:border-primary/50 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <p className="font-semibold text-sm text-text">{info.name}</p>
                    <p className="text-xs text-text-muted">{info.platform}</p>
                  </div>
                </div>
                <span className="text-sm">{statusIcon}</span>
              </div>
              <div className="space-y-1 text-sm text-text-muted">
                <div className="flex justify-between">
                  <span>狀態</span>
                  <span className="font-medium text-text">{statusText}</span>
                </div>
                <div className="flex justify-between">
                  <span>今日對話</span>
                  <span className="font-medium text-text">{todayCount}</span>
                </div>
                {health && (
                  <>
                    <div className="flex justify-between">
                      <span>24h 訊息</span>
                      <span className="font-medium text-text">{health.messagesReceived24h || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>平均延遲</span>
                      <span className="font-medium text-text">{health.avgLatencyMs24h || 0}ms</span>
                    </div>
                  </>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text mb-4">快速操作</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Link href="/dashboard/conversations" className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all">
            <span className="text-xl">💬</span>
            <span className="text-sm font-medium text-text">對話紀錄</span>
          </Link>
          <Link href="/dashboard/knowledge-base" className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all">
            <span className="text-xl">📚</span>
            <span className="text-sm font-medium text-text">知識庫</span>
          </Link>
          <Link href="/dashboard/analytics" className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all">
            <span className="text-xl">📈</span>
            <span className="text-sm font-medium text-text">統計分析</span>
          </Link>
          <Link href="/dashboard/bindings" className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all">
            <span className="text-xl">🔗</span>
            <span className="text-sm font-medium text-text">綁定管理</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
