'use client'

import { useEffect, useState } from 'react'

interface Binding {
  id: string
  line_user_id: string
  parent_name: string
  student_id: string
  student_name: string
  bound_at: string
}

interface Invite {
  id: string
  code: string
  student_id: string
  student_name: string
  created_at: string
  expires_at: string
  used_at: string | null
  status: string
}

export default function BindingsPage() {
  const [bindings, setBindings] = useState<Binding[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/parent-bindings', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/parent-invites', { credentials: 'include' }).then(r => r.json()),
    ]).then(([bindData, inviteData]) => {
      setBindings(bindData.data || bindData || [])
      setInvites(inviteData.data || inviteData || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleUnbind = async (binding: Binding) => {
    if (!confirm(`確定要解除 ${binding.parent_name} 的綁定嗎？`)) return
    await fetch(`/api/parent-bindings/${binding.line_user_id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    setBindings(bindings.filter(b => b.id !== binding.id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">綁定管理</h1>

      <div className="bg-surface rounded-2xl border border-border p-6 mb-6">
        <h2 className="text-lg font-semibold text-text mb-4">已綁定家長 ({bindings.length})</h2>
        {bindings.length > 0 ? (
          <div className="space-y-3">
            {bindings.map((binding) => (
              <div key={binding.id} className="flex items-center justify-between p-3 rounded-xl border border-border">
                <div>
                  <p className="font-medium text-sm text-text">{binding.parent_name}</p>
                  <p className="text-xs text-text-muted">
                    綁定學生：{binding.student_name} | {new Date(binding.bound_at).toLocaleDateString('zh-TW')}
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
        ) : (
          <p className="text-sm text-text-muted text-center py-4">尚無已綁定家長</p>
        )}
      </div>

      <div className="bg-surface rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text mb-4">邀請碼紀錄 ({invites.length})</h2>
        {invites.length > 0 ? (
          <div className="space-y-3">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-3 rounded-xl border border-border">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm font-mono text-primary bg-primary/5 px-2 py-0.5 rounded">{invite.code}</code>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      invite.status === 'used' ? 'bg-success/10 text-success' :
                      invite.status === 'pending' ? 'bg-warning/10 text-warning' :
                      'bg-danger/10 text-danger'
                    }`}>
                      {invite.status === 'used' ? '已使用' : invite.status === 'pending' ? '待使用' : '已過期'}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">
                    學生：{invite.student_name} | 建立：{new Date(invite.created_at).toLocaleDateString('zh-TW')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted text-center py-4">尚無邀請碼紀錄</p>
        )}
      </div>
    </div>
  )
}
