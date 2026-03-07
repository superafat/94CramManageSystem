'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Activity = {
  id: string; type: string; question: string; options: string[] | null
  correctAnswer: string | null; status: string; results: Record<string, number> | null; winnerId: string | null
}
type Session = { id: string; sessionCode: string; status: string; courseId: string }

export default function TeacherConsolePage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [responseCount, setResponseCount] = useState<Record<string, number>>({})
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<'poll' | 'quiz' | 'rush_answer'>('poll')
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [correctAnswer, setCorrectAnswer] = useState('')
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // Fetch session info
    fetch(`/api/classroom/session/${sessionId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setSession(d.data) })

    // Fetch activities
    fetch(`/api/classroom/session/${sessionId}/activities`)
      .then(r => r.json())
      .then(d => { if (d.success) setActivities(d.data) })

    // Connect SSE
    const es = new EventSource(`/api/classroom/session/${sessionId}/teacher-stream`)
    es.addEventListener('new_response', (e) => {
      const data = JSON.parse(e.data)
      setResponseCount(prev => ({
        ...prev,
        [data.activityId]: (prev[data.activityId] || 0) + 1
      }))
    })
    es.addEventListener('activity_closed', (e) => {
      const data = JSON.parse(e.data)
      setActivities(prev => prev.map(a => a.id === data.activity.id ? data.activity : a))
    })
    eventSourceRef.current = es

    return () => { es.close() }
  }, [sessionId])

  const createActivity = async () => {
    const body: Record<string, unknown> = { sessionId, type: formType, question }
    if (formType !== 'rush_answer') body.options = options.filter(Boolean)
    if (formType === 'quiz') body.correctAnswer = correctAnswer

    const res = await fetch('/api/classroom/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.success) {
      setActivities(prev => [data.data, ...prev])
      setShowForm(false)
      setQuestion('')
      setOptions(['', ''])
      setCorrectAnswer('')
    }
  }

  const closeActivity = async (activityId: string) => {
    const res = await fetch(`/api/classroom/activity/${activityId}/close`, { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      setActivities(prev => prev.map(a => a.id === activityId ? data.data : a))
    }
  }

  const endSession = async () => {
    await fetch(`/api/classroom/session/${sessionId}/end`, { method: 'POST' })
    router.push('/classroom')
  }

  if (!session) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>載入中...</div>

  return (
    <div style={{ maxWidth: 800, margin: '20px auto', padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--primary)', margin: 0 }}>🎯 教師控制台</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>Session: {session.sessionCode}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ background: 'var(--primary)', color: 'white', padding: '12px 24px', borderRadius: 'var(--radius-md)', fontSize: 24, fontWeight: 'bold', letterSpacing: 4 }}>
            {session.sessionCode}
          </div>
          <button onClick={endSession} style={{ padding: '12px 20px', background: '#E53E3E', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: 'pointer' }}>
            結束課堂
          </button>
        </div>
      </div>

      {/* Session code display */}
      <div style={{ background: 'linear-gradient(135deg, #E8F4F8, #D4E8F0)', padding: 20, borderRadius: 'var(--radius-lg)', textAlign: 'center', marginBottom: 24 }}>
        <p style={{ color: 'var(--text-secondary)', margin: '0 0 4px' }}>學生加入代碼</p>
        <p style={{ fontSize: 48, fontWeight: 'bold', color: 'var(--primary)', letterSpacing: 8, margin: 0 }}>{session.sessionCode}</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '8px 0 0' }}>學生輸入此代碼即可加入課堂互動</p>
      </div>

      {/* New activity button */}
      {!showForm && (
        <button onClick={() => setShowForm(true)} style={{ width: '100%', padding: 14, fontSize: 16, fontWeight: 'bold', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', marginBottom: 24 }}>
          ➕ 發起新活動
        </button>
      )}

      {/* Create activity form */}
      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', color: 'var(--primary)' }}>發起新活動</h3>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['poll', 'quiz', 'rush_answer'] as const).map(t => (
              <button key={t} onClick={() => setFormType(t)} style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', border: formType === t ? '2px solid var(--primary)' : '1px solid var(--border)', background: formType === t ? 'var(--primary)' : 'white', color: formType === t ? 'white' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 500 }}>
                {t === 'poll' ? '📊 投票' : t === 'quiz' ? '📝 測驗' : '⚡ 搶答'}
              </button>
            ))}
          </div>

          <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="題目" style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 16, marginBottom: 12, boxSizing: 'border-box' }} />

          {formType !== 'rush_answer' && (
            <div style={{ marginBottom: 12 }}>
              {options.map((opt, i) => (
                <input key={i} value={opt} onChange={e => { const n = [...options]; n[i] = e.target.value; setOptions(n) }} placeholder={`選項 ${i + 1}`} style={{ width: '100%', padding: 10, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 8, boxSizing: 'border-box' }} />
              ))}
              <button onClick={() => setOptions([...options, ''])} style={{ padding: '6px 12px', fontSize: 14, background: 'transparent', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-secondary)' }}>+ 新增選項</button>
            </div>
          )}

          {formType === 'quiz' && (
            <input value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)} placeholder="正確答案" style={{ width: '100%', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 12, boxSizing: 'border-box' }} />
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={createActivity} disabled={!question} style={{ flex: 1, padding: 12, background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: 'pointer' }}>發起</button>
            <button onClick={() => setShowForm(false)} style={{ padding: '12px 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>取消</button>
          </div>
        </div>
      )}

      {/* Activities list */}
      <div>
        <h3 style={{ color: 'var(--primary)', marginBottom: 12 }}>活動列表</h3>
        {activities.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 40 }}>尚無活動，點擊上方按鈕發起第一個互動</p>}
        {activities.map(a => (
          <div key={a.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  {a.type === 'poll' ? '📊 投票' : a.type === 'quiz' ? '📝 測驗' : a.type === 'rush_answer' ? '⚡ 搶答' : '🎲 抽問'}
                </span>
                <h4 style={{ margin: '4px 0', color: 'var(--text-primary)' }}>{a.question}</h4>
                {a.options && <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>選項: {(a.options as string[]).join(' / ')}</p>}
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  回答數: {responseCount[a.id] || (a.results ? Object.values(a.results).reduce((s, n) => s + n, 0) : 0)}
                </p>
              </div>
              <div>
                {a.status === 'active' ? (
                  <button onClick={() => closeActivity(a.id)} style={{ padding: '8px 16px', background: '#E53E3E', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 500 }}>關閉</button>
                ) : (
                  <span style={{ padding: '4px 12px', background: '#EDF2F7', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-secondary)' }}>已結束</span>
                )}
              </div>
            </div>
            {a.status === 'closed' && a.results && (
              <div style={{ marginTop: 12, padding: 12, background: '#F7FAFC', borderRadius: 'var(--radius-md)' }}>
                <p style={{ fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 8px' }}>結果:</p>
                {Object.entries(a.results).map(([answer, count]) => (
                  <div key={answer} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ minWidth: 80, color: 'var(--text-primary)' }}>{answer}</span>
                    <div style={{ flex: 1, height: 20, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (count / Math.max(1, Object.values(a.results!).reduce((s, n) => s + n, 0))) * 100)}%`, height: '100%', background: answer === a.correctAnswer ? '#48BB78' : 'var(--primary)', borderRadius: 4 }} />
                    </div>
                    <span style={{ minWidth: 30, textAlign: 'right', color: 'var(--text-secondary)', fontSize: 14 }}>{count}</span>
                  </div>
                ))}
                {a.winnerId && <p style={{ fontSize: 13, color: 'var(--primary)', margin: '8px 0 0' }}>🏆 獲勝者: {a.winnerId}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
