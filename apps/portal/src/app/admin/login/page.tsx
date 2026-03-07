'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setToken } from '@/lib/auth'
import { DEMO_SUPERADMIN_ID } from '@/lib/demo-data'
import { GoogleLogin } from '@react-oauth/google'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDemoLogin = () => {
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const payload = btoa(JSON.stringify({
      userId: DEMO_SUPERADMIN_ID,
      name: '平台管理員',
      email: 'admin@94cram.com',
      role: 'superadmin',
      exp: Math.floor(Date.now() / 1000) + 86400,
    })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const demoToken = `${header}.${payload}.demo-signature`
    setToken(demoToken)
    router.push('/admin')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/platform/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 401) {
          setError('帳號或密碼錯誤')
        } else if (res.status === 403) {
          setError('權限不足')
        } else {
          setError(data.message || '登入失敗，請稍後再試')
        }
        return
      }

      router.push('/admin')
    } catch {
      setError('網路錯誤，請確認連線狀態')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/platform/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(res.status === 403 ? '權限不足，此入口僅供超級管理員使用' : (data.message || 'Google 登入失敗'))
        return
      }
      router.push('/admin')
    } catch {
      setError('Google 登入失敗，請確認連線狀態')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#F5F0EB' }}
    >
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#8FA895] text-white text-2xl mb-3">
              🐝
            </div>
            <h1 className="text-xl font-bold text-gray-800">總後台登入</h1>
            <p className="text-sm text-gray-500 mt-1">94cram 平台管理系統</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                電子信箱
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="請輸入電子信箱"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]/40 focus:border-[#8FA895] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                密碼
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="請輸入密碼"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]/40 focus:border-[#8FA895] transition-colors"
              />
            </div>

            {error && (
              <div
                className="text-sm px-4 py-2.5 rounded-lg"
                style={{ backgroundColor: '#B5706E15', color: '#B5706E' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-white text-sm font-medium transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#8FA895' }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.opacity = '0.9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1'
              }}
            >
              {loading ? '登入中...' : '登入'}
            </button>

            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-2 rounded-lg border border-gray-200 text-gray-400 text-xs font-normal hover:bg-gray-50 transition-colors"
            >
              Demo 模式（不連接後端）
            </button>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400 text-center mb-3">或使用 Google 帳號登入</p>
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google 登入失敗，請稍後再試')}
                  locale="zh-TW"
                />
              </div>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 94cram.com · 蜂神榜 Ai 教育科技
        </p>
      </div>
    </div>
  )
}
