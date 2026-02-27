'use client'

import { BackButton } from '@/components/ui/BackButton'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const API_BASE = ''

function getTenantId() {
  return typeof window !== 'undefined' ? localStorage.getItem('tenantId') || '' : ''
}
function getBranchId() {
  return typeof window !== 'undefined' ? localStorage.getItem('branchId') || '' : ''
}

interface StudentEnrollment {
  id: string
  course_name?: string
  status?: string
  start_date?: string
}

interface Student {
  id: string
  full_name: string
  grade_level?: string
  phone?: string
  email?: string
  school_name?: string
  status: string
  notes?: string
  enrollment_date?: string
  enrollments?: StudentEnrollment[]
}

const GRADE_OPTIONS = [
  '小一', '小二', '小三', '小四', '小五', '小六',
  '國一', '國二', '國三',
  '高一', '高二', '高三',
]

const emptyForm = { fullName: '', gradeLevel: '', phone: '', email: '', schoolName: '', notes: '' }

export default function StudentsPage() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'X-Tenant-Id': getTenantId(),
    }
  }

  const loadStudents = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(
        `${API_BASE}/api/admin/students?limit=100&status=${statusFilter}`,
        { headers: getHeaders(), credentials: 'include' }
      )
      if (!res.ok) throw new Error('載入失敗')
      const json = await res.json()
      const payload = json.data ?? json
      setStudents(payload.students || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入學生資料失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadStudents() }, [statusFilter])

  // Filters
  const filteredStudents = students.filter(student => {
    const matchesSearch = (student.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.phone || '').includes(searchTerm)
    const matchesGrade = gradeFilter === 'all' || student.grade_level === gradeFilter
    return matchesSearch && matchesGrade
  })

  const grades = Array.from(new Set(students.map(s => s.grade_level).filter(Boolean))).sort()

  // Modal actions
  const openAdd = () => {
    setEditingStudent(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (student: Student) => {
    setEditingStudent(student)
    setForm({
      fullName: student.full_name || '',
      gradeLevel: student.grade_level || '',
      phone: student.phone || '',
      email: student.email || '',
      schoolName: student.school_name || '',
      notes: student.notes || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url = editingStudent
        ? `${API_BASE}/api/admin/students/${editingStudent.id}`
        : `${API_BASE}/api/admin/students`
      
      const res = await fetch(url, {
        method: editingStudent ? 'PUT' : 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          fullName: form.fullName,
          gradeLevel: form.gradeLevel || null,
          phone: form.phone || null,
          email: form.email || null,
          schoolName: form.schoolName || null,
          notes: form.notes || null,
          branchId: getBranchId(),
        }),
      })

      if (res.ok) {
        setShowModal(false)
        setEditingStudent(null)
        setForm(emptyForm)
        await loadStudents()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || '儲存失敗')
      }
    } catch (err) {
      alert('儲存失敗，請重試')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-8 w-32 bg-surface-hover animate-pulse rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-surface-hover animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="text-6xl">⚠️</div>
        <h2 className="text-xl font-semibold text-text">載入失敗</h2>
        <p className="text-text-muted">{error}</p>
        <button onClick={loadStudents} className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors">
          重試
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <BackButton />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">學生管理</h1>
          <p className="text-sm text-text-muted">
            共 {students.length} 位
            {filteredStudents.length !== students.length && ` · 顯示 ${filteredStudents.length} 筆`}
          </p>
        </div>
        <button onClick={openAdd} className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium">
          + 新增學生
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        <input
          type="text"
          placeholder="搜尋姓名/電話..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[140px] px-3 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border bg-white text-sm"
        >
          <option value="all">全年級</option>
          {grades.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border bg-white text-sm"
        >
          <option value="active">在學</option>
          <option value="all">全部</option>
          <option value="inactive">休學</option>
          <option value="dropped">退學</option>
        </select>
      </div>

      {/* 手機版：卡片列表 */}
      <div className="lg:hidden space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <div className="text-4xl mb-2">📭</div>
            <p>{searchTerm || gradeFilter !== 'all' ? '找不到符合條件的學生' : '尚無學生資料'}</p>
          </div>
        ) : (
          filteredStudents.map((student) => (
            <div
              key={student.id}
              onClick={() => openEdit(student)}
              className="bg-surface rounded-xl border border-border p-4 cursor-pointer hover:border-primary transition-colors active:bg-surface-hover"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-text">{student.full_name}</span>
                    {student.grade_level && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                        {student.grade_level}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-text-muted">
                    {student.school_name && <span>🏫 {student.school_name}</span>}
                    {student.phone && <span>📱 {student.phone}</span>}
                  </div>
                </div>
                <StatusBadge status={student.status} />
              </div>
              {student.enrollments && student.enrollments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {student.enrollments.slice(0, 3).map((e: StudentEnrollment, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 bg-surface-hover text-text-muted text-xs rounded-lg">
                      {e.course_name || '課程'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 桌面版：表格 */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-text">姓名</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text">年級</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text">學校</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text">電話</th>
              <th className="px-6 py-4 text-center text-sm font-medium text-text">狀態</th>
              <th className="px-6 py-4 text-center text-sm font-medium text-text">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                  {searchTerm || gradeFilter !== 'all' ? '找不到符合條件的學生' : '尚無學生資料'}
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-text">{student.full_name}</td>
                  <td className="px-6 py-4 text-sm text-text-muted">{student.grade_level || '—'}</td>
                  <td className="px-6 py-4 text-sm text-text-muted">{student.school_name || '—'}</td>
                  <td className="px-6 py-4 text-sm text-text-muted">{student.phone || '—'}</td>
                  <td className="px-6 py-4 text-center"><StatusBadge status={student.status} /></td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => openEdit(student)}
                      className="text-sm text-primary hover:underline"
                    >
                      編輯
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 新增/編輯 Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-text mb-4">
              {editingStudent ? '編輯學生' : '新增學生'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-text-muted mb-1">姓名 *</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                  required
                  placeholder="例：王小明"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">年級</label>
                <select
                  value={form.gradeLevel}
                  onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                >
                  <option value="">未選擇</option>
                  {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">電話</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                  placeholder="09xx-xxx-xxx"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                  placeholder="student@example.com"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">學校</label>
                <input
                  type="text"
                  value={form.schoolName}
                  onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                  placeholder="例：台北市立大安國中"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">備註</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text resize-none"
                  rows={3}
                  placeholder="特殊需求、過敏等..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 border border-border rounded-lg text-text"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {saving ? '儲存中...' : editingStudent ? '儲存' : '新增'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-sm text-text-muted">—</span>

  const styles: Record<string, string> = {
    active: 'bg-[#7B9E89]/10 text-[#7B9E89] border-[#7B9E89]/20',
    inactive: 'bg-[#C4956A]/10 text-[#C4956A] border-[#C4956A]/20',
    dropped: 'bg-[#B5706E]/10 text-[#B5706E] border-[#B5706E]/20',
  }

  const labels: Record<string, string> = {
    active: '在學',
    inactive: '休學',
    dropped: '退學',
  }

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  )
}
