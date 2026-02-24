'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 直接呼叫後端 API（production 環境）
const API_BASE = 'https://cram94-manage-backend-1015149159553.asia-east1.run.app'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
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

      // API 回應格式: { success, data: { token, user } }
      const responseData = data.data || data
      const token = responseData.token
      const userData = responseData.user

      if (!token || !userData) {
        setError('登入回應格式錯誤')
        setLoading(false)
        return
      }

      // 儲存 token 和用戶資訊
      localStorage.setItem('token', token)
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
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err?.message || err?.toString() || '無法連接伺服器')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-3xl p-6 border border-border shadow-sm">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center text-2xl mb-3">
              🐝
            </div>
            <h1 className="text-xl font-semibold text-text">蜂神榜管理後台</h1>
            <p className="text-sm text-text-muted mt-1">請輸入帳號密碼登入系統</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">帳號</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="輸入帳號"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">密碼</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="輸入密碼"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {loading ? '登入中...' : '登入'}
            </button>
          </form>

          <div className="text-center mt-4 pt-4 border-t border-border">
            <button
              onClick={() => router.push('/demo')}
              className="text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              🎬 想要快速體驗 Demo？
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
