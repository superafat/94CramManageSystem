'use client'

import { useEffect, useState } from 'react'

type TabId = 'conversations' | 'bindings' | 'settings' | 'stats'

interface BotConfig {
  id: string
  name: string
  icon: string
  platform: 'telegram' | 'line'
  audience: string // e.g. '行政/館長' or '家長/學生'
  apiPrefix: string // e.g. '/api/clairvoyant' or '/api/parent'
  // which data endpoints to use
  conversationsEndpoint: string
  bindingsEndpoint: string
  settingsEndpoint: string
  usageEndpoint: string
  subscriptionKey: string // key in subscription for bot active status
}

interface Conversation {
  id: string
  user_name: string
  message: string
  reply: string
  intent?: string
  created_at: string
}

interface Binding {
  id: string
  user_id: string
  user_name: string
  bound_at: string
  platform_id?: string
  extra?: string
}

interface BotSettings {
  active: boolean
  welcome_message: string
  channel_name?: string
  channel_id?: string
}

interface UsageStats {
  total_conversations: number
  total_bindings: number
  monthly_messages: number
  monthly_limit: number
}

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'conversations', label: '對話紀錄', icon: '💬' },
  { id: 'bindings', label: '綁定管理', icon: '🔗' },
  { id: 'settings', label: '設定', icon: '⚙️' },
  { id: 'stats', label: '統計', icon: '📊' },
]

export function BotPage({ config }: { config: BotConfig }) {
  const [tab, setTab] = useState<TabId>('conversations')

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">{config.icon}</span>
        <div>
          <h1 className="text-2xl font-bold text-text">{config.name}</h1>
          <p className="text-sm text-text-muted">{config.platform === 'telegram' ? 'Telegram' : 'LINE'} · {config.audience}</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-surface rounded-xl p-1 border border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-muted hover:text-text hover:bg-surface-hover'
            }`}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'conversations' && <ConversationsTab config={config} />}
      {tab === 'bindings' && <BindingsTab config={config} />}
      {tab === 'settings' && <SettingsTab config={config} />}
      {tab === 'stats' && <StatsTab config={config} />}
    </div>
  )
}

function ConversationsTab({ config }: { config: BotConfig }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch(config.conversationsEndpoint, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setConversations(data.data || data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [config.conversationsEndpoint])

  const filtered = conversations.filter(c =>
    !search || c.user_name?.toLowerCase().includes(search.toLowerCase()) || c.message?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <Loading />

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="搜尋對話..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2 border border-border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((conv) => (
          <div key={conv.id} className="bg-surface rounded-2xl border border-border overflow-hidden">
            <button onClick={() => setExpanded(expanded === conv.id ? null : conv.id)} className="w-full p-4 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm text-text">{conv.user_name}</span>
                <div className="flex items-center gap-2">
                  {conv.intent && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">{conv.intent}</span>
                  )}
                  <span className="text-xs text-text-muted">{new Date(conv.created_at).toLocaleDateString('zh-TW')}</span>
                </div>
              </div>
              <p className="text-sm text-text-muted truncate">{conv.message}</p>
            </button>
            {expanded === conv.id && (
              <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                <div className="flex gap-2">
                  <span className="text-xs font-medium text-text-muted shrink-0 mt-0.5">用戶：</span>
                  <p className="text-sm text-text bg-blue-50 rounded-xl px-3 py-2">{conv.message}</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-xs font-medium text-text-muted shrink-0 mt-0.5">{config.name}：</span>
                  <p className="text-sm text-text bg-primary/5 rounded-xl px-3 py-2">{conv.reply}</p>
                </div>
                <p className="text-xs text-text-muted">{new Date(conv.created_at).toLocaleString('zh-TW')}</p>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            <p className="text-4xl mb-2">💬</p>
            <p>目前沒有對話紀錄</p>
          </div>
        )}
      </div>
    </div>
  )
}

function BindingsTab({ config }: { config: BotConfig }) {
  const [bindings, setBindings] = useState<Binding[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(config.bindingsEndpoint, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setBindings(data.data || data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [config.bindingsEndpoint])

  const handleUnbind = async (binding: Binding) => {
    if (!confirm(`確定要解除 ${binding.user_name} 的綁定嗎？`)) return
    await fetch(`${config.bindingsEndpoint}/${binding.user_id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    setBindings(bindings.filter(b => b.id !== binding.id))
  }

  if (loading) return <Loading />

  return (
    <div className="bg-surface rounded-2xl border border-border p-6">
      <h2 className="text-lg font-semibold text-text mb-4">
        已綁定用戶 ({bindings.length})
      </h2>
      {bindings.length > 0 ? (
        <div className="space-y-3">
          {bindings.map((binding) => (
            <div key={binding.id} className="flex items-center justify-between p-3 rounded-xl border border-border">
              <div>
                <p className="font-medium text-sm text-text">{binding.user_name}</p>
                <p className="text-xs text-text-muted">
                  {config.platform === 'telegram' ? 'Telegram' : 'LINE'} ID: {binding.platform_id || binding.user_id}
                  {binding.extra && ` | ${binding.extra}`}
                  {' | '}{new Date(binding.bound_at).toLocaleDateString('zh-TW')}
                </p>
              </div>
              <button onClick={() => handleUnbind(binding)} className="text-xs text-danger hover:underline px-3 py-1">
                解除綁定
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted text-center py-4">尚無已綁定用戶</p>
      )}
    </div>
  )
}

function SettingsTab({ config }: { config: BotConfig }) {
  const [settings, setSettings] = useState<BotSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch(config.settingsEndpoint, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setSettings({
          active: data[config.subscriptionKey] ?? data.active ?? true,
          welcome_message: data.welcome_message || '',
          channel_name: data.line_channel_name || data.bot_username || config.name,
          channel_id: data.line_channel_id || data.bot_token_masked || '',
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [config.settingsEndpoint, config.subscriptionKey, config.name])

  const handleToggle = async () => {
    if (!settings) return
    const newActive = !settings.active
    setSaving(true)
    await fetch('/api/subscriptions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ [config.subscriptionKey]: newActive }),
    })
    setSettings({ ...settings, active: newActive })
    setMessage(newActive ? `${config.name} 已開啟` : `${config.name} 已暫停`)
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleSaveWelcome = async () => {
    if (!settings) return
    setSaving(true)
    await fetch(config.settingsEndpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ welcome_message: settings.welcome_message }),
    })
    setMessage('歡迎訊息已儲存')
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  if (loading || !settings) return <Loading />

  return (
    <div className="space-y-6">
      {message && (
        <div className="p-3 bg-success/10 border border-success/30 rounded-xl">
          <p className="text-sm text-text">{message}</p>
        </div>
      )}

      <div className="bg-surface rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text">機器人開關</h2>
            <p className="text-sm text-text-muted mt-1">控制{config.name}是否自動回覆訊息</p>
          </div>
          <button
            onClick={handleToggle}
            disabled={saving}
            className={`relative w-14 h-7 rounded-full transition-colors ${settings.active ? 'bg-success' : 'bg-border'}`}
          >
            <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${settings.active ? 'translate-x-7' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <p className="text-sm">
          狀態：<span className={settings.active ? 'text-success font-medium' : 'text-warning font-medium'}>
            {settings.active ? '運作中' : '已暫停'}
          </span>
        </p>
      </div>

      <div className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text mb-4">歡迎訊息</h2>
        <p className="text-sm text-text-muted mb-3">用戶首次使用時收到的歡迎訊息</p>
        <textarea
          value={settings.welcome_message}
          onChange={(e) => setSettings({ ...settings, welcome_message: e.target.value })}
          rows={4}
          className="w-full px-4 py-3 border border-border rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        <button
          onClick={handleSaveWelcome}
          disabled={saving}
          className="mt-3 px-6 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {saving ? '儲存中...' : '儲存'}
        </button>
      </div>

      <div className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text mb-4">{config.platform === 'telegram' ? 'Telegram' : 'LINE'} 頻道資訊</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-sm text-text-muted">名稱</span>
            <span className="text-sm text-text font-medium">{settings.channel_name}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-text-muted">平台</span>
            <span className="text-sm text-text font-medium">{config.platform === 'telegram' ? 'Telegram Bot' : 'LINE Official Account'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatsTab({ config }: { config: BotConfig }) {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(config.usageEndpoint, { credentials: 'include' }).then(r => r.json()),
      fetch(config.bindingsEndpoint, { credentials: 'include' }).then(r => r.json()),
      fetch('/api/subscriptions', { credentials: 'include' }).then(r => r.json()),
    ]).then(([usage, bindings, sub]) => {
      const bindingCount = bindings.data?.length ?? (Array.isArray(bindings) ? bindings.length : 0)
      setStats({
        total_conversations: usage.ai_calls || usage.total_messages || 0,
        total_bindings: bindingCount,
        monthly_messages: usage.ai_calls || usage.total_messages || 0,
        monthly_limit: sub.ai_reply_limit || sub[`${config.id}_limit`] || 500,
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [config.usageEndpoint, config.bindingsEndpoint, config.id])

  if (loading || !stats) return <Loading />

  const usagePercent = stats.monthly_limit > 0 ? Math.round((stats.monthly_messages / stats.monthly_limit) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">本月訊息數</p>
          <p className="text-2xl font-bold text-text">{stats.monthly_messages}</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">已綁定用戶</p>
          <p className="text-2xl font-bold text-text">{stats.total_bindings}</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-5">
          <p className="text-sm text-text-muted mb-1">額度使用</p>
          <p className="text-2xl font-bold text-text">{usagePercent}%</p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text mb-4">用量趨勢</h2>
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-text font-medium">本月訊息量</span>
            <span className="text-text-muted">{stats.monthly_messages} / {stats.monthly_limit}</span>
          </div>
          <div className="w-full bg-border rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${usagePercent > 80 ? 'bg-danger' : 'bg-primary'}`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-text-muted mt-1">{usagePercent}% 已使用</p>
        </div>
        <p className="text-sm text-text-muted">
          詳細統計與歷史資料請至「方案加購」頁面查看完整用量報表。
        </p>
      </div>
    </div>
  )
}

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}
