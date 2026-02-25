'use client'

import { useState, useEffect } from 'react'
import { BackButton } from '@/components/ui/BackButton'

const STORAGE_KEY = 'manage_settings'

interface SettingsData {
  aiMode: string
  aiEngine: string
  searchThreshold: number
  maxResults: number
  telegramToken: string
  defaultBranchId: string
}

const DEFAULT_SETTINGS: SettingsData = {
  aiMode: '標準模式（推薦）',
  aiEngine: '蜂神榜 AI（預設）',
  searchThreshold: 0.7,
  maxResults: 3,
  telegramToken: '',
  defaultBranchId: '',
}

function loadFromStorage(): SettingsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveToStorage(data: SettingsData): void {
  // Strip telegramToken before persisting — bot tokens are secrets and must not
  // be stored in localStorage where XSS could read them.
  const { telegramToken: _omit, ...safe } = data
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safe))
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [usingBackend, setUsingBackend] = useState(false)

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/admin/settings', { credentials: 'include' })
        if (res.ok) {
          const json = await res.json()
          const remote: Partial<SettingsData> = json?.data?.settings ?? {}
          setSettings({ ...DEFAULT_SETTINGS, ...remote })
          setUsingBackend(true)
        } else {
          // Fall back to localStorage if API returns non-OK
          setSettings(loadFromStorage())
        }
      } catch {
        // Fall back to localStorage if API is unreachable
        setSettings(loadFromStorage())
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  async function handleSave() {
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setUsingBackend(true)
        setSaveStatus('saved')
      } else {
        // Fall back to localStorage
        saveToStorage(settings)
        setSaveStatus('saved')
      }
    } catch {
      // Fall back to localStorage
      saveToStorage(settings)
      setSaveStatus('saved')
    }
    setTimeout(() => setSaveStatus('idle'), 2500)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton fallbackUrl="/dashboard" />
        <div>
          <h1 className="text-xl font-bold text-text">系統設定</h1>
          <p className="text-sm text-text-muted">蜂神榜 AI 配置</p>
        </div>
      </div>

      {/* Show local-storage notice only when not using backend */}
      {!isLoading && !usingBackend && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <span className="text-amber-500 mt-0.5 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-medium text-amber-800">設定暫存於瀏覽器本地</p>
            <p className="text-xs text-amber-700 mt-0.5">
              無法連線至後端 API，目前儲存的設定只保存在此瀏覽器的 localStorage，換裝置或清除瀏覽器資料後將會遺失。
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-6">
          <div className="bg-surface rounded-2xl border border-border p-6 space-y-4 animate-pulse">
            <div className="h-6 w-32 bg-surface-hover rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 bg-surface-hover rounded" />
                  <div className="h-10 w-full bg-surface-hover rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {!isLoading && (
        <>
          {/* AI Engine Config */}
          <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-text">蜂神榜 AI 設定</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-muted mb-1">AI 回覆模式</label>
                <select
                  value={settings.aiMode}
                  onChange={(e) => setSettings({ ...settings, aiMode: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-border bg-background text-text"
                >
                  <option>標準模式（推薦）</option>
                  <option>快速模式（省流量）</option>
                  <option>精準模式（高品質）</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">智慧理解引擎</label>
                <select
                  value={settings.aiEngine}
                  onChange={(e) => setSettings({ ...settings, aiEngine: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-border bg-background text-text"
                >
                  <option>蜂神榜 AI（預設）</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">搜尋精準度（越高越嚴格）</label>
                <input
                  type="number"
                  value={settings.searchThreshold}
                  onChange={(e) => setSettings({ ...settings, searchThreshold: parseFloat(e.target.value) })}
                  step={0.05}
                  min={0}
                  max={1}
                  className="w-full px-4 py-2 rounded-xl border border-border bg-background text-text"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">每次搜尋最多顯示幾筆</label>
                <input
                  type="number"
                  value={settings.maxResults}
                  onChange={(e) => setSettings({ ...settings, maxResults: parseInt(e.target.value) })}
                  min={1}
                  max={10}
                  className="w-full px-4 py-2 rounded-xl border border-border bg-background text-text"
                />
              </div>
            </div>
          </div>

          {/* Intent Routing */}
          <div className="bg-surface rounded-2xl border border-border p-6">
            <h2 className="text-lg font-semibold text-text mb-4">意圖路由表</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-text-muted font-medium">意圖</th>
                    <th className="text-left py-2 text-text-muted font-medium">模型</th>
                    <th className="text-left py-2 text-text-muted font-medium">超時</th>
                    <th className="text-left py-2 text-text-muted font-medium">系統提示</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { intent: '📅 排課', model: 'Flash Lite', timeout: '5s', prompt: '課程排班助手' },
                    { intent: '❓ FAQ', model: 'Flash Lite', timeout: '5s', prompt: 'FAQ 助手' },
                    { intent: '📋 出席', model: 'Flash Lite', timeout: '5s', prompt: '出缺席查詢助手' },
                    { intent: '💰 帳務', model: 'Flash', timeout: '8s', prompt: '帳務查詢助手' },
                    { intent: '📊 報表', model: 'Flash', timeout: '15s', prompt: '報表生成助手' },
                    { intent: '📝 作業', model: 'Flash', timeout: '8s', prompt: '作業管理助手' },
                    { intent: '🎓 招生', model: 'Sonnet', timeout: '12s', prompt: '招生諮詢顧問' },
                    { intent: '📢 客訴', model: 'Sonnet', timeout: '12s', prompt: '客訴處理專員' },
                    { intent: '💬 一般', model: 'Flash', timeout: '8s', prompt: 'AI 助手' },
                  ].map((route) => (
                    <tr key={route.intent}>
                      <td className="py-2 text-text">{route.intent}</td>
                      <td className="py-2">
                        <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-xs">
                          {route.model}
                        </span>
                      </td>
                      <td className="py-2 text-text-muted">{route.timeout}</td>
                      <td className="py-2 text-text-muted">{route.prompt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Telegram Bot */}
          <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-text">Telegram Bot 設定</h2>
            <div>
              <label className="block text-sm text-text-muted mb-1">Bot Token</label>
              <input
                type="password"
                value={settings.telegramToken}
                onChange={(e) => setSettings({ ...settings, telegramToken: e.target.value })}
                placeholder="輸入 Telegram Bot Token..."
                className="w-full px-4 py-2 rounded-xl border border-border bg-background text-text"
              />
              <p className="mt-1.5 text-xs text-text-muted">
                Token 儲存於伺服器，不會暴露於瀏覽器。
              </p>
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">預設分校 ID</label>
              <input
                type="text"
                value={settings.defaultBranchId}
                onChange={(e) => setSettings({ ...settings, defaultBranchId: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-border bg-background text-text font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-60"
              >
                {saveStatus === 'saving' ? '儲存中...' : '儲存設定'}
              </button>
              {saveStatus === 'saved' && (
                <span className="text-sm text-green-600 font-medium">
                  {usingBackend ? '已儲存至伺服器' : '已儲存至本地'}
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-sm text-red-600 font-medium">儲存失敗，請重試</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
