'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '帳號或密碼錯誤')
        return
      }

      // Store token in cookie
      document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
      router.push('/dashboard')
    } catch {
      setError('網路連線錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bot-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🤖</div>
          <h1 className="text-2xl font-bold text-[#4b4355]">蜂神榜 AI 補習班助手系統</h1>
          <p className="text-sm text-[#7b7387] mt-1">登入您的帳號</p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-[#d8d3de] shadow-sm p-6 space-y-5"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#4b4355] mb-1.5">
              電子信箱
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2.5 rounded-xl border border-[#d8d3de] bg-[#F5F0F7]/50 text-[#4b4355] placeholder-[#b0a8b8] focus:outline-none focus:ring-2 focus:ring-[#A89BB5]/40 focus:border-[#A89BB5] transition text-sm"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#4b4355] mb-1.5">
              密碼
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="請輸入密碼"
              className="w-full px-4 py-2.5 rounded-xl border border-[#d8d3de] bg-[#F5F0F7]/50 text-[#4b4355] placeholder-[#b0a8b8] focus:outline-none focus:ring-2 focus:ring-[#A89BB5]/40 focus:border-[#A89BB5] transition text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#A89BB5] hover:bg-[#9688A3] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition text-sm"
          >
            {loading ? '登入中...' : '登入'}
          </button>

          <p className="text-center text-xs text-[#7b7387]">
            使用您的 94Manage 帳號即可登入
          </p>
        </form>

        {/* Back to home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-[#A89BB5] hover:text-[#9688A3] transition">
            ← 返回首頁
          </Link>
        </div>
      </div>
    </div>
  )
}
