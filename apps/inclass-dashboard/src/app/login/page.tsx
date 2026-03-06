'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { GoogleLogin } from '@react-oauth/google'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { login, demoLogin } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential: credentialResponse.credential }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Google 登入失敗')
        return
      }
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user))
      if (data.school) localStorage.setItem('school', JSON.stringify(data.school))
      router.push('/dashboard')
    } catch {
      setError('Google 登入失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '登入失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setError('')
    setLoading(true)

    try {
      await demoLogin()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Demo 登入失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', padding: '20px' }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', maxWidth: '400px', width: '100%', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <div style={{ fontSize: '56px', marginBottom: 'var(--space-sm)' }} className="animate-float">🐝</div>
          <h1 style={{ fontSize: '28px', color: 'var(--primary)', fontWeight: 'bold', margin: 0 }}>蜂神榜 Ai 點名系統</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: 'var(--space-xs)' }}>AI 驅動的補習班點名系統</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-sm)', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '14px' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '16px', outline: 'none', transition: 'border 0.2s' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-sm)', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '14px' }}>密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '16px', outline: 'none', transition: 'border 0.2s' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {error && (
            <div style={{ background: 'var(--error)', color: 'white', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-lg)', fontSize: '14px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-sm)', background: loading ? 'var(--text-secondary)' : 'var(--accent)', color: 'white', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>

        {/* Register Link */}
        <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: '14px', color: 'var(--text-secondary)' }}>
          還沒有帳號？{' '}
          <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none' }}>
            註冊補習班
          </Link>
        </div>

        {/* Google Login */}
        <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>或使用 Google 帳號登入</p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google 登入失敗，請稍後再試')}
              locale="zh-TW"
            />
          </div>
        </div>

        {/* Demo Login Button */}
        <div style={{ textAlign: 'center', marginTop: 'var(--space-xl)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
            想先看看系統長什麼樣子？
          </p>
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '12px', 
              borderRadius: 'var(--radius-sm)', 
              background: 'var(--surface)', 
              color: 'var(--primary)', 
              border: '2px solid var(--primary)',
              fontSize: '14px', 
              fontWeight: 'bold', 
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            🚀 體驗 Demo（唯讀展示）
          </button>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 'var(--space-sm)' }}>
            示範帳號，無法進行實際操作
          </p>
        </div>

        {/* 返回首頁 */}
        <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)' }}>
          <Link href="/landing" style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none' }}>
            ← 返回首頁
          </Link>
        </div>
      </div>
    </div>
  )
}
