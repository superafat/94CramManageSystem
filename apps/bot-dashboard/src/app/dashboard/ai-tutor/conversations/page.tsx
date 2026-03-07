'use client'

import { useEffect, useState } from 'react'

type DateRange = 'today' | 'week' | 'month'

interface Message {
  role: 'student' | 'ai'
  content: string
  created_at: string
}

interface Conversation {
  id: string
  student_id: string
  student_name: string
  messages: Message[]
  subject?: string
  created_at: string
}

interface Binding {
  id: string
  student_id: string
  student_name: string
}

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: '今天',
  week: '本週',
  month: '本月',
}

export default function AiTutorConversationsPage() {
  const [bindings, setBindings] = useState<Binding[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [dateRange, setDateRange] = useState<DateRange>('today')
  const [loading, setLoading] = useState(true)
  const [convLoading, setConvLoading] = useState(false)

  useEffect(() => {
    fetch('/api/ai-tutor/bindings', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const list: Binding[] = data.data ?? data ?? []
        setBindings(list)
        if (list.length > 0) setSelectedStudentId(list[0].student_id)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedStudentId) return
    setConvLoading(true)
    fetch(
      `/api/ai-tutor/conversations?studentId=${selectedStudentId}&range=${dateRange}&limit=50`,
      { credentials: 'include' }
    )
      .then(r => r.json())
      .then(data => {
        setConversations(data.data ?? data ?? [])
        setConvLoading(false)
      })
      .catch(() => setConvLoading(false))
  }, [selectedStudentId, dateRange])

  if (loading) return <Loading />

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">💬</span>
        <div>
          <h1 className="text-2xl font-bold text-text">對話紀錄</h1>
          <p className="text-sm text-text-muted">神算子 AI 課業助教</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-48">
          <label className="block text-xs text-text-muted mb-1">選擇學生</label>
          <select
            value={selectedStudentId}
            onChange={e => setSelectedStudentId(e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {bindings.length === 0 && (
              <option value="">尚無綁定學生</option>
            )}
            {bindings.map(b => (
              <option key={b.student_id} value={b.student_id}>
                {b.student_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-text-muted mb-1">時間範圍</label>
          <div className="flex gap-1 bg-surface rounded-xl p-1 border border-border">
            {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  dateRange === range
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {DATE_RANGE_LABELS[range]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conversations */}
      {convLoading ? (
        <Loading />
      ) : conversations.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <p className="text-4xl mb-3">💬</p>
          <p className="font-medium">此時段沒有對話紀錄</p>
          <p className="text-sm mt-1">請選擇不同學生或時間範圍</p>
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map(conv => (
            <div key={conv.id} className="bg-surface rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-text">{conv.student_name}</span>
                  {conv.subject && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                      {conv.subject}
                    </span>
                  )}
                </div>
                <span className="text-xs text-text-muted">
                  {new Date(conv.created_at).toLocaleString('zh-TW')}
                </span>
              </div>

              <div className="space-y-3">
                {conv.messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                        msg.role === 'student'
                          ? 'bg-primary/10 text-text rounded-br-md'
                          : 'bg-border/50 text-text rounded-bl-md'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-xs text-text-muted mt-1 text-right">
                        {new Date(msg.created_at).toLocaleTimeString('zh-TW', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
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
