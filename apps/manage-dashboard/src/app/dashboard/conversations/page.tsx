'use client'

import { useState, useEffect, useCallback } from 'react'
import { BackButton } from '@/components/ui/BackButton'

interface Conversation {
  id: string
  channel: string
  intent: string | null
  query: string
  answer: string
  model: string | null
  latency_ms: number | null
  tokens_used: number | null
  created_at: string
  branch_id: string
  branch_name: string | null
}

interface Pagination {
  total: number
  limit: number
  offset: number
}

const PLATFORM_LABELS: Record<string, string> = {
  telegram: 'Telegram',
  line: 'LINE',
  web: 'Web',
}

const PLATFORM_COLORS: Record<string, string> = {
  telegram: 'bg-blue-100 text-blue-700',
  line: 'bg-green-100 text-green-700',
  web: 'bg-morandi-blue/10 text-morandi-blue',
}

const INTENT_COLORS: Record<string, string> = {
  FAQ: 'bg-morandi-green/10 text-morandi-green',
  enrollment: 'bg-morandi-peach/10 text-morandi-peach',
  schedule: 'bg-morandi-purple/10 text-morandi-purple',
  billing: 'bg-morandi-yellow/10 text-morandi-yellow',
  greeting: 'bg-surface text-text-muted',
}

function PlatformBadge({ channel }: { channel: string }) {
  const label = PLATFORM_LABELS[channel] ?? channel
  const color = PLATFORM_COLORS[channel] ?? 'bg-surface text-text-muted'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

function IntentBadge({ intent }: { intent: string | null }) {
  if (!intent) return null
  const color = INTENT_COLORS[intent] ?? 'bg-surface text-text-muted'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {intent}
    </span>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function SkeletonRow() {
  return (
    <div className="px-5 py-4 border-b border-border animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-4 w-16 bg-border rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 bg-border rounded" />
          <div className="h-3 w-1/2 bg-border rounded" />
        </div>
        <div className="h-4 w-12 bg-border rounded-full" />
      </div>
    </div>
  )
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [pagination, setPagination] = useState<Pagination>({ total: 0, limit: 20, offset: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [platform, setPlatform] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const fetchConversations = useCallback(async (offset = 0) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: '20', offset: String(offset) })
      if (platform !== 'all') params.set('platform', platform)
      if (from) params.set('from', from)
      if (to) params.set('to', to)

      const res = await fetch(`/api/admin/conversations?${params}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message ?? 'Unknown error')
      setConversations(json.data.conversations)
      setPagination(json.data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [platform, from, to])

  useEffect(() => {
    fetchConversations(0)
  }, [fetchConversations])

  const totalPages = Math.ceil(pagination.total / pagination.limit)
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton fallbackUrl="/dashboard" />
        <div>
          <h1 className="text-xl font-bold text-text">對話紀錄</h1>
          <p className="text-sm text-text-muted">查看 AI 客服的所有對話紀錄</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-2xl border border-border px-5 py-4 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted font-medium">平台</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-text focus:outline-none focus:ring-2 focus:ring-morandi-blue/40"
          >
            <option value="all">全部</option>
            <option value="telegram">Telegram</option>
            <option value="line">LINE</option>
            <option value="web">Web</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted font-medium">開始日期</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-text focus:outline-none focus:ring-2 focus:ring-morandi-blue/40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted font-medium">結束日期</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm text-text focus:outline-none focus:ring-2 focus:ring-morandi-blue/40"
          />
        </div>
        {(platform !== 'all' || from || to) && (
          <button
            onClick={() => { setPlatform('all'); setFrom(''); setTo('') }}
            className="h-9 px-3 rounded-lg text-sm text-text-muted hover:text-text border border-border hover:bg-border/40 transition-colors"
          >
            清除篩選
          </button>
        )}
        <span className="ml-auto text-sm text-text-muted">
          共 {pagination.total} 筆
        </span>
      </div>

      {/* List */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-border bg-background/50 grid grid-cols-[1fr_auto_auto_auto] gap-3 text-xs font-medium text-text-muted uppercase tracking-wide">
          <span>訊息</span>
          <span className="w-16 text-center">平台</span>
          <span className="w-16 text-center">意圖</span>
          <span className="w-24 text-right">時間 / 延遲</span>
        </div>

        {error && (
          <div className="px-5 py-8 text-center text-sm text-red-500">
            載入失敗：{error}
          </div>
        )}

        {loading && !error && (
          <>
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </>
        )}

        {!loading && !error && conversations.length === 0 && (
          <div className="px-5 py-16 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-full bg-morandi-blue/10 flex items-center justify-center mb-3">
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-sm font-medium text-text mb-1">暫無對話紀錄</p>
            <p className="text-xs text-text-muted">AI 客服尚未收到任何訊息，或篩選條件無符合結果。</p>
          </div>
        )}

        {!loading && !error && conversations.map((conv) => (
          <div key={conv.id} className="px-5 py-4 border-b border-border last:border-0 hover:bg-background/40 transition-colors">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-start">
              {/* Message preview */}
              <div className="min-w-0">
                <p className="text-sm text-text font-medium truncate">{conv.query}</p>
                <p className="text-xs text-text-muted truncate mt-0.5 leading-relaxed">{conv.answer}</p>
                {conv.branch_name && (
                  <p className="text-xs text-text-muted/60 mt-0.5">{conv.branch_name}</p>
                )}
              </div>

              {/* Platform */}
              <div className="w-16 flex justify-center pt-0.5">
                <PlatformBadge channel={conv.channel} />
              </div>

              {/* Intent */}
              <div className="w-16 flex justify-center pt-0.5">
                <IntentBadge intent={conv.intent} />
              </div>

              {/* Time & latency */}
              <div className="w-24 text-right">
                <p className="text-xs text-text-muted">{formatDate(conv.created_at)}</p>
                {conv.latency_ms != null && (
                  <p className="text-xs text-text-muted/60 mt-0.5">{conv.latency_ms}ms</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={currentPage <= 1}
            onClick={() => fetchConversations((currentPage - 2) * pagination.limit)}
            className="h-8 px-3 rounded-lg text-sm border border-border text-text-muted hover:bg-border/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            上一頁
          </button>
          <span className="text-sm text-text-muted">
            第 {currentPage} / {totalPages} 頁
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => fetchConversations(currentPage * pagination.limit)}
            className="h-8 px-3 rounded-lg text-sm border border-border text-text-muted hover:bg-border/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            下一頁
          </button>
        </div>
      )}
    </div>
  )
}
