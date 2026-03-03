'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BackButton } from '@/components/ui/BackButton'

const TEACHER_ROLE_OPTIONS = ['主任', '行政', '助教', '跑課老師']
const SALARY_TYPE_OPTIONS = [
  { value: 'per_class', label: '堂價計費' },
  { value: 'hourly', label: '兼職時薪' },
  { value: 'monthly', label: '正職底薪' },
]

interface Teacher {
  id: string
  name: string
  title: string
  phone: string
  email: string
  rate_per_class: string
  status: string
  teacher_role?: string
  salary_type?: string
  base_salary?: string
  hourly_rate?: string
  // 個人資料
  id_number?: string
  birthday?: string
  address?: string
  emergency_contact?: string
  emergency_phone?: string
  // 匯款資訊
  bank_name?: string
  bank_branch?: string
  bank_account?: string
  bank_account_name?: string
  // 教授能力
  subjects?: string[]
  grade_levels?: string[]
}

const SUBJECT_OPTIONS = [
  '國文', '英文', '數學', '理化', '物理', '化學',
  '生物', '地科', '歷史', '地理', '公民', '自然',
  '社會', '作文', '閱讀', '程式設計',
]

const GRADE_LEVEL_OPTIONS = ['國小', '國中', '高中']

const EMPTY_FORM = {
  name: '', title: '教師', phone: '', email: '', rate_per_class: '',
  teacher_role: '', salary_type: 'per_class', base_salary: '',
  id_number: '', birthday: '', address: '',
  emergency_contact: '', emergency_phone: '',
  bank_name: '', bank_branch: '', bank_account: '', bank_account_name: '',
  subjects: [] as string[],
  grade_levels: [] as string[],
}

const API_BASE = ''

function getTenantId() {
  return typeof window !== 'undefined' ? localStorage.getItem('tenantId') || '' : ''
}
function getBranchId() {
  return typeof window !== 'undefined' ? localStorage.getItem('branchId') || '' : ''
}

export default function TeachersPage() {
  const router = useRouter()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'X-Tenant-Id': getTenantId(),
    }
  }

  useEffect(() => {
    fetchTeachers()
  }, [])

  const fetchTeachers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/w8/teachers`, { headers: getHeaders(), credentials: 'include' })
      const json = await res.json()
      const payload = json.data ?? json
      setTeachers(payload.teachers || [])
    } catch (err) {
      console.error('Failed to fetch teachers:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingTeacher
        ? `${API_BASE}/api/w8/teachers/${editingTeacher.id}`
        : `${API_BASE}/api/w8/teachers`

      const res = await fetch(url, {
        method: editingTeacher ? 'PUT' : 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          title: form.title,
          phone: form.phone || undefined,
          email: form.email || undefined,
          ratePerClass: form.rate_per_class || undefined,
          teacherRole: form.teacher_role || undefined,
          salaryType: form.salary_type || 'per_class',
          baseSalary: form.base_salary || undefined,
          idNumber: form.id_number || undefined,
          birthday: form.birthday || undefined,
          address: form.address || undefined,
          emergencyContact: form.emergency_contact || undefined,
          emergencyPhone: form.emergency_phone || undefined,
          bankName: form.bank_name || undefined,
          bankBranch: form.bank_branch || undefined,
          bankAccount: form.bank_account || undefined,
          bankAccountName: form.bank_account_name || undefined,
          subjects: form.subjects.length > 0 ? form.subjects : undefined,
          gradeLevels: form.grade_levels.length > 0 ? form.grade_levels : undefined,
          tenant_id: getTenantId(),
          branch_id: getBranchId(),
        })
      })

      if (res.ok) {
        setShowModal(false)
        setEditingTeacher(null)
        setForm({ ...EMPTY_FORM, subjects: [], grade_levels: [] })
        fetchTeachers()
      }
    } catch (err) {
      console.error('Failed to save teacher:', err)
    }
  }

  const openEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher)
    setForm({
      name: teacher.name,
      title: teacher.title,
      phone: teacher.phone || '',
      email: teacher.email || '',
      rate_per_class: teacher.rate_per_class || '',
      teacher_role: teacher.teacher_role || '',
      salary_type: teacher.salary_type || 'per_class',
      base_salary: teacher.base_salary || '',
      id_number: teacher.id_number || '',
      birthday: teacher.birthday || '',
      address: teacher.address || '',
      emergency_contact: teacher.emergency_contact || '',
      emergency_phone: teacher.emergency_phone || '',
      bank_name: teacher.bank_name || '',
      bank_branch: teacher.bank_branch || '',
      bank_account: teacher.bank_account || '',
      bank_account_name: teacher.bank_account_name || '',
      subjects: teacher.subjects || [],
      grade_levels: teacher.grade_levels || [],
    })
    setShowModal(true)
  }

  const openAdd = () => {
    setEditingTeacher(null)
    setForm({ ...EMPTY_FORM, subjects: [], grade_levels: [] })
    setShowModal(true)
  }

  const toggleSubject = (subject: string) => {
    setForm({
      ...form,
      subjects: form.subjects.includes(subject)
        ? form.subjects.filter((s) => s !== subject)
        : [...form.subjects, subject],
    })
  }

  const toggleGradeLevel = (level: string) => {
    setForm({
      ...form,
      grade_levels: form.grade_levels.includes(level)
        ? form.grade_levels.filter((l) => l !== level)
        : [...form.grade_levels, level],
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <BackButton fallbackUrl="/dashboard" />
          <h1 className="text-lg font-semibold text-text">講師管理</h1>
        </div>
        <button
          onClick={openAdd}
          className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium"
        >
          + 新增
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {teachers.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            尚無講師資料
          </div>
        ) : (
          teachers.map((teacher) => (
            <div
              key={teacher.id}
              onClick={() => openEdit(teacher)}
              className="bg-surface rounded-xl p-4 border border-border cursor-pointer hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-text">{teacher.name}</span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                      {teacher.title}
                    </span>
                    {teacher.teacher_role && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                        {teacher.teacher_role}
                      </span>
                    )}
                  </div>
                  {teacher.phone && (
                    <p className="text-sm text-text-muted mt-1">{teacher.phone}</p>
                  )}
                  {(teacher.grade_levels && teacher.grade_levels.length > 0 || teacher.subjects && teacher.subjects.length > 0) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {teacher.grade_levels?.map((level) => (
                        <span key={level} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                          {level}
                        </span>
                      ))}
                      {teacher.subjects?.map((subject) => (
                        <span key={subject} className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                          {subject}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-primary">
                    ${teacher.salary_type === 'monthly'
                      ? Number(teacher.base_salary || 0).toLocaleString()
                      : Number(teacher.rate_per_class || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-text-muted">
                    {teacher.salary_type === 'monthly' ? '月薪' : teacher.salary_type === 'hourly' ? '時薪' : '每堂'}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-text mb-4">
              {editingTeacher ? '編輯講師' : '新增講師'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 基本資料 */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-primary mb-2">基本資料</legend>
                <div>
                  <label className="block text-sm text-text-muted mb-1">姓名 *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-text-muted mb-1">稱謂</label>
                    <select
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    >
                      <option value="教師">教師</option>
                      <option value="講師">講師</option>
                      <option value="教練">教練</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-1">身分</label>
                    <select
                      value={form.teacher_role}
                      onChange={(e) => setForm({ ...form, teacher_role: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    >
                      <option value="">未設定</option>
                      {TEACHER_ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-text-muted mb-1">計薪方式</label>
                    <select
                      value={form.salary_type}
                      onChange={(e) => setForm({ ...form, salary_type: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    >
                      {SALARY_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-1">
                      {form.salary_type === 'monthly' ? '月薪' : form.salary_type === 'hourly' ? '時薪' : '堂薪'}
                    </label>
                    <input
                      type="number"
                      value={form.salary_type === 'monthly' ? form.base_salary : form.rate_per_class}
                      onChange={(e) => {
                        if (form.salary_type === 'monthly') {
                          setForm({ ...form, base_salary: e.target.value })
                        } else {
                          setForm({ ...form, rate_per_class: e.target.value })
                        }
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                      placeholder={form.salary_type === 'monthly' ? '月薪金額' : '每堂/每小時'}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-text-muted mb-1">電話</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-1">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    />
                  </div>
                </div>
              </fieldset>

              {/* 個人資料 */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-primary mb-2">個人資料</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-text-muted mb-1">身分證字號</label>
                    <input
                      type="text"
                      value={form.id_number}
                      onChange={(e) => setForm({ ...form, id_number: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-1">生日</label>
                    <input
                      type="date"
                      value={form.birthday}
                      onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">地址</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-text-muted mb-1">緊急聯絡人</label>
                    <input
                      type="text"
                      value={form.emergency_contact}
                      onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-1">緊急聯絡電話</label>
                    <input
                      type="tel"
                      value={form.emergency_phone}
                      onChange={(e) => setForm({ ...form, emergency_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    />
                  </div>
                </div>
              </fieldset>

              {/* 匯款資訊 */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-primary mb-2">匯款資訊</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-text-muted mb-1">銀行名稱</label>
                    <input
                      type="text"
                      value={form.bank_name}
                      onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-1">分行名稱</label>
                    <input
                      type="text"
                      value={form.bank_branch}
                      onChange={(e) => setForm({ ...form, bank_branch: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-text-muted mb-1">帳號</label>
                    <input
                      type="text"
                      value={form.bank_account}
                      onChange={(e) => setForm({ ...form, bank_account: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-1">戶名</label>
                    <input
                      type="text"
                      value={form.bank_account_name}
                      onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    />
                  </div>
                </div>
              </fieldset>

              {/* 教授科目 */}
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-primary mb-2">教授科目</legend>
                <div className="grid grid-cols-4 gap-2">
                  {SUBJECT_OPTIONS.map((subject) => (
                    <label key={subject} className="flex items-center gap-1.5 text-sm text-text cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.subjects.includes(subject)}
                        onChange={() => toggleSubject(subject)}
                        className="rounded border-border text-primary"
                      />
                      {subject}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* 教授年級 */}
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-primary mb-2">教授年級</legend>
                <div className="flex gap-6">
                  {GRADE_LEVEL_OPTIONS.map((level) => (
                    <label key={level} className="flex items-center gap-1.5 text-sm text-text cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.grade_levels.includes(level)}
                        onChange={() => toggleGradeLevel(level)}
                        className="rounded border-border text-primary"
                      />
                      {level}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* 按鈕 */}
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
                  className="flex-1 py-2 bg-primary text-white rounded-lg font-medium"
                >
                  {editingTeacher ? '儲存' : '新增'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
