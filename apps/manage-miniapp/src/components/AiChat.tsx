import { useState } from 'react'
import { API_BASE, BRANCH_ID, apiHeaders } from '../App'

interface Message {
  role: 'user' | 'ai'
  text: string
  ts: number
}

export default function AiChat({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: '👋 你好！我是補習班 AI 助手。可以問我課程、學費、排課等問題。', ts: Date.now() }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const send = async () => {
    if (!input.trim() || loading) return
    const q = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: q, ts: Date.now() }])
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/bot/ai-query`, {
        method: 'POST',
        headers: apiHeaders(),
        credentials: 'include',
        body: JSON.stringify({ query: q, branchId: BRANCH_ID, userId: 'miniapp' }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'ai', text: data.answer ?? '抱歉，出了點問題', ts: Date.now() }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: '❌ 連線失敗，請稍後再試', ts: Date.now() }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--cream)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white shadow-sm">
        <h2 className="font-bold" style={{ color: '#4a5568' }}>🤖 AI 助手</h2>
        <button onClick={onClose} className="text-2xl" style={{ color: 'var(--stone)' }}>✕</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
              msg.role === 'user' ? 'text-white' : 'bg-white shadow-sm'
            }`} style={msg.role === 'user' ? { background: 'var(--sage)' } : {}}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--sage)', animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--sage)', animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--sage)', animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="問我任何問題..."
          className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'var(--cream)' }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
          style={{ background: 'var(--sage)' }}
        >
          發送
        </button>
      </div>
    </div>
  )
}
