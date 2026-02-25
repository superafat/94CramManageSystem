'use client'

import { BackButton } from '@/components/ui/BackButton'

import { useEffect, useState, useRef } from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'
import { Pie, Bar } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

interface GradeRecord {
  id: string
  student_id: string
  student_name?: string
  subject: string
  exam_name: string
  exam_date: string
  score: number
  full_score: number
  max_score: number
}

interface StudentOption {
  id: string
  full_name: string
}

const SUBJECT_OPTIONS = ['數學', '英文', '國文', '自然', '社會', '物理', '化學', '生物', '其他']

export default function GradesPage() {
  const [records, setRecords] = useState<GradeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subjectFilter, setSubjectFilter] = useState('all')

  // 新增成績 Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([])
  const [addForm, setAddForm] = useState({
    studentId: '', subject: '', examName: '', score: '', maxScore: '100', date: new Date().toISOString().split('T')[0],
  })
  const [addSaving, setAddSaving] = useState(false)

  const API_BASE = ''

  const loadGrades = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_BASE}/api/admin/grades?limit=100`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('API 錯誤')
      const json = await res.json()
      const payload = json.data ?? json
      setRecords(payload.grades || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadGrades() }, [])

  // 載入學生列表（給新增用）
  const loadStudents = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/students?limit=100`, {
        credentials: 'include',
        headers: { 'X-Tenant-Id': localStorage.getItem('tenantId') || '' },
      })
      if (res.ok) {
        const json2 = await res.json()
        const stuPayload = json2.data ?? json2
        setStudentOptions((stuPayload.students || []).map((s: { id: string; full_name: string }) => ({ id: s.id, full_name: s.full_name })))
      }
    } catch (err) {
      console.error('Failed to load students:', err)
    }
  }

  const openAddGrade = () => {
    setAddForm({ studentId: '', subject: '', examName: '', score: '', maxScore: '100', date: new Date().toISOString().split('T')[0] })
    if (studentOptions.length === 0) loadStudents()
    setShowAddModal(true)
  }

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': localStorage.getItem('tenantId') || '' },
        credentials: 'include',
        body: JSON.stringify({
          studentId: addForm.studentId,
          subject: addForm.subject,
          examName: addForm.examName || '考試',
          score: Number(addForm.score),
          maxScore: Number(addForm.maxScore) || 100,
          date: addForm.date,
        }),
      })
      if (res.ok) {
        setShowAddModal(false)
        await loadGrades()
      } else {
        alert('新增失敗')
      }
    } catch {
      alert('新增失敗，請重試')
    } finally {
      setAddSaving(false)
    }
  }

  const filteredRecords = subjectFilter === 'all' 
    ? records 
    : records.filter(r => r.subject === subjectFilter)

  const subjects = [...new Set(records.map(r => r.subject).filter(Boolean))]
  
  const avgScore = filteredRecords.length 
    ? Math.round(filteredRecords.reduce((sum, r) => sum + (r.score / (r.max_score || r.full_score || 100)) * 100, 0) / filteredRecords.length)
    : 0

  const getScoreColor = (score: number, max: number) => {
    const pct = (score / max) * 100
    if (pct >= 90) return 'text-[#7B9E89]'
    if (pct >= 70) return 'text-[#C4956A]'
    return 'text-[#B5706E]'
  }

  // 成績分布資料
  const scoreDistribution = {
    excellent: filteredRecords.filter(r => r.score >= 90).length,
    good: filteredRecords.filter(r => r.score >= 80 && r.score < 90).length,
    average: filteredRecords.filter(r => r.score >= 70 && r.score < 80).length,
    pass: filteredRecords.filter(r => r.score >= 60 && r.score < 70).length,
    fail: filteredRecords.filter(r => r.score < 60).length,
  }

  const pieData = {
    labels: ['優秀 (≥90)', '良好 (80-89)', '普通 (70-79)', '及格 (60-69)', '不及格 (<60)'],
    datasets: [{
      data: [scoreDistribution.excellent, scoreDistribution.good, scoreDistribution.average, scoreDistribution.pass, scoreDistribution.fail],
      backgroundColor: ['#7B9E89', '#8BB174', '#C4956A', '#D4A574', '#B5706E'],
      borderWidth: 0,
    }]
  }

  // 科目平均分
  const subjectAvg = subjects.map(s => {
    const subjectRecords = records.filter(r => r.subject === s)
    const avg = subjectRecords.reduce((sum, r) => sum + r.score, 0) / subjectRecords.length
    return { subject: s, avg: Math.round(avg) }
  })

  const barData = {
    labels: subjectAvg.map(s => s.subject),
    datasets: [{
      label: '平均分數',
      data: subjectAvg.map(s => s.avg),
      backgroundColor: '#6366f1',
      borderRadius: 8,
    }]
  }

  const exportCSV = () => {
    const headers = ['學生', '科目', '考試', '日期', '分數', '滿分']
    const rows = filteredRecords.map(r => [
      r.student_name || r.student_id,
      r.subject || '-',
      r.exam_name,
      r.exam_date,
      r.score,
      r.max_score || r.full_score || 100
    ])
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `成績報表_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
    <div className="space-y-6">
      <div className="h-8 w-32 bg-surface-hover animate-pulse rounded" />
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-surface-hover animate-pulse rounded-2xl" />
        ))}
      </div>
    </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 返回按鈕 */}
      <BackButton />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-semibold text-text">成績管理</h1>
        <div className="flex gap-2">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="flex-1 md:flex-none px-3 py-2 rounded-xl border border-border bg-white text-sm"
          >
            <option value="all">全部科目</option>
            {subjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={openAddGrade}
            className="px-3 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 text-sm whitespace-nowrap"
          >
            + 登錄
          </button>
          <button
            onClick={exportCSV}
            className="px-3 py-2 border border-border text-text rounded-xl hover:bg-surface-hover text-sm whitespace-nowrap"
          >
            📥 匯出
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex justify-between items-center">
          <span>{error}</span>
          <button onClick={loadGrades} className="text-sm underline">重試</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
          <div className="text-2xl md:text-3xl font-bold text-text">{filteredRecords.length}</div>
          <div className="text-xs md:text-sm text-text-muted">成績筆數</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
          <div className={`text-2xl md:text-3xl font-bold ${getScoreColor(avgScore, 100)}`}>{avgScore}</div>
          <div className="text-xs md:text-sm text-text-muted">平均分數</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
          <div className="text-2xl md:text-3xl font-bold text-[#7B9E89]">{scoreDistribution.excellent}</div>
          <div className="text-xs md:text-sm text-text-muted">優秀 (≥90)</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
          <div className="text-2xl md:text-3xl font-bold text-[#B5706E]">{scoreDistribution.fail}</div>
          <div className="text-xs md:text-sm text-text-muted">不及格</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-border p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-text mb-4">📊 成績分布</h3>
          <div className="h-48 md:h-64 flex items-center justify-center">
            {filteredRecords.length > 0 ? (
              <Pie data={pieData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } }} />
            ) : (
              <div className="text-text-muted">無資料</div>
            )}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-border p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-text mb-4">📈 科目平均</h3>
          <div className="h-48 md:h-64 flex items-center justify-center">
            {subjectAvg.length > 0 ? (
              <Bar data={barData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } }} />
            ) : (
              <div className="text-text-muted">無資料</div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="space-y-3">
        {filteredRecords.slice(0, 20).map((record) => {
          const maxScore = record.max_score || record.full_score || 100
          const pct = Math.round((record.score / maxScore) * 100)
          return (
            <div key={record.id} className="bg-white rounded-2xl shadow-sm border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-text truncate">
                      {record.student_name || record.student_id.slice(0, 8)}
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-surface rounded-full text-text-muted whitespace-nowrap">
                      {record.subject || '-'}
                    </span>
                  </div>
                  <div className="text-sm text-text-muted">
                    {record.exam_name} · {record.exam_date}
                  </div>
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                  <div className={`text-2xl font-bold ${getScoreColor(record.score, maxScore)}`}>
                    {Math.round(record.score)}
                  </div>
                  <div className="text-xs text-text-muted">
                    / {maxScore} ({pct}%)
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-2 bg-surface rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    pct >= 90 ? 'bg-[#7B9E89]' : pct >= 70 ? 'bg-[#C4956A]' : 'bg-[#B5706E]'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
        {filteredRecords.length > 20 && (
          <div className="text-center py-4 text-text-muted text-sm">
            顯示前 20 筆，共 {filteredRecords.length} 筆
          </div>
        )}
        {filteredRecords.length === 0 && !loading && (
          <div className="text-center py-8 text-text-muted">
            沒有成績資料
          </div>
        )}
      </div>

      {/* 新增成績 Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-text mb-4">登錄成績</h2>
            <form onSubmit={handleAddGrade} className="space-y-4">
              <div>
                <label className="block text-sm text-text-muted mb-1">學生 *</label>
                <select
                  value={addForm.studentId}
                  onChange={(e) => setAddForm({ ...addForm, studentId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                  required
                >
                  <option value="">選擇學生</option>
                  {studentOptions.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">科目 *</label>
                <select
                  value={addForm.subject}
                  onChange={(e) => setAddForm({ ...addForm, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                  required
                >
                  <option value="">選擇科目</option>
                  {SUBJECT_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">考試名稱</label>
                <input
                  type="text"
                  value={addForm.examName}
                  onChange={(e) => setAddForm({ ...addForm, examName: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                  placeholder="例：第一次段考"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-text-muted mb-1">得分 *</label>
                  <input
                    type="number"
                    value={addForm.score}
                    onChange={(e) => setAddForm({ ...addForm, score: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    required min="0" step="0.5"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">滿分</label>
                  <input
                    type="number"
                    value={addForm.maxScore}
                    onChange={(e) => setAddForm({ ...addForm, maxScore: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    min="1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">日期</label>
                <input
                  type="date"
                  value={addForm.date}
                  onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 border border-border rounded-lg text-text"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  className="flex-1 py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {addSaving ? '儲存中...' : '新增成績'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

