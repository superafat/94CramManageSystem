'use client'

import { useEffect, useState } from 'react'

type BotTab = 'clairvoyant' | 'windear' | 'ai-tutor' | 'wentaishi'

const TABS: { id: BotTab; label: string; icon: string }[] = [
  { id: 'clairvoyant', label: '千里眼', icon: '🔮' },
  { id: 'windear', label: '順風耳', icon: '👂' },
  { id: 'ai-tutor', label: '神算子', icon: '📐' },
  { id: 'wentaishi', label: '聞仲老師', icon: '📖' },
]

export default function BindingsPage() {
  const [tab, setTab] = useState<BotTab>('clairvoyant')

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">綁定管理</h1>

      <div className="flex gap-1 mb-6 bg-surface rounded-xl p-1 border border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text hover:bg-surface-hover'
            }`}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'clairvoyant' && <ClairvoyantBindings />}
      {tab === 'windear' && <WindearBindings />}
      {tab === 'ai-tutor' && <AiTutorBindings />}
      {tab === 'wentaishi' && <WentaishiBindings />}
    </div>
  )
}

function ClairvoyantBindings() {
  const [bindings, setBindings] = useState<any[]>([])
  const [codes, setCodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/bindings', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/bind-codes', { credentials: 'include' }).then((r) => r.json()),
    ]).then(([b, c]) => {
      setBindings(Array.isArray(b) ? b : [])
      setCodes(Array.isArray(c) ? c : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleGenCode = async () => {
    const res = await fetch('/api/bind-codes', { method: 'POST', credentials: 'include' })
    const data = await res.json()
    setCodes([data, ...codes])
  }

  const handleUnbind = async (userId: string) => {
    if (!confirm('確定要解除綁定嗎？')) return
    await fetch(`/api/bindings/${userId}`, { method: 'DELETE', credentials: 'include' })
    setBindings(bindings.filter((b) => b.telegram_user_id !== userId))
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <BindingsList title="已綁定用戶" items={bindings} idKey="telegram_user_id" nameKey="active_tenant_name" onUnbind={handleUnbind} />
      <div className="bg-surface rounded-2xl border border-border p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-text">綁定碼</h3>
          <button onClick={handleGenCode} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors">產生綁定碼</button>
        </div>
        {codes.slice(0, 5).map((c: any, i: number) => (
          <div key={i} className="flex justify-between py-2 border-b border-border last:border-0 text-sm">
            <span className="font-mono text-primary font-bold">{c.code}</span>
            <span className="text-text-muted">{c.used ? '已使用' : `有效至 ${new Date(c.expires_at).toLocaleString('zh-TW')}`}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function WindearBindings() {
  const [bindings, setBindings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/parent-bindings', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => { setBindings(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleUnbind = async (userId: string) => {
    if (!confirm('確定要解除綁定嗎？')) return
    await fetch(`/api/parent-bindings/${userId}`, { method: 'DELETE', credentials: 'include' })
    setBindings(bindings.filter((b) => b.telegram_user_id !== userId))
  }

  if (loading) return <Loading />
  return <BindingsList title="已綁定家長" items={bindings} idKey="telegram_user_id" nameKey="parent_name" onUnbind={handleUnbind} />
}

function AiTutorBindings() {
  const [bindings, setBindings] = useState<any[]>([])
  const [invites, setInvites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/ai-tutor/bindings', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/ai-tutor/invites', { credentials: 'include' }).then((r) => r.json()),
    ]).then(([b, inv]) => {
      setBindings(Array.isArray(b) ? b : [])
      setInvites(Array.isArray(inv) ? inv : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleUnbind = async (id: string) => {
    if (!confirm('確定要解除綁定嗎？')) return
    await fetch(`/api/ai-tutor/bindings/${id}`, { method: 'DELETE', credentials: 'include' })
    setBindings(bindings.filter((b) => b.id !== id))
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <BindingsList title="已綁定學生" items={bindings} idKey="id" nameKey="studentName" onUnbind={handleUnbind} />
      <div className="bg-surface rounded-2xl border border-border p-6">
        <h3 className="font-semibold text-text mb-4">邀請碼</h3>
        {invites.map((inv: any, i: number) => (
          <div key={i} className="flex justify-between py-2 border-b border-border last:border-0 text-sm">
            <div>
              <span className="font-mono text-primary font-bold">{inv.code}</span>
              <span className="text-text-muted ml-2">{inv.studentName}</span>
            </div>
            <span className="text-text-muted">{inv.used ? '已使用' : '未使用'}</span>
          </div>
        ))}
        {invites.length === 0 && <p className="text-sm text-text-muted">尚無邀請碼</p>}
      </div>
    </div>
  )
}

function WentaishiBindings() {
  return (
    <div className="bg-surface rounded-2xl border border-border p-12 text-center">
      <p className="text-4xl mb-4">📖</p>
      <h3 className="text-lg font-semibold text-text mb-2">LINE 綁定管理</h3>
      <p className="text-sm text-text-muted">聞仲老師的綁定透過 LINE 「綁定」指令完成，此處僅供查看。</p>
    </div>
  )
}

function BindingsList({ title, items, idKey, nameKey, onUnbind }: {
  title: string; items: any[]; idKey: string; nameKey: string; onUnbind: (id: string) => void
}) {
  return (
    <div className="bg-surface rounded-2xl border border-border p-6">
      <h3 className="font-semibold text-text mb-4">{title} ({items.length})</h3>
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border">
              <div>
                <p className="font-medium text-sm text-text">{item[nameKey] || 'Unknown'}</p>
                <p className="text-xs text-text-muted">ID: {item[idKey]}</p>
              </div>
              <button onClick={() => onUnbind(item[idKey])} className="text-xs text-danger hover:underline px-3 py-1">解除綁定</button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted text-center py-4">尚無綁定用戶</p>
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
