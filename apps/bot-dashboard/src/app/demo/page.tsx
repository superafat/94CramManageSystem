'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const API_BASE = ''

const DEMO_ACCOUNTS = [
  { username: 'boss', role: '館長', icon: '👔', desc: '完整功能、設定、方案' },
  { username: 'staff', role: '行政', icon: '📋', desc: '對話紀錄、綁定管理' },
  { username: 'boss2', role: '館長', icon: '👔', desc: '蜂神榜2（資料隔離）' },
]

export default function DemoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)

  const handleDemoLogin = async (account: typeof DEMO_ACCOUNTS[0]) => {
    setSelectedAccount(account.username)
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_BASE}/api/auth/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: account.username })
      })

      const data = await res.json().catch(() => {
        throw new Error('API 回應格式錯誤')
      })

      if (!res.ok) {
        setError(data.error?.message || data.error || '登入失敗')
        setLoading(false)
        return
      }

      const responseData = data.data || data
      const userData = responseData.user

      if (!userData) {
        setError('登入回應格式錯誤')
        setLoading(false)
        return
      }

      localStorage.setItem('user', JSON.stringify(userData))
      localStorage.setItem('tenantId', userData.tenant_id)
      if (responseData.token) localStorage.setItem('token', responseData.token)
      router.push('/dashboard')
    } catch (err) {
      console.error('Demo login error:', err)
      setError(err instanceof Error ? err.message : '無法連接伺服器')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-3xl p-6 border border-border shadow-sm">
          <div className="text-center mb-6">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text mb-4"
            >
              ← 返回首頁
            </button>
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center text-2xl mb-3">
              🎬
            </div>
            <h1 className="text-xl font-semibold text-text">Demo 體驗</h1>
            <p className="text-sm text-text-muted mt-1">選擇角色快速體驗 LINE Bot 管理功能</p>
          </div>

          <div className="mb-6">
            <p className="text-xs text-text-muted mb-3 text-center">👇 點擊角色立即體驗</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.username}
                  onClick={() => handleDemoLogin(account)}
                  disabled={loading}
                  className={`p-3 rounded-xl border text-left transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-50 ${
                    selectedAccount === account.username ? 'border-primary bg-primary/10' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{account.icon}</span>
                    <span className="font-medium text-sm text-text">{account.role}</span>
                  </div>
                  <p className="text-xs text-text-muted truncate">{account.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <p className="text-sm text-text-muted mt-2">正在進入系統...</p>
            </div>
          )}

          <div className="text-center pt-4 border-t border-border">
            <button
              onClick={() => router.push('/login')}
              className="text-sm text-primary hover:underline"
            >
              使用正式帳號登入 →
            </button>
          </div>

          <p className="text-center text-xs text-text-muted mt-4">
            💡 所有 Demo 帳號密碼都是 <strong>demo</strong>
          </p>
        </div>
      </div>
    </div>
  )
}
