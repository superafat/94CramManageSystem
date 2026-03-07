'use client'

import { useEffect, useState } from 'react'

interface Settings {
  tenant_id: string
  enabled_modules: string[]
  welcome_message: string
  plan: string
  max_bindings: number
  max_ai_calls: number
  log_retention_days: number
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/settings', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => { setSettings(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          enabled_modules: settings.enabled_modules,
          welcome_message: settings.welcome_message,
          log_retention_days: settings.log_retention_days,
        }),
      })
      setMessage('設定已儲存')
    } catch {
      setMessage('儲存失敗')
    }
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const toggleModule = (mod: string) => {
    if (!settings) return
    const modules = settings.enabled_modules.includes(mod)
      ? settings.enabled_modules.filter((m) => m !== mod)
      : [...settings.enabled_modules, mod]
    setSettings({ ...settings, enabled_modules: modules })
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
      <h1 className="text-2xl font-bold text-text mb-6">系統設定</h1>

      {message && (
        <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded-xl">
          <p className="text-sm text-text">{message}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Welcome Message */}
        <div className="bg-surface rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold text-text mb-2">歡迎訊息</h2>
          <p className="text-sm text-text-muted mb-3">用戶進入系統時顯示的歡迎訊息</p>
          <textarea
            value={settings.welcome_message}
            onChange={(e) => setSettings({ ...settings, welcome_message: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 border border-border rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* Enabled Modules */}
        <div className="bg-surface rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold text-text mb-2">啟用模組</h2>
          <p className="text-sm text-text-muted mb-4">選擇要啟用的系統模組</p>
          <div className="space-y-3">
            {[
              { id: 'manage', label: '行政管理 (94Manage)', desc: '排課、薪資、帳單' },
              { id: 'inclass', label: '課堂教學 (94inClass)', desc: '點名、成績、聯絡簿' },
              { id: 'stock', label: '庫存管理 (94Stock)', desc: '教材、文具庫存' },
            ].map((mod) => (
              <label key={mod.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-surface-hover cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled_modules.includes(mod.id)}
                  onChange={() => toggleModule(mod.id)}
                  className="w-4 h-4 accent-primary"
                />
                <div>
                  <p className="text-sm font-medium text-text">{mod.label}</p>
                  <p className="text-xs text-text-muted">{mod.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Log Retention */}
        <div className="bg-surface rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold text-text mb-2">Log 保留天數</h2>
          <p className="text-sm text-text-muted mb-3">對話紀錄和系統 log 的保留期限</p>
          <select
            value={settings.log_retention_days}
            onChange={(e) => setSettings({ ...settings, log_retention_days: parseInt(e.target.value, 10) })}
            className="w-full max-w-xs px-4 py-2 border border-border rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {[7, 14, 30, 60, 90].map((d) => (
              <option key={d} value={d}>{d} 天</option>
            ))}
          </select>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {saving ? '儲存中...' : '儲存變更'}
          </button>
        </div>
      </div>
    </div>
  )
}
