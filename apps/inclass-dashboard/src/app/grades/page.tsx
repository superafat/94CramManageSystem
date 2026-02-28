'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'

interface Exam {
  id: string
  name: string
  subject: string
  maxScore: number
  examDate: string
}

interface Score {
  id: string
  studentId: string
  studentName: string
  score: number
}

interface Student {
  id: string
  name: string
}

interface ExamDetail {
  exam: Exam
  scores: Score[]
  stats: {
    average: number
    highest: number
    lowest: number
    total: number
  }
}

export default function GradesPage() {
  const router = useRouter()
  const { school } = useAuth()
  const [exams, setExams] = useState<Exam[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedExam, setSelectedExam] = useState<ExamDetail | null>(null)
  const [showAddExam, setShowAddExam] = useState(false)
  const [showInputScores, setShowInputScores] = useState(false)
  const [newExam, setNewExam] = useState({ name: '', subject: '', maxScore: 100, examDate: '' })
  const [scoreInputs, setScoreInputs] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchExams(), fetchStudents()])
    setLoading(false)
  }

  const fetchExams = async () => {
    try {
      const data = await api.getExams() as { exams?: Exam[] }
      setExams(data.exams || [])
    } catch (e) {
      console.error(e)
    }
  }

  const fetchStudents = async () => {
    try {
      const data = await api.getStudents() as { students?: Student[] }
      setStudents(data.students || [])
    } catch (e) {
      console.error(e)
    }
  }

  const createExam = async () => {
    if (!newExam.name || !newExam.subject || !newExam.examDate) {
      return showMessage('❌ 請填寫完整資料')
    }

    try {
      await api.createExam(newExam)
      showMessage('✅ 建立成功！')
      setNewExam({ name: '', subject: '', maxScore: 100, examDate: '' })
      setShowAddExam(false)
      fetchExams()
    } catch (e: unknown) {
      showMessage(`❌ ${e instanceof Error ? e.message : '建立失敗'}`)
    }
  }

  const loadExamScores = async (examId: string) => {
    try {
      const data = await api.getExamScores(examId) as ExamDetail
      setSelectedExam(data)
      
      // 初始化分數輸入
      const inputs: Record<string, number> = {}
      data.scores.forEach((s: Score) => {
        inputs[s.studentId] = s.score
      })
      setScoreInputs(inputs)
      setShowInputScores(true)
    } catch (e) {
      showMessage('❌ 讀取成績失敗')
    }
  }

  const saveScore = async (studentId: string) => {
    if (!selectedExam) return
    
    const score = scoreInputs[studentId]
    if (score === undefined || score < 0 || score > selectedExam.exam.maxScore) {
      return showMessage(`❌ 分數必須在 0-${selectedExam.exam.maxScore} 之間`)
    }

    try {
      await api.addExamScore(selectedExam.exam.id, { studentId, score })
      showMessage('✅ 儲存成功')
      loadExamScores(selectedExam.exam.id)
    } catch (e: unknown) {
      showMessage(`❌ ${e instanceof Error ? e.message : '儲存失敗'}`)
    }
  }

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>載入中...</div>
  }

  return (
    <main style={{ padding: '16px', background: 'var(--background)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: 'var(--primary)', margin: 0 }}>
            📝 成績管理
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {school?.name}
          </p>
        </div>
        <button 
          onClick={() => router.push('/main')}
          style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'white', border: 'none', fontSize: '14px', cursor: 'pointer' }}
        >
          ← 返回首頁
        </button>
      </div>

      {/* 新增考試按鈕 */}
      <button 
        onClick={() => setShowAddExam(true)}
        style={{ width: '100%', padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--accent)', color: 'white', border: 'none', fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', cursor: 'pointer', boxShadow: 'var(--shadow-md)' }}
      >
        ➕ 新增考試
      </button>

      {/* 考試列表 */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: '18px', color: 'var(--primary)', marginBottom: '16px', fontWeight: 'bold' }}>
          📊 考試列表
        </h2>
        {exams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            尚無考試，點擊上方按鈕新增
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {exams.map(exam => (
              <div key={exam.id} style={{ padding: '16px', background: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                      {exam.name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {exam.subject} · {exam.examDate} · 滿分 {exam.maxScore}
                    </div>
                  </div>
                  <button 
                    onClick={() => loadExamScores(exam.id)}
                    style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'white', border: 'none', fontSize: '14px', cursor: 'pointer' }}
                  >
                    輸入成績
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 新增考試 Modal */}
      {showAddExam && (
        <Modal title="➕ 新增考試" onClose={() => setShowAddExam(false)}>
          <FormField label="考試名稱" value={newExam.name} onChange={(v) => setNewExam({...newExam, name: v})} placeholder="第一次月考" />
          <FormField label="科目" value={newExam.subject} onChange={(v) => setNewExam({...newExam, subject: v})} placeholder="數學" />
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '14px' }}>考試日期</label>
            <input 
              type="date" 
              value={newExam.examDate} 
              onChange={(e) => setNewExam({...newExam, examDate: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '14px' }}
            />
          </div>
          <FormField label="滿分" value={String(newExam.maxScore)} onChange={(v) => setNewExam({...newExam, maxScore: Number(v)})} placeholder="100" />
          <button onClick={createExam} style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--accent)', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '16px', marginTop: '12px', cursor: 'pointer' }}>
            ✅ 建立
          </button>
        </Modal>
      )}

      {/* 輸入成績 Modal */}
      {showInputScores && selectedExam && (
        <Modal title={`📝 ${selectedExam.exam.name} - 輸入成績`} onClose={() => setShowInputScores(false)} wide>
          {/* 統計 */}
          <div style={{ background: 'var(--background)', borderRadius: 'var(--radius-sm)', padding: '12px', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '13px' }}>
            <div><span style={{ color: 'var(--text-secondary)' }}>平均:</span> <strong>{selectedExam.stats.average}分</strong></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>最高:</span> <strong>{selectedExam.stats.highest}分</strong></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>最低:</span> <strong>{selectedExam.stats.lowest}分</strong></div>
          </div>

          {/* 成績輸入 */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {students.map(student => {
              const existingScore = selectedExam.scores.find(s => s.studentId === student.id)
              return (
                <div key={student.id} style={{ padding: '12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{student.name}</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="number" 
                      value={scoreInputs[student.id] !== undefined ? scoreInputs[student.id] : ''}
                      onChange={(e) => setScoreInputs({...scoreInputs, [student.id]: Number(e.target.value)})}
                      placeholder="分數"
                      min="0"
                      max={selectedExam.exam.maxScore}
                      style={{ width: '80px', padding: '8px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '14px', textAlign: 'center' }}
                    />
                    <button 
                      onClick={() => saveScore(student.id)}
                      style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--success)', color: 'white', border: 'none', fontSize: '13px', cursor: 'pointer' }}
                    >
                      存
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 排名 */}
          {selectedExam.scores.length > 0 && (
            <div style={{ marginTop: '16px', background: 'var(--background)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '8px' }}>🏆 排名</div>
              {[...selectedExam.scores].sort((a, b) => b.score - a.score).slice(0, 5).map((s, index) => (
                <div key={s.id} style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`} {s.studentName}
                  </span>
                  <strong>{s.score}分</strong>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Toast */}
      {message && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(74, 74, 74, 0.9)', color: 'white', padding: '16px 32px', borderRadius: 'var(--radius-md)', fontSize: '16px', fontWeight: 'bold', zIndex: 200, boxShadow: 'var(--shadow-lg)' }}>
          {message}
        </div>
      )}
    </main>
  )
}

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(74, 74, 74, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '24px', maxWidth: wide ? '600px' : '450px', width: '100%', boxShadow: 'var(--shadow-lg)', border: '2px solid var(--border)', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--error)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', color: 'white', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
        <h3 style={{ fontSize: '20px', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '16px' }}>{title}</h3>
        {children}
      </div>
    </div>
  )
}

function FormField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '14px' }}>{label}</label>
      <input 
        type="text" 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder} 
        style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '14px', outline: 'none' }}
        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
      />
    </div>
  )
}
