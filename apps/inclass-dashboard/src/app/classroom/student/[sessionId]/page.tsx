'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'

type Activity = {
  id: string; type: string; question: string; options: string[] | null
  correctAnswer: string | null; status: string
}

export default function StudentSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null)
  const [answered, setAnswered] = useState<Set<string>>(new Set())
  const [sessionEnded, setSessionEnded] = useState(false)
  const [rushAnswer, setRushAnswer] = useState('')
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    // Connect SSE
    const es = new EventSource(`/api/classroom/session/${sessionId}/stream`)

    es.addEventListener('new_activity', (e) => {
      const activity = JSON.parse(e.data)
      setCurrentActivity(activity)
      startTimeRef.current = Date.now()
    })

    es.addEventListener('activity_closed', (e) => {
      const data = JSON.parse(e.data)
      setCurrentActivity(prev => prev?.id === data.activity.id ? null : prev)
    })

    es.addEventListener('session_ended', () => {
      setSessionEnded(true)
    })

    es.addEventListener('random_pick', (e) => {
      const data = JSON.parse(e.data)
      setCurrentActivity({ ...data.activity, type: 'random_pick_result' })
    })

    return () => { es.close() }
  }, [sessionId])

  const submitAnswer = async (answer: string) => {
    if (!currentActivity || answered.has(currentActivity.id)) return
    const responseTime = Date.now() - startTimeRef.current

    await fetch(`/api/classroom/activity/${currentActivity.id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: '00000000-0000-0000-0000-000000000000', // placeholder - would come from auth
        answer,
        responseTime,
      }),
    })

    setAnswered(prev => new Set(prev).add(currentActivity.id))
  }

  if (sessionEnded) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>👋</div>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--primary)' }}>課堂已結束</h1>
        <p style={{ color: 'var(--text-secondary)' }}>感謝你的參與！</p>
      </div>
    )
  }

  if (!currentActivity) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>⏳</div>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--primary)' }}>等待老師發起活動</h1>
        <p style={{ color: 'var(--text-secondary)' }}>請保持此頁面開啟</p>
      </div>
    )
  }

  if (answered.has(currentActivity.id)) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--primary)' }}>已回答</h1>
        <p style={{ color: 'var(--text-secondary)' }}>等待老師公佈結果...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          {currentActivity.type === 'poll' ? '📊 投票' : currentActivity.type === 'quiz' ? '📝 測驗' : '⚡ 搶答'}
        </span>
        <h2 style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--text-primary)', margin: '8px 0' }}>{currentActivity.question}</h2>
      </div>

      {currentActivity.options ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(currentActivity.options as string[]).map((opt, i) => (
            <button key={i} onClick={() => submitAnswer(opt)} style={{ padding: 16, fontSize: 18, background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 500, textAlign: 'left', transition: 'all 0.2s' }}>
              {String.fromCharCode(65 + i)}. {opt}
            </button>
          ))}
        </div>
      ) : (
        <div>
          <input
            value={rushAnswer}
            onChange={e => setRushAnswer(e.target.value)}
            placeholder="輸入你的答案"
            style={{ width: '100%', padding: 16, fontSize: 18, borderRadius: 'var(--radius-md)', border: '2px solid var(--border)', marginBottom: 12, boxSizing: 'border-box' }}
          />
          <button onClick={() => submitAnswer(rushAnswer)} disabled={!rushAnswer} style={{ width: '100%', padding: 16, fontSize: 18, fontWeight: 'bold', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
            送出答案
          </button>
        </div>
      )}
    </div>
  )
}
