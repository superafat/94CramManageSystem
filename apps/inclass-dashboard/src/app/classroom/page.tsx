'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ClassroomPage() {
  const router = useRouter()
  const [courseId, setCourseId] = useState('')
  const [loading, setLoading] = useState(false)

  const startSession = async () => {
    if (!courseId) return
    setLoading(true)
    try {
      const res = await fetch('/api/classroom/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      })
      const data = await res.json()
      if (data.success) {
        router.push(`/classroom/${data.data.id}`)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 20 }}>
      <h1 style={{ fontSize: 28, fontWeight: 'bold', color: 'var(--primary)', marginBottom: 20 }}>
        🎯 即時課堂互動
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 30 }}>
        開始一個互動課堂 session，讓學生用手機即時參與投票、測驗、搶答。
      </p>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: 'var(--text-primary)' }}>
          課程 ID
        </label>
        <input
          type="text"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          placeholder="輸入課程 UUID"
          style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 16 }}
        />
      </div>

      <button
        onClick={startSession}
        disabled={loading || !courseId}
        style={{
          width: '100%', padding: '14px', fontSize: 18, fontWeight: 'bold',
          background: 'var(--primary)', color: 'white', border: 'none',
          borderRadius: 'var(--radius-md)', cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading || !courseId ? 0.6 : 1,
        }}
      >
        {loading ? '啟動中...' : '🚀 開始互動課堂'}
      </button>
    </div>
  )
}
