'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GoogleLogin } from '@react-oauth/google'

const API_BASE = ''

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
        credentials: 'include',
        body: JSON.stringify({ username, password })
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
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : '無法連接伺服器')
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential: credentialResponse.credential }),
      })
      const data = await res.json().catch(() => { throw new Error('API 回應格式錯誤') })
      if (!res.ok) {
        setError(data.error?.message || data.error || 'Google 登入失敗')
        return
      }
      const responseData = data.data || data
      const userData = responseData.user
      if (!userData) { setError('登入回應格式錯誤'); return }
      localStorage.setItem('user', JSON.stringify(userData))
      localStorage.setItem('tenantId', userData.tenant_id)
      if (responseData.token) localStorage.setItem('token', responseData.token)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google 登入失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="bg-surface rounded-3xl p-6 border border-border shadow-sm">
          <div className="text-center mb-6">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text mb-4"
            >
              ← 返回首頁
            </button>
            <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-50 flex items-center justify-center text-2xl mb-3">
              🤖
            </div>
            <h1 className="text-xl font-semibold text-text">94BOT 登入</h1>
            <p className="text-sm text-text-muted mt-1">LINE Bot 聞太師管理平台</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">帳號</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="請輸入帳號"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">密碼</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="請輸入密碼"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {loading ? '登入中...' : '登入'}
            </button>
          </form>

          <div className="text-center pt-4 mt-4 border-t border-border">
            <button
              onClick={() => router.push('/demo')}
              className="text-sm text-primary hover:underline"
            >
              免費體驗 Demo →
            </button>
          </div>

          <div className="pt-4 mt-4 border-t border-border">
            <p className="text-xs text-text-muted text-center mb-3">或使用 Google 帳號登入</p>
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google 登入失敗，請稍後再試')}
                locale="zh-TW"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
