'use client'

import { useEffect, useState } from 'react'

interface Stats {
  aiReplies: number
  aiLimit: number
  boundParents: number
  pushUsed: number
  pushLimit: number
  botActive: boolean
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/usage', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/parent-bindings', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/subscriptions', { credentials: 'include' }).then(r => r.json()),
    ]).then(([usage, bindings, sub]) => {
      setStats({
        aiReplies: usage.ai_calls || 0,
        aiLimit: sub.ai_reply_limit || 500,
        boundParents: bindings.data?.length || bindings.length || 0,
        pushUsed: usage.push_calls || 0,
        pushLimit: sub.push_limit || 200,
        botActive: sub.parent_bot_active ?? true,
      })
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

  const s = stats!

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">94BOT 總覽</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon="🤖"
          label="本月 AI 回覆"
          value={`${s.aiReplies}`}
          sub={`/ ${s.aiLimit} 則`}
          percent={Math.round((s.aiReplies / s.aiLimit) * 100)}
        />
        <StatCard
          icon="🔗"
          label="已綁定家長"
          value={`${s.boundParents}`}
          sub="位"
        />
        <StatCard
          icon="📤"
          label="LINE Push 用量"
          value={`${s.pushUsed}`}
          sub={`/ ${s.pushLimit} 則`}
          percent={Math.round((s.pushUsed / s.pushLimit) * 100)}
        />
        <StatCard
          icon={s.botActive ? '✅' : '⏸️'}
          label="機器人狀態"
          value={s.botActive ? '運作中' : '已暫停'}
          sub={s.botActive ? '正常回覆家長訊息' : '暫停回覆'}
          color={s.botActive ? 'text-success' : 'text-warning'}
        />
      </div>

      <div className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text mb-4">快速操作</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickAction href="/dashboard/conversations" icon="💬" label="查看對話紀錄" />
          <QuickAction href="/dashboard/bindings" icon="🔗" label="管理家長綁定" />
          <QuickAction href="/dashboard/line-bot" icon="🤖" label="聞太師設定" />
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, percent, color }: {
  icon: string; label: string; value: string; sub: string; percent?: number; color?: string
}) {
  return (
    <div className="bg-surface rounded-2xl border border-border p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <span className="text-sm text-text-muted">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color || 'text-text'}`}>
        {value} <span className="text-sm font-normal text-text-muted">{sub}</span>
      </p>
      {percent !== undefined && (
        <div className="mt-3">
          <div className="w-full bg-border rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${percent > 80 ? 'bg-danger' : 'bg-primary'}`}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-text-muted mt-1">{percent}% 已使用</p>
        </div>
      )}
    </div>
  )
}

function QuickAction({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-medium text-text">{label}</span>
    </a>
  )
}
