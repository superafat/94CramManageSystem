'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DEMO_ACCOUNTS = [
  { username: 'boss', role: '館長', icon: '👔', desc: '完整功能、採購審核、報表' },
  { username: 'staff', role: '行政', icon: '📋', desc: '進出貨、調撥、庫存管理' },
  { username: 'warehouse', role: '倉管', icon: '📦', desc: '盤點、條碼、進出貨' },
  { username: 'boss2', role: '館長2', icon: '🏢', desc: '蜂神榜2（資料隔離）' },
]

export default function DemoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)

  const handleDemoLogin = async (username: string) => {
    setSelectedAccount(username)
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username }),
      })

      const data = await res.json().catch(() => {
        throw new Error('API 回應格式錯誤')
      })

      if (!res.ok) {
        setError(data.error?.message || '登入失敗')
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
      localStorage.setItem('branchId', userData.branch_id || '')
      router.push('/dashboard')
    } catch (err) {
      console.error('Demo login error:', err)
      setError(err instanceof Error ? err.message : '無法連接伺服器')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F0EB] p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl p-6 border border-[#D8D1C6] shadow-sm">
          <div className="text-center mb-6">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-1 text-sm text-[#8B8B8B] hover:text-[#4B5C53] mb-4"
            >
              ← 返回首頁
            </button>
            <div className="text-5xl mb-3 animate-float">🐝</div>
            <h1 className="text-xl font-semibold text-[#4B5C53]">94Stock Demo 體驗</h1>
            <p className="text-sm text-[#8B8B8B] mt-1">選擇角色快速體驗庫存管理系統</p>
          </div>

          <div className="mb-6">
            <p className="text-xs text-[#8B8B8B] mb-3 text-center">👇 點擊角色立即體驗</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.username}
                  onClick={() => handleDemoLogin(account.username)}
                  disabled={loading}
                  className={`p-3 rounded-xl border text-left transition-all hover:border-[#8FA895] hover:bg-[#8FA895]/5 disabled:opacity-50 ${
                    selectedAccount === account.username ? 'border-[#8FA895] bg-[#8FA895]/10' : 'border-[#D8D1C6]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{account.icon}</span>
                    <span className="font-medium text-sm text-[#4B5C53]">{account.role}</span>
                  </div>
                  <p className="text-xs text-[#8B8B8B] truncate">{account.desc}</p>
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
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#8FA895]"></div>
              <p className="text-sm text-[#8B8B8B] mt-2">正在進入系統...</p>
            </div>
          )}

          <div className="text-center pt-4 border-t border-[#D8D1C6]">
            <button
              onClick={() => router.push('/login')}
              className="text-sm text-[#8FA895] hover:underline"
            >
              使用正式帳號登入 →
            </button>
          </div>

          <p className="text-center text-xs text-[#8B8B8B] mt-4">
            💡 Demo 模式為展示用，資料不會儲存
          </p>
        </div>
      </div>
    </div>
  )
}
