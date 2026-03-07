'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function StudentJoinPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const joinSession = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/classroom/session/join/${code.toUpperCase()}`)
      const data = await res.json()
      if (data.success) {
        router.push(`/classroom/student/${data.data.sessionId}`)
      } else {
        setError(data.error || '找不到課堂')
      }
    } catch {
      setError('連線失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 20, textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🎯</div>
      <h1 style={{ fontSize: 28, fontWeight: 'bold', color: 'var(--primary)', marginBottom: 8 }}>加入課堂互動</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 30 }}>輸入老師提供的課堂代碼</p>

      <input
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        placeholder="輸入代碼"
        maxLength={6}
        style={{ width: '100%', padding: '16px', fontSize: 32, textAlign: 'center', letterSpacing: 8, borderRadius: 'var(--radius-md)', border: '2px solid var(--border)', fontWeight: 'bold', boxSizing: 'border-box' }}
      />

      {error && <p style={{ color: '#E53E3E', fontSize: 14, marginTop: 8 }}>{error}</p>}

      <button
        onClick={joinSession}
        disabled={loading || code.length < 6}
        style={{ width: '100%', marginTop: 20, padding: 16, fontSize: 18, fontWeight: 'bold', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading || code.length < 6 ? 0.6 : 1 }}
      >
        {loading ? '加入中...' : '加入課堂'}
      </button>
    </div>
  )
}
