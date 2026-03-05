'use client'

import { useEffect, useState } from 'react'

interface BotSettings {
  parent_bot_active: boolean
  welcome_message: string
  ai_reply_tone: string
  line_channel_name: string
  line_channel_id: string
}

export default function LineBotPage() {
  const [settings, setSettings] = useState<BotSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/settings', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setSettings(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleToggleBot = async () => {
    if (!settings) return
    const newActive = !settings.parent_bot_active
    setSaving(true)
    await fetch('/api/subscriptions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ parent_bot_active: newActive }),
    })
    setSettings({ ...settings, parent_bot_active: newActive })
    setMessage(newActive ? '聞太師已開啟' : '聞太師已暫停')
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleSaveWelcome = async () => {
    if (!settings) return
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ welcome_message: settings.welcome_message }),
    })
    setMessage('歡迎訊息已儲存')
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">聞太師設定</h1>

      {message && (
        <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded-xl">
          <p className="text-sm text-text">{message}</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-surface rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-text">機器人開關</h2>
              <p className="text-sm text-text-muted mt-1">控制聞太師是否自動回覆家長訊息</p>
            </div>
            <button
              onClick={handleToggleBot}
              disabled={saving}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                settings.parent_bot_active ? 'bg-success' : 'bg-border'
              }`}
            >
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                settings.parent_bot_active ? 'translate-x-7' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          <p className="text-sm">
            狀態：<span className={settings.parent_bot_active ? 'text-success font-medium' : 'text-warning font-medium'}>
              {settings.parent_bot_active ? '運作中' : '已暫停'}
            </span>
          </p>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold text-text mb-4">歡迎訊息</h2>
          <p className="text-sm text-text-muted mb-3">家長首次加入 LINE 好友時會收到的歡迎訊息</p>
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
          <h2 className="text-lg font-semibold text-text mb-4">LINE 頻道資訊</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-text-muted">頻道名稱</span>
              <span className="text-sm text-text font-medium">{settings.line_channel_name}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-text-muted">頻道 ID</span>
              <code className="text-xs font-mono text-text-muted bg-background px-2 py-1 rounded">{settings.line_channel_id}</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
