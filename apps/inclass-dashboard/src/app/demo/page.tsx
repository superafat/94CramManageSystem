'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

// 94inClass = 教學與學員服務端，六種角色
const DEMO_ACCOUNTS = [
  { username: 'boss', role: '館長', icon: '👔', desc: '完整功能、報表、設定' },
  { username: 'staff', role: '行政', icon: '📋', desc: '學生、點名、成績' },
  { username: 'teacher', role: '教師', icon: '👨\u200D🏫', desc: '點名、成績、課表' },
  { username: 'student', role: '學生', icon: '🎒', desc: '課表、成績、出勤' },
  { username: 'parent', role: '家長', icon: '👨\u200D👩\u200D👧', desc: '孩子出勤、成績、繳費' },
  { username: 'boss2', role: '館長', icon: '👔', desc: '蜂神榜2（資料隔離）' },
]

export default function DemoPage() {
  const router = useRouter()
  const { demoLogin } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)

  const handleDemoLogin = async (account: typeof DEMO_ACCOUNTS[0]) => {
    setSelectedAccount(account.username)
    setLoading(true)
    setError('')

    try {
      await demoLogin(account.username)
    } catch (err) {
      console.error('Demo login error:', err)
      setError(err instanceof Error ? err.message : 'Demo 登入失敗')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #E8F4F8 0%, #D4E8F0 100%)', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <div style={{ background: 'white', borderRadius: '24px', padding: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <button
              onClick={() => router.push('/')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '16px' }}
            >
              ← 返回首頁
            </button>
            <div style={{ width: '56px', height: '56px', margin: '0 auto', borderRadius: '16px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '12px' }}>
              🎬
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>Demo 體驗</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>選擇角色快速體驗系統功能</p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', textAlign: 'center' }}>👇 點擊角色立即體驗</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.username}
                  onClick={() => handleDemoLogin(account)}
                  disabled={loading}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: selectedAccount === account.username ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: selectedAccount === account.username ? 'rgba(143,169,184,0.1)' : 'white',
                    textAlign: 'left',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '18px' }}>{account.icon}</span>
                    <span style={{ fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)' }}>{account.role}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ marginBottom: '16px', padding: '12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px' }}>
              <p style={{ fontSize: '14px', color: '#DC2626' }}>{error}</p>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '2px solid transparent', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px' }}>正在進入系統...</p>
            </div>
          )}

          <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => router.push('/login')}
              style={{ fontSize: '14px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none' }}
            >
              使用正式帳號登入 →
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '16px' }}>
            💡 所有 Demo 帳號密碼都是 <strong>demo</strong>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
