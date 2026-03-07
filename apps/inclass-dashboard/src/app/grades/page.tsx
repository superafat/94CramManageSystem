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
  passRate?: number
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

interface ExamStats {
  totalExams: number
  averageScorePercent: number
  passRate: number
  topPerformers: number
}

interface StudentGradeEntry {
  examId: string
  examName: string
  subject: string
  examDate: string
  score: number
  maxScore: number
  percentage: number
  letterGrade: string
  passed: boolean
}

interface StudentGradesResponse {
  studentId: string
  studentName: string
  grades: StudentGradeEntry[]
}

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null ? value as UnknownRecord : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function toDateString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().split('T')[0]
  if (typeof value !== 'string' || !value.trim()) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().split('T')[0]
}

function unwrapPayload(value: unknown): UnknownRecord {
  const record = asRecord(value)
  if ('data' in record) return asRecord(record.data)
  return record
}

function normalizeExam(rawExam: unknown): Exam {
  const exam = asRecord(rawExam)
  return {
    id: asString(exam.id),
    name: asString(exam.name, '未命名考試'),
    subject: asString(exam.subject, '未設定科目'),
    maxScore: asNumber(exam.maxScore, asNumber(exam.totalScore, 100)),
    examDate: toDateString(exam.examDate),
    passRate: typeof exam.passRate === 'number' ? exam.passRate : undefined,
  }
}

function normalizeExamStats(rawStats: unknown): ExamStats {
  const stats = unwrapPayload(rawStats)
  return {
    totalExams: asNumber(stats.totalExams, 0),
    averageScorePercent: asNumber(stats.averageScorePercent, asNumber(stats.averageScorePercentage, 0)),
    passRate: asNumber(stats.passRate, 0),
    topPerformers: Array.isArray(stats.topPerformers)
      ? stats.topPerformers.length
      : asNumber(stats.topPerformers, 0),
  }
}

function normalizeStudentGrades(
  rawResponse: unknown,
  studentId: string,
  students: Student[]
): StudentGradesResponse {
  const payload = unwrapPayload(rawResponse)
  const selectedStudent = students.find((student) => student.id === studentId)

  return {
    studentId,
    studentName: asString(payload.studentName, selectedStudent?.name ?? '未命名學生'),
    grades: asArray(payload.grades).map((entry) => {
      const grade = asRecord(entry)
      const maxScore = asNumber(grade.maxScore, asNumber(grade.totalScore, 100))
      const percentage = asNumber(
        grade.percentage,
        maxScore > 0 ? Math.round((asNumber(grade.score, 0) / maxScore) * 1000) / 10 : 0
      )

      return {
        examId: asString(grade.examId, asString(grade.scoreId)),
        examName: asString(grade.examName, '未命名考試'),
        subject: asString(grade.subject, '未設定科目'),
        examDate: toDateString(grade.examDate),
        score: asNumber(grade.score, 0),
        maxScore,
        percentage,
        letterGrade: asString(grade.letterGrade, 'F'),
        passed: typeof grade.passed === 'boolean' ? grade.passed : percentage >= 60,
      }
    }),
  }
}

function normalizeExamDetail(rawResponse: unknown, students: Student[]): ExamDetail {
  const payload = unwrapPayload(rawResponse)
  const studentNameMap = new Map(students.map((student) => [student.id, student.name]))
  const stats = asRecord(payload.stats)

  return {
    exam: normalizeExam(payload.exam),
    scores: asArray(payload.scores).map((entry) => {
      const score = asRecord(entry)
      const studentId = asString(score.studentId)
      return {
        id: asString(score.id, studentId),
        studentId,
        studentName: asString(score.studentName, studentNameMap.get(studentId) ?? '未命名學生'),
        score: asNumber(score.score, 0),
      }
    }),
    stats: {
      average: asNumber(stats.average, 0),
      highest: asNumber(stats.highest, 0),
      lowest: asNumber(stats.lowest, 0),
      total: asNumber(stats.total, 0),
    },
  }
}

const LETTER_GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: '#D4EDDA', text: '#155724' },
  B: { bg: '#CCE5FF', text: '#004085' },
  C: { bg: '#FFF3CD', text: '#856404' },
  D: { bg: '#FFE0B2', text: '#7B3D00' },
  F: { bg: '#F8D7DA', text: '#721C24' },
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
  const [error, setError] = useState('')

  // Stats
  const [examStats, setExamStats] = useState<ExamStats | null>(null)

  // Student grade history
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [studentGrades, setStudentGrades] = useState<StudentGradesResponse | null>(null)
  const [studentGradesLoading, setStudentGradesLoading] = useState(false)

  // Date range filter
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchExams(), fetchStudents(), fetchStats()])
    setLoading(false)
  }

  const fetchExams = async () => {
    try {
      const data = await api.getExams()
      const payload = unwrapPayload(data)
      setExams(asArray(payload.exams).map(normalizeExam))
    } catch (e) {
      console.error(e)
      setError('讀取考試列表失敗')
    }
  }

  const fetchStudents = async () => {
    try {
      const data = await api.getStudents() as { students?: Student[] }
      setStudents(data.students || [])
    } catch (e) {
      console.error(e)
      setError('讀取學生列表失敗')
    }
  }

  const fetchStats = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers: HeadersInit = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch('/api/exams/stats', { credentials: 'include', headers })
      if (res.ok) {
        const data = await res.json()
        setExamStats(normalizeExamStats(data))
      }
    } catch (e) {
      console.error('Failed to fetch exam stats:', e)
    }
  }

  const fetchStudentGrades = async (studentId: string) => {
    if (!studentId) {
      setStudentGrades(null)
      return
    }
    setStudentGradesLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers: HeadersInit = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`/api/exams/student-grades/${studentId}`, { credentials: 'include', headers })
      if (res.ok) {
        const data = await res.json()
        setStudentGrades(normalizeStudentGrades(data, studentId, students))
      } else {
        setStudentGrades(null)
      }
    } catch (e) {
      console.error('Failed to fetch student grades:', e)
      setStudentGrades(null)
    } finally {
      setStudentGradesLoading(false)
    }
  }

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId)
    fetchStudentGrades(studentId)
  }

  const createExam = async () => {
    if (!newExam.name || !newExam.subject || !newExam.examDate) {
      return showMessage('請填寫完整資料')
    }
    try {
      await api.createExam(newExam)
      showMessage('建立成功！')
      setNewExam({ name: '', subject: '', maxScore: 100, examDate: '' })
      setShowAddExam(false)
      fetchExams()
      fetchStats()
    } catch (e: unknown) {
      showMessage(`${e instanceof Error ? e.message : '建立失敗'}`)
    }
  }

  const loadExamScores = async (examId: string) => {
    try {
      const data = await api.getExamScores(examId)
      const normalizedDetail = normalizeExamDetail(data, students)
      setSelectedExam(normalizedDetail)
      const inputs: Record<string, number> = {}
      normalizedDetail.scores.forEach((s: Score) => {
        inputs[s.studentId] = s.score
      })
      setScoreInputs(inputs)
      setShowInputScores(true)
    } catch (e) {
      showMessage('讀取成績失敗')
    }
  }

  const saveScore = async (studentId: string) => {
    if (!selectedExam) return
    const score = scoreInputs[studentId]
    if (score === undefined || score < 0 || score > selectedExam.exam.maxScore) {
      return showMessage(`分數必須在 0-${selectedExam.exam.maxScore} 之間`)
    }
    try {
      await api.addExamScore(selectedExam.exam.id, { studentId, score })
      showMessage('儲存成功')
      loadExamScores(selectedExam.exam.id)
      fetchStats()
    } catch (e: unknown) {
      showMessage(`${e instanceof Error ? e.message : '儲存失敗'}`)
    }
  }

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  // Filter exams by date range
  const filteredExams = exams.filter(exam => {
    if (dateFrom && exam.examDate < dateFrom) return false
    if (dateTo && exam.examDate > dateTo) return false
    return true
  })

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        載入中...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--error)' }}>
        {error}
      </div>
    )
  }

  return (
    <main style={{ padding: '16px', background: 'var(--background)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: 'var(--primary)', margin: 0 }}>
            成績管理
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {school?.name}
          </p>
        </div>
        <button
          onClick={() => router.push('/main')}
          style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'white', border: 'none', fontSize: '14px', cursor: 'pointer' }}
        >
          返回首頁
        </button>
      </div>

      {/* Stats Cards */}
      {examStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
          <StatCard label="考試總數" value={String(examStats.totalExams)} unit="場" color="#B8D4C8" />
          <StatCard label="平均分數" value={String(examStats.averageScorePercent)} unit="%" color="#C8D4E8" />
          <StatCard label="及格率" value={String(examStats.passRate)} unit="%" color="#D4C8E8" />
          <StatCard label="優秀學生" value={String(examStats.topPerformers)} unit="人" color="#E8D4B8" />
        </div>
      )}

      {/* New Exam Button */}
      <button
        onClick={() => setShowAddExam(true)}
        style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--accent)', color: 'white', border: 'none', fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', cursor: 'pointer', boxShadow: 'var(--shadow-md)' }}
      >
        新增考試
      </button>

      {/* Student Grade History */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: '18px', color: 'var(--primary)', marginBottom: '14px', fontWeight: 'bold' }}>
          學生成績查詢
        </h2>
        <select
          value={selectedStudentId}
          onChange={(e) => handleStudentSelect(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '14px', marginBottom: '14px', background: 'var(--background)', color: 'var(--text-primary)', cursor: 'pointer' }}
        >
          <option value="">-- 選擇學生 --</option>
          {students.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {studentGradesLoading && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>載入中...</div>
        )}

        {!studentGradesLoading && studentGrades && (
          <>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '10px' }}>
              {studentGrades.studentName} 的成績記錄
            </div>
            {studentGrades.grades.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                尚無成績記錄
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--background)' }}>
                      <th style={thStyle}>考試名稱</th>
                      <th style={thStyle}>日期</th>
                      <th style={thStyle}>分數</th>
                      <th style={thStyle}>百分比</th>
                      <th style={thStyle}>等級</th>
                      <th style={thStyle}>結果</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentGrades.grades.map(g => {
                      const gradeColor = LETTER_GRADE_COLORS[g.letterGrade] || LETTER_GRADE_COLORS['F']
                      return (
                        <tr key={g.examId} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={tdStyle}>
                            <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{g.examName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{g.subject}</div>
                          </td>
                          <td style={tdStyle}>{g.examDate}</td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>
                            {g.score}<span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>/{g.maxScore}</span>
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>{g.percentage}%</td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <span style={{ padding: '3px 10px', borderRadius: '8px', background: gradeColor.bg, color: gradeColor.text, fontWeight: 'bold', fontSize: '13px' }}>
                              {g.letterGrade}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <span style={{ padding: '3px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', background: g.passed ? '#D4EDDA' : '#F8D7DA', color: g.passed ? '#155724' : '#721C24' }}>
                              {g.passed ? '及格' : '不及格'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {!studentGradesLoading && !studentGrades && selectedStudentId && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            查無成績資料
          </div>
        )}
      </div>

      {/* Exam List with Date Filter */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: '18px', color: 'var(--primary)', marginBottom: '14px', fontWeight: 'bold' }}>
          考試列表
        </h2>

        {/* Date Range Filter */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>開始日期</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '13px', background: 'var(--background)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>結束日期</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '13px', background: 'var(--background)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo('') }}
            style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '12px', textDecoration: 'underline' }}
          >
            清除篩選
          </button>
        )}

        {filteredExams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            {exams.length === 0 ? '尚無考試，點擊上方按鈕新增' : '此日期範圍內沒有考試'}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {filteredExams.map(exam => (
              <div key={exam.id} style={{ padding: '16px', background: 'var(--background)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                      {exam.name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {exam.subject} · {exam.examDate} · 滿分 {exam.maxScore}
                    </div>
                    {exam.passRate !== undefined && (
                      <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>及格率：</span>
                        <PassRateBar rate={exam.passRate} />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => loadExamScores(exam.id)}
                    style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'white', border: 'none', fontSize: '14px', cursor: 'pointer', flexShrink: 0, marginLeft: '12px' }}
                  >
                    輸入成績
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Exam Modal */}
      {showAddExam && (
        <Modal title="新增考試" onClose={() => setShowAddExam(false)}>
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
            建立
          </button>
        </Modal>
      )}

      {/* Input Scores Modal */}
      {showInputScores && selectedExam && (
        <Modal title={`${selectedExam.exam.name} - 輸入成績`} onClose={() => setShowInputScores(false)} wide>
          {/* Stats */}
          <div style={{ background: 'var(--background)', borderRadius: 'var(--radius-sm)', padding: '12px', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '13px' }}>
            <div><span style={{ color: 'var(--text-secondary)' }}>平均：</span><strong>{selectedExam.stats.average}分</strong></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>最高：</span><strong>{selectedExam.stats.highest}分</strong></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>最低：</span><strong>{selectedExam.stats.lowest}分</strong></div>
          </div>

          {/* Score Inputs */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {students.map(student => {
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

          {/* Rankings */}
          {selectedExam.scores.length > 0 && (
            <div style={{ marginTop: '16px', background: 'var(--background)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '8px' }}>排名</div>
              {[...selectedExam.scores].sort((a, b) => b.score - a.score).slice(0, 5).map((s, index) => (
                <div key={s.id} style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>
                    {index === 0 ? '第1' : index === 1 ? '第2' : index === 2 ? '第3' : `第${index + 1}`} {s.studentName}
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

// --- Sub-components ---

const thStyle: React.CSSProperties = {
  padding: '8px 10px',
  textAlign: 'left',
  fontSize: '12px',
  color: 'var(--text-secondary)',
  fontWeight: 'bold',
  borderBottom: '2px solid var(--border)',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '10px',
  verticalAlign: 'middle',
}

function StatCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div style={{ background: color, borderRadius: 'var(--radius-md)', padding: '14px 12px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
        {value}<span style={{ fontSize: '13px', fontWeight: 'normal' }}>{unit}</span>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{label}</div>
    </div>
  )
}

function PassRateBar({ rate }: { rate: number }) {
  const color = rate >= 80 ? '#6AAB8E' : rate >= 60 ? '#C4A882' : '#C47B7B'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ width: '80px', height: '6px', background: '#E0E0E0', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${rate}%`, height: '100%', background: color, borderRadius: '3px' }} />
      </div>
      <span style={{ fontSize: '12px', color, fontWeight: 'bold' }}>{rate}%</span>
    </div>
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
