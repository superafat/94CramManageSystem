'use client'

import { useState, useEffect } from 'react'
import { BackButton } from '@/components/ui/BackButton'

interface SettingsData {
  aiMode: string
  aiEngine: string
  searchThreshold: number
  maxResults: number
  telegramToken: string
  defaultBranchId: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // TODO: 後端尚未提供 settings API
    // 等待後端實作：GET /api/admin/settings?tenantId=xxx&branchId=xxx
    const loadSettings = async () => {
      try {
        setIsLoading(true)
        setError(null)
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800))
        // Demo data
        setSettings({
          aiMode: '標準模式（推薦）',
          aiEngine: '蜂神榜 AI（預設）',
          searchThreshold: 0.7,
          maxResults: 3,
          telegramToken: '',
          defaultBranchId: 'a1b2c3d4-e5f6-1a2b-8c3d-4e5f6a7b8c9d',
        })
      } catch (err) {
        setError('載入設定失敗')
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton fallbackUrl="/dashboard" />
        <div>
          <h1 className="text-xl font-bold text-text">系統設定</h1>
          <p className="text-sm text-text-muted">蜂神榜 AI 配置</p>
        </div>
      </div>

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
          <div className="bg-surface rounded-2xl border border-border p-6 animate-pulse">
            <div className="h-6 w-24 bg-surface-hover rounded mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 w-full bg-surface-hover rounded" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-surface rounded-2xl border border-border p-12 text-center">
          <div className="text-5xl mb-4">😵</div>
          <h3 className="text-lg font-medium text-text mb-2">{error}</h3>
          <p className="text-sm text-text-muted mb-4">請檢查網路連線或稍後再試</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary-hover transition-colors"
          >
            重新載入
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && !settings && (
        <div className="bg-surface rounded-2xl border border-border p-12 text-center">
          <div className="text-5xl mb-4">⚙️</div>
          <h3 className="text-lg font-medium text-text mb-2">尚未設定</h3>
          <p className="text-sm text-text-muted">請先完成系統初始化設定</p>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && settings && (
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
        <button className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors">
          儲存設定
        </button>
      </div>
      </>
      )}
    </div>
  )
}
