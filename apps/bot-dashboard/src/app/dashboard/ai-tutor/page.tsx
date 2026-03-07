'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface AnalyticsData {
  today_questions: number
  monthly_questions: number
  active_students: number
  knowledge_hit_rate: number
}

interface Settings {
  active: boolean
}

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}

export default function AiTutorPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [active, setActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/ai-tutor/analytics', { credentials: 'include' })
        .then(r => r.json())
        .catch(() => null),
      fetch('/api/ai-tutor/settings', { credentials: 'include' })
        .then(r => r.json())
        .catch(() => null),
    ]).then(([analyticsData, settingsData]) => {
      setAnalytics({
        today_questions: analyticsData?.today_questions ?? 0,
        monthly_questions: analyticsData?.monthly_questions ?? 0,
        active_students: analyticsData?.active_students ?? 0,
        knowledge_hit_rate: analyticsData?.knowledge_hit_rate ?? 0,
      })
      setActive(settingsData?.active ?? true)
      setLoading(false)
    })
  }, [])

  const handleToggle = async () => {
    setToggling(true)
    try {
      await fetch('/api/ai-tutor/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ active: !active }),
      })
      setActive(prev => !prev)
      setMessage(!active ? '神算子已開啟' : '神算子已暫停')
      setTimeout(() => setMessage(''), 3000)
    } catch {
      setMessage('操作失敗，請稍後再試')
      setTimeout(() => setMessage(''), 3000)
    }
    setToggling(false)
  }

  if (loading) return <Loading />

  const statCards = [
    { label: '今日問答數', value: analytics?.today_questions ?? 0, icon: '💬' },
    { label: '本月累計', value: analytics?.monthly_questions ?? 0, icon: '📅' },
    { label: '活躍學生數', value: analytics?.active_students ?? 0, icon: '👨‍🎓' },
    {
      label: '知識庫命中率',
      value: `${analytics?.knowledge_hit_rate ?? 0}%`,
      icon: '🎯',
    },
  ]

  const quickLinks = [
    { href: '/dashboard/ai-tutor/settings', icon: '⚙️', label: '助教設定', desc: '科目、回應風格、每日配額' },
    { href: '/dashboard/ai-tutor/conversations', icon: '💬', label: '對話紀錄', desc: '查看學生問答歷史' },
    { href: '/dashboard/ai-tutor/analytics', icon: '📊', label: '統計分析', desc: '熱門問題、使用趨勢' },
    { href: '/dashboard/ai-tutor/invites', icon: '🔗', label: '邀請管理', desc: '產生邀請碼、管理綁定' },
  ]

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🤖</span>
        <div>
          <h1 className="text-2xl font-bold text-text">AI 課業助教 — 神算子</h1>
          <p className="text-sm text-text-muted">LINE · 學生</p>
        </div>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded-xl">
          <p className="text-sm text-text">{message}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => (
          <div key={card.label} className="bg-surface rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{card.icon}</span>
              <p className="text-xs text-text-muted">{card.label}</p>
            </div>
            <p className="text-2xl font-bold text-text">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Enable/Disable Toggle */}
      <div className="bg-surface rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text">助教開關</h2>
            <p className="text-sm text-text-muted mt-1">控制神算子是否自動回答學生問題</p>
            <p className="text-sm mt-2">
              狀態：
              <span className={active ? 'text-success font-medium' : 'text-warning font-medium'}>
                {active ? '運作中' : '已暫停'}
              </span>
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`relative w-14 h-7 rounded-full transition-colors ${active ? 'bg-success' : 'bg-border'}`}
          >
            <div
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                active ? 'translate-x-7' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Quick Links */}
      <h2 className="text-lg font-semibold text-text mb-4">功能入口</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-start gap-4 p-5 bg-surface rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
          >
            <span className="text-2xl mt-0.5">{link.icon}</span>
            <div>
              <p className="font-medium text-text">{link.label}</p>
              <p className="text-sm text-text-muted mt-0.5">{link.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
