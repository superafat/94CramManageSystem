'use client'

import { useState, useEffect } from 'react'
import { BackButton } from '@/components/ui/BackButton'

// TODO: 後端尚未提供 conversation list API，目前使用 demo 數據
// 等待後端實作：GET /api/admin/conversations?tenantId=xxx&branchId=xxx
// 預期回傳格式：{ conversations: Array<Conversation> }

interface Message {
  role: 'user' | 'ai'
  text: string
}

interface Conversation {
  id: number
  user: string
  userId: string
  time: string
  messages: Message[]
  intent: string
  model: string
  latency: string
  ragUsed: boolean
}

const demoConversations: Conversation[] = [
  {
    id: 1, user: '王媽媽', userId: 'TG_001', time: '08:35',
    messages: [
      { role: 'user', text: '國中數學課什麼時候上？學費多少？' },
      { role: 'ai', text: '根據知識庫資料：國中部數學課在每週二四晚上 18:30-20:30。國中部的學費為每月4500元，報名時需繳交註冊費1000元。' },
    ],
    intent: '💰 帳務', model: '蜂神榜 AI', latency: '2.5s', ragUsed: true,
  },
  {
    id: 2, user: '李爸爸', userId: 'TG_002', time: '08:30',
    messages: [
      { role: 'user', text: '學費可以分期嗎？' },
      { role: 'ai', text: '目前我們接受現金、轉帳或信用卡付款。關於分期付款的安排，建議您直接聯繫櫃台，我們可以根據您的需求提供彈性方案。' },
    ],
    intent: '💰 帳務', model: '蜂神榜 AI', latency: '1.8s', ragUsed: true,
  },
  {
    id: 3, user: '張家長', userId: 'TG_003', time: '08:22',
    messages: [
      { role: 'user', text: '我對老師的態度很不滿，想投訴' },
      { role: 'ai', text: '非常抱歉讓您有不愉快的經驗。我們非常重視每位家長的意見。請告訴我更多細節，包括是哪位老師、發生了什麼事，我會立即轉交主管處理。' },
    ],
    intent: '📢 客訴', model: '蜂神榜 AI', latency: '8.0s', ragUsed: false,
  },
  {
    id: 4, user: '陳同學', userId: 'TG_004', time: '08:15',
    messages: [
      { role: 'user', text: '王老師教什麼科目？' },
      { role: 'ai', text: '根據知識庫資料，王老師教的科目是數學。王老師是台大數學系畢業，有10年教學經驗，專攻國中數學。' },
    ],
    intent: '❓ FAQ', model: '蜂神榜 AI', latency: '1.4s', ragUsed: true,
  },
]

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState('全部')

  useEffect(() => {
    // Simulate API call
    const loadConversations = async () => {
      try {
        setIsLoading(true)
        setError(null)
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800))
        setConversations(demoConversations)
      } catch (err) {
        setError('載入對話紀錄失敗')
      } finally {
        setIsLoading(false)
      }
    }

    loadConversations()
  }, [])
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
      <div className="flex gap-2 flex-wrap">
        {['全部', '📅 排課', '💰 帳務', '❓ FAQ', '📢 客訴', '🎓 招生'].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              activeFilter === filter
                ? 'bg-primary text-white'
                : 'bg-surface border border-border text-text-muted hover:bg-surface-hover'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Demo Data Notice */}
      <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl text-sm flex items-center gap-2">
        <span>⚠️</span>
        <span>目前顯示為展示資料，待後端 API 完成後將自動切換為即時資料</span>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-2xl border border-border p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-surface-hover" />
                <div className="space-y-2">
                  <div className="h-4 w-20 bg-surface-hover rounded" />
                  <div className="h-3 w-32 bg-surface-hover rounded" />
                </div>
              </div>
              <div className="space-y-2 ml-13">
                <div className="h-3 w-3/4 bg-surface-hover rounded" />
                <div className="h-3 w-full bg-surface-hover rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-surface rounded-2xl border border-border p-8 text-center">
          <div className="text-4xl mb-3">😵</div>
          <h3 className="text-lg font-medium text-text mb-2">{error}</h3>
          <p className="text-sm text-text-muted mb-4">請檢查網路連線或稍後再試</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            重新載入
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && conversations && conversations.length === 0 && (
        <div className="bg-surface rounded-2xl border border-border p-8 text-center">
          <div className="text-5xl mb-3">💬</div>
          <h3 className="text-lg font-medium text-text mb-2">尚無對話紀錄</h3>
          <p className="text-sm text-text-muted">等待用戶開始與 AI 客服對話</p>
        </div>
      )}

      {/* Conversation List */}
      {!isLoading && !error && conversations && conversations.length > 0 && (
        <div className="space-y-4">
        {conversations.filter(conv => activeFilter === '全部' || conv.intent === activeFilter).map((conv) => (
          <div key={conv.id} className="bg-surface rounded-2xl border border-border p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary">
                  {conv.user[0]}
                </div>
                <div>
                  <p className="font-medium text-text">{conv.user}</p>
                  <p className="text-xs text-text-muted">{conv.userId} · {conv.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary">{conv.intent}</span>
                <span className="text-xs text-text-muted">{conv.model}</span>
                <span className="text-xs text-text-muted">⏱ {conv.latency}</span>
                {conv.ragUsed && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-morandi-sage/20 text-morandi-sage">📚 RAG</span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-3 ml-13">
              {conv.messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'ai' ? '' : ''}`}>
                  <span className="text-sm mt-0.5">{msg.role === 'user' ? '👤' : '🤖'}</span>
                  <p className={`text-sm leading-relaxed ${
                    msg.role === 'ai' ? 'text-text bg-background rounded-xl px-3 py-2' : 'text-text-muted'
                  }`}>
                    {msg.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  )
}
