'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function RegisterPage() {
  const { register } = useAuth()
  const [schoolName, setSchoolName] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('密碼不一致')
      return
    }

    if (password.length < 6) {
      setError('密碼至少 6 個字元')
      return
    }

    setLoading(true)

    try {
      await register(schoolName, email, password, name)
    } catch (e: any) {
      setError(e.message || '註冊失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', padding: '20px' }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', maxWidth: '450px', width: '100%', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <div style={{ fontSize: '56px', marginBottom: 'var(--space-sm)' }} className="animate-float">🐝</div>
          <h1 style={{ fontSize: '28px', color: 'var(--primary)', fontWeight: 'bold', margin: 0 }}>註冊補習班</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: 'var(--space-xs)' }}>開始使用 蜂神榜 Ai 點名系統</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-sm)', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '14px' }}>補習班名稱</label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              required
              placeholder="例：小明補習班"
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '16px', outline: 'none' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-sm)', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '14px' }}>管理員姓名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="王小明"
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '16px', outline: 'none' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-sm)', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '14px' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '16px', outline: 'none' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-sm)', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '14px' }}>密碼（至少 6 字元）</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '16px', outline: 'none' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-sm)', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '14px' }}>確認密碼</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '16px', outline: 'none' }}
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
            {loading ? '註冊中...' : '註冊'}
          </button>
        </form>

        {/* Login Link */}
        <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: '14px', color: 'var(--text-secondary)' }}>
          已有帳號？{' '}
          <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none' }}>
            登入
          </Link>
        </div>

        {/* 返回首頁 */}
        <div style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}>
          <Link href="/landing" style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none' }}>
            ← 返回首頁
          </Link>
        </div>
      </div>
    </div>
  )
}
