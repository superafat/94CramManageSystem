'use client'

import { useEffect, useState } from 'react'

interface BotStatus {
  name: string
  icon: string
  platform: string
  active: boolean
  messages: number
  bindings: number
  href: string
}

export default function DashboardPage() {
  const [bots, setBots] = useState<BotStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/usage', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/subscriptions', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/bindings', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/parent-bindings', { credentials: 'include' }).then(r => r.json()),
    ]).then(([usage, sub, adminBindings, parentBindings]) => {
      const adminBindCount = Array.isArray(adminBindings) ? adminBindings.length : (adminBindings.data?.length || 0)
      const parentBindCount = Array.isArray(parentBindings) ? parentBindings.length : (parentBindings.data?.length || 0)

      setBots([
        {
          name: '千里眼',
          icon: '🏫',
          platform: 'Telegram',
          active: sub.admin_bot_active ?? true,
          messages: usage.api_calls || 0,
          bindings: adminBindCount,
          href: '/dashboard/clairvoyant',
        },
        {
          name: '順風耳',
          icon: '👨‍👩‍👧',
          platform: 'Telegram',
          active: sub.parent_bot_active ?? true,
          messages: Math.floor((usage.ai_calls || 0) * 0.3),
          bindings: parentBindCount,
          href: '/dashboard/windear',
        },
        {
          name: '聞太師',
          icon: '🤖',
          platform: 'LINE',
          active: sub.parent_bot_active ?? true,
          messages: usage.ai_calls || 0,
          bindings: parentBindCount,
          href: '/dashboard/wentaishi',
        },
      ])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const totalMessages = bots.reduce((sum, b) => sum + b.messages, 0)
  const totalBindings = bots.reduce((sum, b) => sum + b.bindings, 0)
  const activeBots = bots.filter(b => b.active).length

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">94BOT 總覽</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">運作中機器人</p>
          <p className="text-2xl font-bold text-text">{activeBots} <span className="text-sm font-normal text-text-muted">/ 3</span></p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">本月總訊息</p>
          <p className="text-2xl font-bold text-text">{totalMessages}</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">總綁定用戶</p>
          <p className="text-2xl font-bold text-text">{totalBindings}</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-text mb-4">機器人狀態</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {bots.map((bot) => (
          <a
            key={bot.name}
            href={bot.href}
            className="bg-surface rounded-2xl border border-border p-5 hover:border-primary/50 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{bot.icon}</span>
                <div>
                  <p className="font-semibold text-sm text-text">{bot.name}</p>
                  <p className="text-xs text-text-muted">{bot.platform}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 text-xs rounded-full ${bot.active ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                {bot.active ? '運作中' : '已暫停'}
              </span>
            </div>
            <div className="flex justify-between text-sm text-text-muted">
              <span>訊息：{bot.messages}</span>
              <span>綁定：{bot.bindings}</span>
            </div>
          </a>
        ))}
      </div>

      <div className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text mb-4">快速操作</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a href="/dashboard/clairvoyant" className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all">
            <span className="text-xl">🏫</span>
            <span className="text-sm font-medium text-text">管理千里眼</span>
          </a>
          <a href="/dashboard/windear" className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all">
            <span className="text-xl">👨‍👩‍👧</span>
            <span className="text-sm font-medium text-text">管理順風耳</span>
          </a>
          <a href="/dashboard/wentaishi" className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all">
            <span className="text-xl">🤖</span>
            <span className="text-sm font-medium text-text">管理聞太師</span>
          </a>
        </div>
      </div>
    </div>
  )
}
