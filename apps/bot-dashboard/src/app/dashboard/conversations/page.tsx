'use client'

import { useEffect, useState } from 'react'

interface Conversation {
  id: string
  parent_name: string
  student_name: string
  message: string
  reply: string
  intent: string
  created_at: string
}

const INTENT_LABELS: Record<string, string> = {
  schedule_query: '課程查詢',
  grade_query: '成績查詢',
  attendance_query: '出勤查詢',
  payment_query: '繳費查詢',
  leave_request: '請假申請',
  contact_book: '聯絡簿',
  enrollment_query: '報名查詢',
  general_query: '一般問題',
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/conversations', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setConversations(data.data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = conversations.filter(c =>
    !search || c.parent_name.includes(search) || c.student_name.includes(search)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">對話紀錄</h1>

      <div className="mb-4">
        <input
          type="text"
          placeholder="搜尋家長或學生姓名..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2 border border-border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((conv) => (
          <div
            key={conv.id}
            className="bg-surface rounded-2xl border border-border overflow-hidden"
          >
            <button
              onClick={() => setExpanded(expanded === conv.id ? null : conv.id)}
              className="w-full p-4 text-left"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-text">{conv.parent_name}</span>
                  <span className="text-xs text-text-muted">({conv.student_name})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                    {INTENT_LABELS[conv.intent] || conv.intent}
                  </span>
                  <span className="text-xs text-text-muted">
                    {new Date(conv.created_at).toLocaleDateString('zh-TW')}
                  </span>
                </div>
              </div>
              <p className="text-sm text-text-muted truncate">{conv.message}</p>
            </button>

            {expanded === conv.id && (
              <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                <div className="flex gap-2">
                  <span className="text-xs font-medium text-text-muted shrink-0 mt-0.5">家長：</span>
                  <p className="text-sm text-text bg-blue-50 rounded-xl px-3 py-2">{conv.message}</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-xs font-medium text-text-muted shrink-0 mt-0.5">聞太師：</span>
                  <p className="text-sm text-text bg-primary/5 rounded-xl px-3 py-2">{conv.reply}</p>
                </div>
                <p className="text-xs text-text-muted">
                  {new Date(conv.created_at).toLocaleString('zh-TW')}
                </p>
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
