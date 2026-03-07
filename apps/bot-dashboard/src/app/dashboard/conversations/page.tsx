'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

interface Conversation {
  id: string
  bot_type: 'clairvoyant' | 'windear' | 'ai-tutor' | 'wentaishi'
  platform: 'telegram' | 'line'
  user_name: string
  message: string
  reply: string
  created_at: string
}

interface ConversationsResponse {
  data: Conversation[]
  next_cursor: string | null
  total: number
}

const BOT_TYPES = [
  { value: '', label: '所有 Bot' },
  { value: 'clairvoyant', label: '千里眼' },
  { value: 'windear', label: '順風耳' },
  { value: 'ai-tutor', label: '神算子' },
  { value: 'wentaishi', label: '聞仲老師' },
]

const PLATFORMS = [
  { value: '', label: '所有平台' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'line', label: 'LINE' },
]

const BOT_LABELS: Record<string, string> = {
  clairvoyant: '千里眼',
  windear: '順風耳',
  'ai-tutor': '神算子',
  wentaishi: '聞仲老師',
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [botType, setBotType] = useState('')
  const [platform, setPlatform] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [newCount, setNewCount] = useState(0)
  const lastFetchTime = useRef<string>('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const buildUrl = useCallback((cur?: string | null) => {
    const params = new URLSearchParams()
    if (botType) params.set('bot_type', botType)
    if (platform) params.set('platform', platform)
    if (search) params.set('search', search)
    if (cur) params.set('cursor', cur)
    params.set('limit', '20')
    return `/api/conversations?${params.toString()}`
  }, [botType, platform, search])

  const fetchConversations = useCallback(async (reset = true) => {
    if (reset) setLoading(true)
    try {
      const res = await fetch(buildUrl(reset ? null : cursor), { credentials: 'include' })
      const data: ConversationsResponse = await res.json()
      const list = data.data ?? []
      if (reset) {
        setConversations(list)
        if (list.length > 0) lastFetchTime.current = list[0].created_at
      } else {
        setConversations(prev => [...prev, ...list])
      }
      setCursor(data.next_cursor ?? null)
      setHasMore(!!data.next_cursor)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [buildUrl, cursor])

  const checkNew = useCallback(async () => {
    if (!lastFetchTime.current) return
    try {
      const params = new URLSearchParams()
      if (botType) params.set('bot_type', botType)
      if (platform) params.set('platform', platform)
      params.set('since', lastFetchTime.current)
      params.set('limit', '1')
      const res = await fetch(`/api/conversations?${params.toString()}`, { credentials: 'include' })
      const data: ConversationsResponse = await res.json()
      setNewCount(data.total ?? 0)
    } catch {
      // ignore
    }
  }, [botType, platform])

  useEffect(() => {
    fetchConversations(true)
  }, [botType, platform, search])

  useEffect(() => {
    intervalRef.current = setInterval(checkNew, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [checkNew])

  const toggleExpanded = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
  }

  const handleRefreshNew = () => {
    setNewCount(0)
    fetchConversations(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">💬</span>
          <div>
            <h1 className="text-2xl font-bold text-text">統一對話紀錄</h1>
            <p className="text-sm text-text-muted">所有 Bot 的對話紀錄</p>
          </div>
        </div>
        <a
          href="/api/conversations/export"
          className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          匯出 CSV
        </a>
      </div>

      {newCount > 0 && (
        <button
          onClick={handleRefreshNew}
          className="w-full mb-4 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors border border-primary/20"
        >
          有 {newCount} 則新訊息，點擊重新整理
        </button>
      )}

      {/* Filter Bar */}
      <div className="bg-surface rounded-2xl border border-border p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <select
            value={botType}
            onChange={e => setBotType(e.target.value)}
            className="px-4 py-2 border border-border rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {BOT_TYPES.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            value={platform}
            onChange={e => setPlatform(e.target.value)}
            className="px-4 py-2 border border-border rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {PLATFORMS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-48">
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="搜尋訊息內容..."
              className="flex-1 px-4 py-2 border border-border rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              搜尋
            </button>
          </form>
        </div>
      </div>

      {/* Conversations List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <p className="text-4xl mb-3">💬</p>
          <p className="font-medium">尚無對話紀錄</p>
          <p className="text-sm mt-1">請調整篩選條件再試</p>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map(conv => {
            const isExpanded = expanded.has(conv.id)
            return (
              <div key={conv.id} className="bg-surface rounded-2xl border border-border p-5">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleExpanded(conv.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="shrink-0 text-sm font-medium text-text">{conv.user_name}</span>
                    <span className="shrink-0 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                      {BOT_LABELS[conv.bot_type] ?? conv.bot_type}
                    </span>
                    <span className="shrink-0 px-2 py-0.5 text-xs rounded-full bg-border text-text-muted">
                      {conv.platform === 'telegram' ? 'Telegram' : 'LINE'}
                    </span>
                    <p className="text-sm text-text-muted truncate">{conv.message}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className="text-xs text-text-muted">
                      {new Date(conv.created_at).toLocaleString('zh-TW')}
                    </span>
                    <span className="text-text-muted text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-3 pt-4 border-t border-border">
                    <div className="flex justify-end">
                      <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-md bg-primary/10 text-text text-sm">
                        <p className="whitespace-pre-wrap">{conv.message}</p>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-bl-md bg-border/50 text-text text-sm">
                        <p className="whitespace-pre-wrap">{conv.reply}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {hasMore && !loading && (
        <div className="mt-6 text-center">
          <button
            onClick={() => fetchConversations(false)}
            className="px-6 py-2.5 border border-border text-text rounded-xl text-sm font-medium hover:bg-surface transition-colors"
          >
            載入更多
          </button>
        </div>
      )}
    </div>
  )
}
