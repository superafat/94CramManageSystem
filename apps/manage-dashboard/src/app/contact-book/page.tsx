'use client'

import { BackButton } from '@/components/ui/BackButton'
import { useCallback, useEffect, useState } from 'react'

const API_BASE = ''

type MessageType = 'progress' | 'homework' | 'tip' | 'photo' | 'feedback'

interface Class {
  id: string
  name: string
}

interface Student {
  id: string
  full_name: string
}

interface Reply {
  id: string
  author_name: string
  content: string
  created_at: string
  is_teacher: boolean
}

interface Message {
  id: string
  type: MessageType
  title: string
  content: string
  class_name: string
  student_name: string | null
  created_at: string
  read_count: number
  total_count: number
  replies: Reply[]
}

const TYPE_CONFIG: Record<MessageType, { icon: string; label: string; color: string; bg: string }> = {
  progress: { icon: '📈', label: '學習進度', color: 'text-morandi-sage', bg: 'bg-morandi-sage/10' },
  homework: { icon: '📝', label: '作業通知', color: 'text-primary', bg: 'bg-primary/10' },
  tip:      { icon: '💡', label: '小叮嚀',   color: 'text-morandi-gold', bg: 'bg-morandi-gold/10' },
  photo:    { icon: '📸', label: '照片分享', color: 'text-morandi-rose', bg: 'bg-morandi-rose/10' },
  feedback: { icon: '💬', label: '家長反饋', color: 'text-[#7B7BA8]', bg: 'bg-[#7B7BA8]/10' },
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return '剛剛'
  if (diffMins < 60) return `${diffMins} 分鐘前`
  if (diffHours < 24) return `${diffHours} 小時前`
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays} 天前`
  return date.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })
}

// Mock data for development (API will replace this)
const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    type: 'progress',
    title: '本週學習進度報告',
    content: '本週完成了二次函數的基礎教學，同學們表現優異，請在家多複習課堂筆記。',
    class_name: '國三數學班',
    student_name: null,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    read_count: 12,
    total_count: 15,
    replies: [
      { id: 'r1', author_name: '陳媽媽', content: '謝謝老師，小明回家有認真複習！', created_at: new Date(Date.now() - 1800000).toISOString(), is_teacher: false },
    ],
  },
  {
    id: '2',
    type: 'homework',
    title: '週末作業提醒',
    content: '請完成練習冊第 45-47 頁，明天上課前繳交。',
    class_name: '國三數學班',
    student_name: '陳小明',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    read_count: 1,
    total_count: 1,
    replies: [],
  },
  {
    id: '3',
    type: 'tip',
    title: '考試注意事項',
    content: '下週三有月考，請記得攜帶計算機及文具，考試範圍為第一至四章。',
    class_name: '國三數學班',
    student_name: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    read_count: 14,
    total_count: 15,
    replies: [],
  },
  {
    id: '4',
    type: 'photo',
    title: '課堂活動照片',
    content: '今天的分組討論活動非常熱烈，孩子們都很積極參與！',
    class_name: '國三數學班',
    student_name: null,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    read_count: 10,
    total_count: 15,
    replies: [
      { id: 'r2', author_name: '林爸爸', content: '好棒！孩子回家說今天很開心', created_at: new Date(Date.now() - 150000000).toISOString(), is_teacher: false },
      { id: 'r3', author_name: '王老師', content: '謝謝家長的支持，孩子們真的很棒！', created_at: new Date(Date.now() - 140000000).toISOString(), is_teacher: true },
    ],
  },
  {
    id: '5',
    type: 'feedback',
    title: '家長意見回饋',
    content: '請問老師，孩子最近上課狀況如何？在家練習有什麼需要特別注意的地方嗎？',
    class_name: '國三數學班',
    student_name: '林小華',
    created_at: new Date(Date.now() - 259200000).toISOString(),
    read_count: 1,
    total_count: 1,
    replies: [],
  },
]

const MOCK_CLASSES: Class[] = [
  { id: 'c1', name: '國三數學班' },
  { id: 'c2', name: '國二英文班' },
  { id: 'c3', name: '國一理化班' },
]

const MOCK_STUDENTS: Record<string, Student[]> = {
  c1: [{ id: 's1', full_name: '陳小明' }, { id: 's2', full_name: '林小華' }, { id: 's3', full_name: '王大成' }],
  c2: [{ id: 's4', full_name: '張小美' }, { id: 's5', full_name: '李小龍' }],
  c3: [{ id: 's6', full_name: '趙小雨' }, { id: 's7', full_name: '劉小安' }],
}

export default function ContactBookPage() {
  const [activeTab, setActiveTab] = useState<MessageType>('progress')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<MessageType>('progress')
  const [formClass, setFormClass] = useState('')
  const [formStudent, setFormStudent] = useState('all')
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Reply state
  const [expandedReply, setExpandedReply] = useState<string | null>(null)
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [replySubmitting, setReplySubmitting] = useState<string | null>(null)

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ type: activeTab, limit: '50' })
      const res = await fetch(`${API_BASE}/api/w8/contact-book?${params}`, {
        credentials: 'include',
      })
      if (res.ok) {
        const json = await res.json()
        const payload = json.data ?? json
        setMessages(payload.messages || [])
      } else {
        // Fall back to mock data in development
        setMessages(MOCK_MESSAGES.filter(m => m.type === activeTab))
      }
    } catch {
      setMessages(MOCK_MESSAGES.filter(m => m.type === activeTab))
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  const loadClasses = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/classes?limit=50`, { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        const payload = json.data ?? json
        setClasses(payload.classes || [])
      } else {
        setClasses(MOCK_CLASSES)
      }
    } catch {
      setClasses(MOCK_CLASSES)
    }
  }, [])

  useEffect(() => { loadMessages() }, [loadMessages])
  useEffect(() => { loadClasses() }, [loadClasses])

  useEffect(() => {
    if (!formClass) { setStudents([]); return }
    const fetchStudents = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/students?class_id=${formClass}&limit=100`, { credentials: 'include' })
        if (res.ok) {
          const json = await res.json()
          const payload = json.data ?? json
          setStudents(payload.students || [])
        } else {
          setStudents(MOCK_STUDENTS[formClass] || [])
        }
      } catch {
        setStudents(MOCK_STUDENTS[formClass] || [])
      }
    }
    fetchStudents()
  }, [formClass])

  const handleSubmit = async () => {
    if (!formClass || !formTitle.trim() || !formContent.trim()) {
      setSubmitError('請填寫所有必填欄位')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const body = {
        type: formType,
        class_id: formClass,
        student_id: formStudent === 'all' ? null : formStudent,
        title: formTitle.trim(),
        content: formContent.trim(),
      }
      const res = await fetch(`${API_BASE}/api/w8/contact-book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('發送失敗')
      // Reset form
      setFormType('progress')
      setFormClass('')
      setFormStudent('all')
      setFormTitle('')
      setFormContent('')
      setShowForm(false)
      // Reload if current tab matches
      if (activeTab === formType) await loadMessages()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '發送失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReply = async (messageId: string) => {
    const text = replyText[messageId]?.trim()
    if (!text) return
    setReplySubmitting(messageId)
    try {
      const res = await fetch(`${API_BASE}/api/w8/contact-book/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message_id: messageId, content: text }),
      })
      if (!res.ok) throw new Error('回覆失敗')
      setReplyText(prev => ({ ...prev, [messageId]: '' }))
      setExpandedReply(null)
      await loadMessages()
    } catch {
      // Optimistically add reply to UI even if API fails (development)
      const newReply: Reply = {
        id: `temp-${Date.now()}`,
        author_name: '王老師',
        content: text,
        created_at: new Date().toISOString(),
        is_teacher: true,
      }
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, replies: [...m.replies, newReply] } : m
      ))
      setReplyText(prev => ({ ...prev, [messageId]: '' }))
      setExpandedReply(null)
    } finally {
      setReplySubmitting(null)
    }
  }

  const tabs: MessageType[] = ['progress', 'homework', 'tip', 'photo', 'feedback']

  return (
    <div className="space-y-5 pb-10">
      <BackButton fallbackUrl="/dashboard" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">電子聯絡簿</h1>
          <p className="text-text-muted mt-1">發布學習進度、作業、照片給家長</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <span>+</span>
          <span className="hidden sm:inline">新增訊息</span>
        </button>
      </div>

      {/* Compose Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-border overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text">新增聯絡簿訊息</h2>
              <button
                onClick={() => { setShowForm(false); setSubmitError(null) }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:bg-surface transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Message Type */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">訊息類型</label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {tabs.map(t => {
                    const cfg = TYPE_CONFIG[t]
                    return (
                      <button
                        key={t}
                        onClick={() => setFormType(t)}
                        className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                          formType === t
                            ? `${cfg.bg} ${cfg.color} border-current`
                            : 'border-border text-text-muted hover:border-primary/50 hover:text-text'
                        }`}
                      >
                        <span className="text-lg">{cfg.icon}</span>
                        <span>{cfg.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Class selector */}
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  選擇班級 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formClass}
                  onChange={e => { setFormClass(e.target.value); setFormStudent('all') }}
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">請選擇班級</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Student selector */}
              {formClass && (
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">指定學生</label>
                  <select
                    value={formStudent}
                    onChange={e => setFormStudent(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="all">全班同學</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.full_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  標題 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="輸入訊息標題"
                  maxLength={100}
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  內容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  placeholder="輸入聯絡簿內容..."
                  rows={4}
                  maxLength={2000}
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="text-xs text-text-muted mt-1 text-right">{formContent.length}/2000</p>
              </div>

              {submitError && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
                  {submitError}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-border">
              <button
                onClick={() => { setShowForm(false); setSubmitError(null) }}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm text-text-muted hover:bg-surface transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !formClass || !formTitle.trim() || !formContent.trim()}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {submitting ? '發送中...' : '發送訊息'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(t => {
          const cfg = TYPE_CONFIG[t]
          return (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab === t
                  ? `bg-primary text-white shadow-sm`
                  : 'bg-surface border border-border text-text-muted hover:border-primary/50 hover:text-text'
              }`}
            >
              <span>{cfg.icon}</span>
              <span>{cfg.label}</span>
            </button>
          )
        })}
      </div>

      {/* Message List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-surface-hover animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-5xl">{TYPE_CONFIG[activeTab].icon}</div>
          <p className="text-text-muted">尚無{TYPE_CONFIG[activeTab].label}訊息</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            新增第一則訊息
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map(msg => {
            const cfg = TYPE_CONFIG[msg.type]
            const readPct = msg.total_count > 0 ? Math.round((msg.read_count / msg.total_count) * 100) : 0
            const isReplyExpanded = expandedReply === msg.id

            return (
              <div key={msg.id} className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
                {/* Message header */}
                <div className="p-4 sm:p-5">
                  <div className="flex gap-3">
                    {/* Type icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg ${cfg.bg}`}>
                      {cfg.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-text leading-tight">{msg.title}</h3>
                        <span className="text-xs text-text-muted whitespace-nowrap flex-shrink-0">
                          {formatRelativeTime(msg.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-text-muted leading-relaxed">{msg.content}</p>

                      {/* Meta row */}
                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        <span className="text-xs bg-background px-2 py-1 rounded-md text-text-muted">
                          {msg.class_name}
                        </span>
                        {msg.student_name && (
                          <span className="text-xs bg-background px-2 py-1 rounded-md text-text-muted">
                            {msg.student_name}
                          </span>
                        )}

                        {/* Read rate */}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-morandi-sage rounded-full transition-all"
                              style={{ width: `${readPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-text-muted">
                            {msg.read_count}/{msg.total_count} 已讀
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Replies section */}
                {(msg.replies.length > 0 || activeTab === 'feedback') && (
                  <div className="border-t border-border">
                    {msg.replies.length > 0 && (
                      <div className="px-4 sm:px-5 py-3 space-y-3">
                        {msg.replies.map(reply => (
                          <div key={reply.id} className={`flex gap-2.5 ${reply.is_teacher ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                              reply.is_teacher ? 'bg-primary/10 text-primary' : 'bg-morandi-rose/10 text-morandi-rose'
                            }`}>
                              {reply.is_teacher ? '師' : '家'}
                            </div>
                            <div className={`max-w-[75%] ${reply.is_teacher ? 'items-end' : 'items-start'} flex flex-col`}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-xs text-text-muted">{reply.author_name}</span>
                                <span className="text-xs text-text-muted/60">{formatRelativeTime(reply.created_at)}</span>
                              </div>
                              <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${
                                reply.is_teacher
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-surface-hover text-text'
                              }`}>
                                {reply.content}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Teacher reply input */}
                    <div className="px-4 sm:px-5 py-3 border-t border-border/50">
                      {isReplyExpanded ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={replyText[msg.id] || ''}
                            onChange={e => setReplyText(prev => ({ ...prev, [msg.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(msg.id) } }}
                            placeholder="輸入回覆內容..."
                            autoFocus
                            className="flex-1 px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <button
                            onClick={() => handleReply(msg.id)}
                            disabled={replySubmitting === msg.id || !replyText[msg.id]?.trim()}
                            className="px-3 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors whitespace-nowrap"
                          >
                            {replySubmitting === msg.id ? '...' : '送出'}
                          </button>
                          <button
                            onClick={() => setExpandedReply(null)}
                            className="px-3 py-2 border border-border rounded-xl text-sm text-text-muted hover:bg-surface transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setExpandedReply(msg.id)}
                          className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                        >
                          <span>💬</span>
                          <span>回覆家長</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
