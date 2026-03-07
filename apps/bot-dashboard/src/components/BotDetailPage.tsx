'use client'

import { useEffect, useState } from 'react'
import { Card } from './ui/Card'
import { PromptEditor, type PromptSettings } from './prompt-editor/PromptEditor'
import { ModelConfig, type ModelSettings } from './prompt-editor/ModelConfig'
import type { StructuredPrompt } from './prompt-editor/StructuredForm'
import { apiGet, apiPut, apiPost } from '../lib/api'

type TabId = 'prompt' | 'model' | 'conversations' | 'status'

interface BotDetailConfig {
  botType: 'clairvoyant' | 'windear' | 'ai-tutor' | 'wentaishi'
  name: string
  icon: string
  platform: 'telegram' | 'line'
  audience: string
}

const DEFAULT_STRUCTURED: StructuredPrompt = {
  roleName: '',
  roleDescription: '',
  toneRules: [],
  forbiddenActions: [],
  capabilities: [],
  knowledgeScope: '',
  customRules: [],
}

const DEFAULT_MODEL: ModelSettings = {
  name: 'gemini-2.5-flash-lite',
  temperature: 0.7,
  maxOutputTokens: 2048,
  topP: 0.9,
  topK: 40,
}

const TABS: { id: TabId; label: string; icon: string; adminOnly: boolean }[] = [
  { id: 'prompt', label: 'AI Prompt', icon: '✏️', adminOnly: true },
  { id: 'model', label: '模型參數', icon: '🎛️', adminOnly: true },
  { id: 'conversations', label: '對話紀錄', icon: '💬', adminOnly: false },
  { id: 'status', label: '狀態', icon: '📡', adminOnly: false },
]

interface PromptData extends PromptSettings {
  model: ModelSettings
}

export function BotDetailPage({ config }: { config: BotDetailConfig }) {
  const [tab, setTab] = useState<TabId>('prompt')
  const [promptData, setPromptData] = useState<PromptData | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [userRole, setUserRole] = useState<string>('admin')

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setUserRole(user.role || 'staff')
      } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    apiGet<Record<string, unknown>>(`/bot-prompts/${config.botType}`)
      .then((data) => {
        setPromptData({
          mode: (data.mode as 'structured' | 'advanced') || 'structured',
          structured: (data.structured as StructuredPrompt) || DEFAULT_STRUCTURED,
          fullPrompt: (data.fullPrompt as string) || '',
          model: (data.model as ModelSettings) || DEFAULT_MODEL,
        })
      })
      .catch(() => {
        setPromptData({
          mode: 'structured',
          structured: DEFAULT_STRUCTURED,
          fullPrompt: '',
          model: DEFAULT_MODEL,
        })
      })
  }, [config.botType])

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleSavePrompt = async () => {
    if (!promptData) return
    setSaving(true)
    try {
      await apiPut(`/bot-prompts/${config.botType}`, {
        mode: promptData.mode,
        structured: promptData.structured,
        fullPrompt: promptData.fullPrompt,
      })
      showMessage('Prompt 已儲存')
    } catch (err) {
      showMessage(`儲存失敗: ${err instanceof Error ? err.message : '未知錯誤'}`)
    }
    setSaving(false)
  }

  const handleSaveModel = async () => {
    if (!promptData) return
    setSaving(true)
    try {
      await apiPut(`/bot-prompts/${config.botType}`, { model: promptData.model })
      showMessage('模型參數已儲存')
    } catch (err) {
      showMessage(`儲存失敗: ${err instanceof Error ? err.message : '未知錯誤'}`)
    }
    setSaving(false)
  }

  const handleReset = async () => {
    if (!confirm('確定要恢復預設嗎？自訂設定將被刪除。')) return
    try {
      await apiPost(`/bot-prompts/${config.botType}/reset`, {})
      const data = await apiGet<Record<string, unknown>>(`/bot-prompts/${config.botType}`)
      setPromptData({
        mode: (data.mode as 'structured' | 'advanced') || 'structured',
        structured: (data.structured as StructuredPrompt) || DEFAULT_STRUCTURED,
        fullPrompt: (data.fullPrompt as string) || '',
        model: (data.model as ModelSettings) || DEFAULT_MODEL,
      })
      showMessage('已恢復預設')
    } catch (err) {
      showMessage(`重設失敗: ${err instanceof Error ? err.message : '未知錯誤'}`)
    }
  }

  const visibleTabs = TABS.filter((t) => !t.adminOnly || userRole === 'admin')

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">{config.icon}</span>
        <div>
          <h1 className="text-2xl font-bold text-text">{config.name}</h1>
          <p className="text-sm text-text-muted">{config.platform === 'telegram' ? 'Telegram' : 'LINE'} · {config.audience}</p>
        </div>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded-xl">
          <p className="text-sm text-text">{message}</p>
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-surface rounded-xl p-1 border border-border overflow-x-auto">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
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

      {tab === 'prompt' && promptData && (
        <Card title="AI Prompt 設定">
          <PromptEditor
            value={promptData}
            onChange={(v) => setPromptData({ ...promptData, ...v })}
            onSave={handleSavePrompt}
            onReset={handleReset}
            saving={saving}
          />
        </Card>
      )}

      {tab === 'model' && promptData && (
        <Card title="模型參數設定">
          <ModelConfig
            value={promptData.model}
            onChange={(model) => setPromptData({ ...promptData, model })}
          />
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveModel}
              disabled={saving}
              className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {saving ? '儲存中...' : '儲存變更'}
            </button>
          </div>
        </Card>
      )}

      {tab === 'conversations' && (
        <Card title={`${config.name} 對話紀錄`}>
          <BotConversationsTab botType={config.botType} botName={config.name} />
        </Card>
      )}

      {tab === 'status' && (
        <Card title="Bot 狀態">
          <BotStatusTab botType={config.botType} />
        </Card>
      )}
    </div>
  )
}

interface ConversationItem {
  id: string
  userName: string
  userMessage: string
  botReply: string
  intent: string
  latencyMs: number
  model: string
  createdAt: string
}

function BotConversationsTab({ botType, botName }: { botType: string; botName: string }) {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    apiGet<ConversationItem[]>(`/conversations?botType=${botType}&limit=50`)
      .then((data) => {
        setConversations(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [botType])

  if (loading) return <Loading />

  return (
    <div className="space-y-3">
      {conversations.map((conv) => (
        <div key={conv.id} className="rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === conv.id ? null : conv.id)}
            className="w-full p-4 text-left hover:bg-surface-hover transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm text-text">{conv.userName}</span>
              <div className="flex items-center gap-2">
                {conv.intent && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">{conv.intent}</span>
                )}
                <span className="text-xs text-text-muted">{new Date(conv.createdAt).toLocaleString('zh-TW')}</span>
              </div>
            </div>
            <p className="text-sm text-text-muted truncate">{conv.userMessage}</p>
          </button>
          {expanded === conv.id && (
            <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
              <div className="flex gap-2">
                <span className="text-xs font-medium text-text-muted shrink-0 mt-0.5">用戶：</span>
                <p className="text-sm text-text bg-blue-50 rounded-xl px-3 py-2">{conv.userMessage}</p>
              </div>
              <div className="flex gap-2">
                <span className="text-xs font-medium text-text-muted shrink-0 mt-0.5">{botName}：</span>
                <p className="text-sm text-text bg-primary/5 rounded-xl px-3 py-2">{conv.botReply}</p>
              </div>
              <div className="flex gap-4 text-xs text-text-muted">
                <span>模型：{conv.model}</span>
                <span>延遲：{conv.latencyMs}ms</span>
              </div>
            </div>
          )}
        </div>
      ))}
      {conversations.length === 0 && (
        <div className="text-center py-12 text-text-muted">
          <p className="text-4xl mb-2">💬</p>
          <p>目前沒有對話紀錄</p>
        </div>
      )}
    </div>
  )
}

interface HealthData {
  botType: string
  lastEventAt: string
  lastReplyAt: string
  lastError?: string
  messagesReceived24h: number
  repliesSent24h: number
  errors24h: number
  avgLatencyMs24h: number
}

function BotStatusTab({ botType }: { botType: string }) {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet<HealthData[]>('/bot-health')
      .then((data) => {
        const items = Array.isArray(data) ? data : []
        setHealth(items.find((h) => h.botType === botType) || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [botType])

  if (loading) return <Loading />

  if (!health) {
    return (
      <div className="text-center py-12 text-text-muted">
        <p className="text-4xl mb-2">📡</p>
        <p>尚無健康狀態資料</p>
        <p className="text-xs mt-1">Bot 收到第一則訊息後會開始記錄</p>
      </div>
    )
  }

  const lastEvent = health.lastEventAt ? new Date(health.lastEventAt) : null
  const minutesAgo = lastEvent ? Math.floor((Date.now() - lastEvent.getTime()) / 60000) : null

  let statusIcon = '🔴'
  let statusText = '異常'
  if (minutesAgo !== null && minutesAgo < 30) { statusIcon = '🟢'; statusText = '運作中' }
  else if (minutesAgo !== null && minutesAgo < 1440) { statusIcon = '🟡'; statusText = '閒置' }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{statusIcon}</span>
        <span className="text-lg font-medium text-text">{statusText}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-xl bg-surface-hover">
          <p className="text-xs text-text-muted">最後活動</p>
          <p className="text-sm font-medium text-text">{minutesAgo !== null ? `${minutesAgo} 分鐘前` : '無資料'}</p>
        </div>
        <div className="p-3 rounded-xl bg-surface-hover">
          <p className="text-xs text-text-muted">平均延遲</p>
          <p className="text-sm font-medium text-text">{health.avgLatencyMs24h || 0} ms</p>
        </div>
        <div className="p-3 rounded-xl bg-surface-hover">
          <p className="text-xs text-text-muted">24h 收到訊息</p>
          <p className="text-sm font-medium text-text">{health.messagesReceived24h || 0}</p>
        </div>
        <div className="p-3 rounded-xl bg-surface-hover">
          <p className="text-xs text-text-muted">24h 錯誤</p>
          <p className="text-sm font-medium text-text">{health.errors24h || 0}</p>
        </div>
      </div>
      {health.lastError && (
        <div className="p-3 rounded-xl bg-danger/5 border border-danger/20">
          <p className="text-xs text-text-muted mb-1">最近錯誤</p>
          <p className="text-sm text-danger font-mono">{health.lastError}</p>
        </div>
      )}
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
