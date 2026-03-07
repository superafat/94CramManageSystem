'use client'

import { useEffect, useState } from 'react'

interface Invite {
  id: string
  code: string
  student_name?: string
  created_at: string
  status: 'available' | 'used'
}

interface Binding {
  id: string
  student_id: string
  student_name: string
  bound_at: string
  platform_id?: string
}

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}

export default function AiTutorInvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([])
  const [bindings, setBindings] = useState<Binding[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/ai-tutor/invites', { credentials: 'include' })
        .then(r => r.json())
        .catch(() => []),
      fetch('/api/ai-tutor/bindings', { credentials: 'include' })
        .then(r => r.json())
        .catch(() => []),
    ]).then(([inviteData, bindingData]) => {
      setInvites(inviteData.data ?? inviteData ?? [])
      setBindings(bindingData.data ?? bindingData ?? [])
      setLoading(false)
    })
  }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    setIsError(false)
    try {
      const res = await fetch('/api/ai-tutor/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const newInvite: Invite = data.data ?? data
      setInvites(prev => [newInvite, ...prev])
      setMessage('邀請碼已產生')
    } catch {
      setMessage('產生失敗，請稍後再試')
      setIsError(true)
    }
    setGenerating(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleDeleteInvite = async (invite: Invite) => {
    if (!confirm(`確定要刪除邀請碼 ${invite.code} 嗎？`)) return
    try {
      await fetch(`/api/ai-tutor/invites/${invite.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      setInvites(prev => prev.filter(i => i.id !== invite.id))
    } catch {
      setMessage('刪除失敗，請稍後再試')
      setIsError(true)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleUnbind = async (binding: Binding) => {
    if (!confirm(`確定要解除 ${binding.student_name} 的綁定嗎？`)) return
    try {
      await fetch(`/api/ai-tutor/bindings/${binding.student_id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      setBindings(prev => prev.filter(b => b.id !== binding.id))
    } catch {
      setMessage('解除失敗，請稍後再試')
      setIsError(true)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    })
  }

  if (loading) return <Loading />

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🔗</span>
        <div>
          <h1 className="text-2xl font-bold text-text">邀請管理</h1>
          <p className="text-sm text-text-muted">神算子 AI 課業助教</p>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-xl border ${
            isError ? 'bg-danger/10 border-danger/30' : 'bg-success/10 border-success/30'
          }`}
        >
          <p className="text-sm text-text">{message}</p>
        </div>
      )}

      {/* Generate Button */}
      <div className="mb-6">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          <span>+</span>
          <span>{generating ? '產生中...' : '產生邀請碼'}</span>
        </button>
      </div>

      {/* Active Invites */}
      <div className="bg-surface rounded-2xl border border-border p-6 mb-6">
        <h2 className="text-lg font-semibold text-text mb-4">
          邀請碼列表 ({invites.length})
        </h2>
        {invites.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-4">尚無邀請碼，點擊上方按鈕產生</p>
        ) : (
          <div className="space-y-3">
            {invites.map(invite => (
              <div
                key={invite.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-border"
              >
                {/* Invite Code */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-xl font-bold text-text tracking-widest">
                      {invite.code}
                    </span>
                    <button
                      onClick={() => handleCopy(invite.code)}
                      className="text-xs text-primary hover:underline"
                    >
                      {copiedCode === invite.code ? '已複製！' : '複製'}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        invite.status === 'used'
                          ? 'bg-success/10 text-success'
                          : 'bg-warning/10 text-warning'
                      }`}
                    >
                      {invite.status === 'used' ? '已使用' : '未使用'}
                    </span>
                    {invite.student_name && (
                      <span className="text-xs text-text-muted">學生：{invite.student_name}</span>
                    )}
                    <span className="text-xs text-text-muted">
                      建立：{new Date(invite.created_at).toLocaleDateString('zh-TW')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteInvite(invite)}
                  className="text-xs text-danger hover:underline px-3 py-1 shrink-0"
                >
                  刪除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bound Students */}
      <div className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text mb-4">
          已綁定學生 ({bindings.length})
        </h2>
        {bindings.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-4">尚無已綁定學生</p>
        ) : (
          <div className="space-y-3">
            {bindings.map(binding => (
              <div
                key={binding.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border"
              >
                <div>
                  <p className="font-medium text-sm text-text">{binding.student_name}</p>
                  <p className="text-xs text-text-muted">
                    LINE ID: {binding.platform_id ?? binding.student_id}
                    {' | 綁定：'}
                    {new Date(binding.bound_at).toLocaleDateString('zh-TW')}
                  </p>
                </div>
                <button
                  onClick={() => handleUnbind(binding)}
                  className="text-xs text-danger hover:underline px-3 py-1"
                >
                  解除綁定
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
