'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const API_BASE = ''

// Demo 帳號列表（展示不同角色）
const DEMO_ACCOUNTS = [
  { username: 'boss', password: 'demo', role: '館長', icon: '👔', desc: '完整功能、報表、設定', tenant: '11111111-1111-1111-1111-111111111111' },
  { username: 'staff', password: 'demo', role: '行政', icon: '📋', desc: '學生、帳務、排課', tenant: '11111111-1111-1111-1111-111111111111' },
  { username: 'teacher2', password: 'demo', role: '教師', icon: '👨‍🏫', desc: '點名、成績', tenant: '11111111-1111-1111-1111-111111111111' },
  { username: 'parent2', password: 'demo', role: '家長', icon: '👨‍👩‍👧', desc: '查看孩子資料', tenant: '11111111-1111-1111-1111-111111111111' },
  { username: 'student', password: 'demo', role: '學生', icon: '🎒', desc: '查看自己課表', tenant: '11111111-1111-1111-1111-111111111111' },
  { username: 'boss2', password: 'demo', role: '館長', icon: '👔', desc: '蜂神榜2（資料隔離）', tenant: '22222222-2222-2222-2222-222222222222' },
]

export default function DemoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<typeof DEMO_ACCOUNTS[0] | null>(null)

  const handleDemoLogin = async (account: typeof DEMO_ACCOUNTS[0]) => {
    setSelectedAccount(account)
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_BASE}/api/auth/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: account.username })
      })

      const data = await res.json().catch(err => {
        console.error('JSON parse error:', err)
        throw new Error('API 回應格式錯誤')
      })

      if (!res.ok) {
        setError(data.error?.message || data.error || '登入失敗')
        setLoading(false)
        return
      }

      // API 回應格式: { success, data: { user } }（token 由後端設為 HttpOnly cookie）
      const responseData = data.data || data
      const userData = responseData.user

      if (!userData) {
        setError('登入回應格式錯誤')
        setLoading(false)
        return
      }

      // 儲存用戶資訊（token 由 HttpOnly cookie 管理）
      localStorage.setItem('user', JSON.stringify(userData))
      localStorage.setItem('tenantId', userData.tenant_id)
      localStorage.setItem('branchId', userData.branch_id || '')

      // 根據角色導向不同首頁
      const role = userData.role
      const homePages: Record<string, string> = {
        superadmin: '/dashboard',
        admin: '/dashboard',
        staff: '/students',
        teacher: '/schedules',
        parent: '/my-children',
        student: '/my-schedule',
      }
      router.push(homePages[role] || '/dashboard')
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
            <p className="text-sm text-text-muted mt-1">選擇角色快速體驗系統功能</p>
          </div>

          {/* 快速登入按鈕 */}
          <div className="mb-6">
            <p className="text-xs text-text-muted mb-3 text-center">👇 點擊角色立即體驗</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.username}
                  onClick={() => handleDemoLogin(account)}
                  disabled={loading}
                  className={`p-3 rounded-xl border text-left transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-50 ${
                    selectedAccount?.username === account.username ? 'border-primary bg-primary/10' : 'border-border'
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
