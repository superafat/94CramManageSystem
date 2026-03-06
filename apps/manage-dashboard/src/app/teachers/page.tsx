'use client'

import { useEffect, useState } from 'react'
import { BackButton } from '@/components/ui/BackButton'
import { Avatar } from '@/components/ui/Avatar'
import {
  HEALTH_TIERS,
  LABOR_TIERS,
  SECOND_GEN_HEALTH_PREMIUM_RATE,
  SECOND_GEN_HEALTH_PREMIUM_THRESHOLD,
} from '@/app/salary/constants'
import type { TeacherInsuranceConfig, TeacherInsurancePlan, TeacherSupplementalHealth } from '@/app/salary/types'
import { normalizeInsuranceConfig } from '@/app/salary/utils'

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
  avatar_url?: string
  phone: string
  email: string
  rate_per_class: string
  status: string
  teacher_role?: string
  salary_type?: string
  base_salary?: string
  hourly_rate?: string
  insurance_config?: TeacherInsuranceConfig
  id_number?: string
  birthday?: string
  address?: string
  emergency_contact?: string
  emergency_phone?: string
  bank_name?: string
  bank_branch?: string
  bank_account?: string
  bank_account_name?: string
  subjects?: string[]
  grade_levels?: string[]
}

const SUBJECT_OPTIONS = [
  '國文', '英文', '數學', '理化', '物理', '化學',
  '生物', '地科', '歷史', '地理', '公民', '自然',
  '社會', '作文', '閱讀', '程式設計',
]

const GRADE_LEVEL_OPTIONS = ['國小', '國中', '高中']

const createDefaultInsurancePlan = (enabled: boolean): TeacherInsurancePlan => ({
  enabled,
  tierLevel: 1,
  calculationMode: 'auto',
  manualPersonalAmount: null,
  manualEmployerAmount: null,
})

const createDefaultSupplementalHealth = (salaryType: string): TeacherSupplementalHealth => ({
  employmentType: salaryType === 'monthly' ? 'full_time' : 'part_time',
  insuredThroughUnit: salaryType === 'monthly',
  averageWeeklyHours: null,
  notes: null,
})

const createDefaultInsuranceConfig = (salaryType: string): TeacherInsuranceConfig => ({
  labor: createDefaultInsurancePlan(salaryType === 'monthly'),
  health: createDefaultInsurancePlan(salaryType === 'monthly'),
  supplementalHealth: createDefaultSupplementalHealth(salaryType),
})

const createEmptyForm = () => ({
  name: '', title: '教師', phone: '', email: '', rate_per_class: '', hourly_rate: '',
  avatar_url: '',
  teacher_role: '', salary_type: 'per_class', base_salary: '',
  insurance_config: createDefaultInsuranceConfig('per_class'),
  id_number: '', birthday: '', address: '',
  emergency_contact: '', emergency_phone: '',
  bank_name: '', bank_branch: '', bank_account: '', bank_account_name: '',
  subjects: [] as string[],
  grade_levels: [] as string[],
})

const API_BASE = ''

function getTenantId() {
  return typeof window !== 'undefined' ? localStorage.getItem('tenantId') || '' : ''
}

function getBranchId() {
  return typeof window !== 'undefined' ? localStorage.getItem('branchId') || '' : ''
}

function getSupplementalHealthGuidance(config: TeacherInsuranceConfig): string[] {
  const { supplementalHealth } = config
  const guidance: string[] = []

  if (supplementalHealth.employmentType === 'full_time') {
    guidance.push('目前設定為正職，原則上應走一般健保投保，不列兼職補充保費試算。')
    return guidance
  }

  if (supplementalHealth.insuredThroughUnit) {
    guidance.push('已勾選由本單位投保，通常不適用非所屬投保單位兼職薪資補充保費。')
  } else {
    guidance.push(`未由本單位投保時，單次給付達 NT$ ${SECOND_GEN_HEALTH_PREMIUM_THRESHOLD.toLocaleString()} 才會進入補充保費試算。`)
  }

  if ((supplementalHealth.averageWeeklyHours ?? 0) >= 12) {
    guidance.push('平均每週工時達 12 小時以上，建議先確認是否應改由本單位辦理一般健保投保。')
  } else {
    guidance.push('平均每週工時未達 12 小時時，通常先保留兼職判斷，再看單次給付門檻。')
  }

  guidance.push(`目前補充保費率試算為 ${(SECOND_GEN_HEALTH_PREMIUM_RATE * 100).toFixed(2)}%，是否正式代扣仍在薪資結算時人工覆核。`)
  return guidance
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [form, setForm] = useState(createEmptyForm())
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const supplementalHealthGuidance = getSupplementalHealthGuidance(form.insurance_config)

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Tenant-Id': getTenantId(),
  })

  useEffect(() => {
    fetchTeachers()
  }, [])

  const fetchTeachers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/w8/teachers`, { headers: getHeaders(), credentials: 'include' })
      const json = await res.json()
      const payload = json.data ?? json
      setTeachers((payload.teachers || []).map((teacher: Teacher) => ({
        ...teacher,
        insurance_config: normalizeInsuranceConfig(teacher.insurance_config),
      })))
    } catch (err) {
      console.error('Failed to fetch teachers:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('tenantId', getTenantId())

    setUploadingAvatar(true)
    try {
      const res = await fetch(`${API_BASE}/api/w8/teachers/upload-avatar`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Tenant-Id': getTenantId(),
        },
        body: formData,
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error?.message || json.error || '上傳頭像失敗')
      }

      const payload = json.data ?? json
      setForm((prev) => ({ ...prev, avatar_url: payload.url || '' }))
    } catch (err) {
      console.error('Failed to upload avatar:', err)
      window.alert(err instanceof Error ? err.message : '上傳頭像失敗')
    } finally {
      setUploadingAvatar(false)
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
          avatarUrl: form.avatar_url || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          ratePerClass: form.rate_per_class || undefined,
          hourlyRate: form.hourly_rate || undefined,
          teacherRole: form.teacher_role || undefined,
          salaryType: form.salary_type || 'per_class',
          baseSalary: form.base_salary || undefined,
          insuranceConfig: form.insurance_config,
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
          tenantId: getTenantId(),
          branchId: getBranchId(),
        }),
      })

      if (res.ok) {
        setShowModal(false)
        setEditingTeacher(null)
        setForm(createEmptyForm())
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
      avatar_url: teacher.avatar_url || '',
      phone: teacher.phone || '',
      email: teacher.email || '',
      rate_per_class: teacher.rate_per_class || '',
      hourly_rate: teacher.hourly_rate || '',
      teacher_role: teacher.teacher_role || '',
      salary_type: teacher.salary_type || 'per_class',
      base_salary: teacher.base_salary || '',
      insurance_config: normalizeInsuranceConfig(teacher.insurance_config),
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
    setForm(createEmptyForm())
    setShowModal(true)
  }

  const toggleSubject = (subject: string) => {
    setForm({
      ...form,
      subjects: form.subjects.includes(subject)
        ? form.subjects.filter((item) => item !== subject)
        : [...form.subjects, subject],
    })
  }

  const toggleGradeLevel = (level: string) => {
    setForm({
      ...form,
      grade_levels: form.grade_levels.includes(level)
        ? form.grade_levels.filter((item) => item !== level)
        : [...form.grade_levels, level],
    })
  }

  const updateInsurancePlan = (kind: 'labor' | 'health', patch: Partial<TeacherInsurancePlan>) => {
    setForm((prev) => ({
      ...prev,
      insurance_config: {
        ...prev.insurance_config,
        [kind]: {
          ...prev.insurance_config[kind],
          ...patch,
        },
      },
    }))
  }

  const updateSupplementalHealth = (patch: Partial<TeacherSupplementalHealth>) => {
    setForm((prev) => ({
      ...prev,
      insurance_config: {
        ...prev.insurance_config,
        supplementalHealth: {
          ...prev.insurance_config.supplementalHealth,
          ...patch,
        },
      },
    }))
  }

  const handleSalaryTypeChange = (salaryType: string) => {
    setForm((prev) => {
      const nextInsurance = {
        ...prev.insurance_config,
        supplementalHealth: {
          ...prev.insurance_config.supplementalHealth,
          employmentType: salaryType === 'monthly' ? 'full_time' : prev.insurance_config.supplementalHealth.employmentType,
          insuredThroughUnit: salaryType === 'monthly' ? true : prev.insurance_config.supplementalHealth.insuredThroughUnit,
        },
      }

      if (salaryType === 'monthly' && !prev.insurance_config.labor.enabled && !prev.insurance_config.health.enabled) {
        nextInsurance.labor = { ...prev.insurance_config.labor, enabled: true }
        nextInsurance.health = { ...prev.insurance_config.health, enabled: true }
      }

      return {
        ...prev,
        salary_type: salaryType,
        insurance_config: nextInsurance,
      }
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

      <div className="lg:hidden p-4 space-y-3">
        {teachers.length === 0 ? (
          <div className="text-center py-12 text-text-muted">尚無講師資料</div>
        ) : (
          teachers.map((teacher) => (
            <div
              key={teacher.id}
              onClick={() => openEdit(teacher)}
              className="bg-surface rounded-xl p-4 border border-border cursor-pointer hover:border-primary transition-colors active:bg-surface-hover"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Avatar src={teacher.avatar_url} fallback={teacher.name} size="lg" />
                  <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
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
                  <div className="flex items-center gap-3 text-sm text-text-muted">
                    {teacher.phone && <span>📱 {teacher.phone}</span>}
                    {teacher.email && <span className="truncate">✉️ {teacher.email}</span>}
                  </div>
                  {teacher.insurance_config && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-xs rounded">
                        勞保 {teacher.insurance_config.labor.enabled ? `第${teacher.insurance_config.labor.tierLevel}級` : '未啟用'}
                      </span>
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded">
                        健保 {teacher.insurance_config.health.enabled ? `第${teacher.insurance_config.health.tierLevel}級` : '未啟用'}
                      </span>
                      <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                        {teacher.insurance_config.supplementalHealth.employmentType === 'full_time' ? '正職' : '兼職'}
                      </span>
                    </div>
                  )}
                  {(teacher.grade_levels?.length || teacher.subjects?.length) ? (
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
                  ) : null}
                  </div>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <p className="text-base font-semibold text-primary">
                    ${teacher.salary_type === 'monthly'
                      ? Number(teacher.base_salary || 0).toLocaleString()
                      : Number(teacher.salary_type === 'hourly' ? teacher.hourly_rate || 0 : teacher.rate_per_class || 0).toLocaleString()}
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

      <div className="hidden lg:block overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-text">姓名</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text">稱謂/身分</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text">電話</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text">科目</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text">薪資</th>
              <th className="px-6 py-4 text-center text-sm font-medium text-text">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {teachers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-text-muted">尚無講師資料</td>
              </tr>
            ) : (
              teachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-text">
                    <div className="flex items-center gap-3">
                      <Avatar src={teacher.avatar_url} fallback={teacher.name} size="md" />
                      <span>{teacher.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-muted">
                    {teacher.title}{teacher.teacher_role && ` · ${teacher.teacher_role}`}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-muted">{teacher.phone || '—'}</td>
                  <td className="px-6 py-4 text-sm text-text-muted">
                    {teacher.subjects?.join('、') || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-text">
                    ${teacher.salary_type === 'monthly'
                      ? Number(teacher.base_salary || 0).toLocaleString()
                      : Number(teacher.salary_type === 'hourly' ? teacher.hourly_rate || 0 : teacher.rate_per_class || 0).toLocaleString()}
                    <span className="text-xs text-text-muted ml-1">
                      {teacher.salary_type === 'monthly' ? '/月' : teacher.salary_type === 'hourly' ? '/時' : '/堂'}
                    </span>
                    {teacher.insurance_config && (
                      <div className="text-[11px] text-text-muted mt-1">
                        勞保 {teacher.insurance_config.labor.enabled ? `第${teacher.insurance_config.labor.tierLevel}級` : '未啟用'} / 健保 {teacher.insurance_config.health.enabled ? `第${teacher.insurance_config.health.tierLevel}級` : '未啟用'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => openEdit(teacher)}
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-text mb-4">
              {editingTeacher ? '編輯講師' : '新增講師'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-primary mb-2">基本資料</legend>
                <div className="rounded-2xl border border-dashed border-border bg-background/60 p-4">
                  <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
                    <Avatar src={form.avatar_url || undefined} fallback={form.name || '教師'} size="xl" className="border border-border bg-white" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text">大頭貼</p>
                      <p className="mt-1 text-xs text-text-muted">支援 JPG、PNG、WebP，大小上限 3MB。</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <label className="inline-flex cursor-pointer items-center rounded-lg border border-border bg-white px-3 py-2 text-sm text-text hover:bg-surface">
                          {uploadingAvatar ? '上傳中...' : '上傳照片'}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            disabled={uploadingAvatar}
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              if (file) {
                                void handleAvatarUpload(file)
                              }
                              event.currentTarget.value = ''
                            }}
                          />
                        </label>
                        {form.avatar_url && (
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, avatar_url: '' })}
                            className="rounded-lg border border-border px-3 py-2 text-sm text-text-muted hover:bg-surface"
                          >
                            移除照片
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">姓名 *</label>
                  <input
                    title="講師姓名"
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
                      title="講師稱謂"
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
                      title="講師身分"
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
                      title="計薪方式"
                      value={form.salary_type}
                      onChange={(e) => handleSalaryTypeChange(e.target.value)}
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
                      title={form.salary_type === 'monthly' ? '月薪金額' : form.salary_type === 'hourly' ? '時薪金額' : '堂薪金額'}
                      type="number"
                      value={form.salary_type === 'monthly' ? form.base_salary : form.salary_type === 'hourly' ? form.hourly_rate : form.rate_per_class}
                      onChange={(e) => {
                        if (form.salary_type === 'monthly') {
                          setForm({ ...form, base_salary: e.target.value })
                        } else if (form.salary_type === 'hourly') {
                          setForm({ ...form, hourly_rate: e.target.value })
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
                      title="講師電話"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-1">Email</label>
                    <input
                      title="講師 Email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="text-sm font-semibold text-primary mb-2">勞健保級距方案</legend>

                {(['labor', 'health'] as const).map((kind) => {
                  const plan = form.insurance_config[kind]
                  const tiers = kind === 'labor' ? LABOR_TIERS : HEALTH_TIERS
                  const title = kind === 'labor' ? '勞保' : '健保'

                  return (
                    <div key={kind} className="rounded-xl border border-border p-3 space-y-3 bg-background">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-text">{title}方案</p>
                          <p className="text-xs text-text-muted">預設自動依級距計算，可切換手動金額。</p>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-text">
                          <input
                            title={`${title}啟用狀態`}
                            type="checkbox"
                            checked={plan.enabled}
                            onChange={(e) => updateInsurancePlan(kind, { enabled: e.target.checked })}
                            className="rounded border-border text-primary"
                          />
                          啟用
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-text-muted mb-1">計算模式</label>
                          <select
                            title={`${title}計算模式`}
                            value={plan.calculationMode}
                            onChange={(e) => updateInsurancePlan(kind, { calculationMode: e.target.value as TeacherInsurancePlan['calculationMode'] })}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text"
                            disabled={!plan.enabled}
                          >
                            <option value="auto">自動</option>
                            <option value="manual">手動</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-text-muted mb-1">投保級距</label>
                          <select
                            title={`${title}投保級距`}
                            value={plan.tierLevel ?? 1}
                            onChange={(e) => updateInsurancePlan(kind, { tierLevel: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text"
                            disabled={!plan.enabled || plan.calculationMode === 'manual'}
                          >
                            {tiers.map((tier) => (
                              <option key={tier.level} value={tier.level}>{tier.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {plan.calculationMode === 'manual' && plan.enabled && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm text-text-muted mb-1">個人負擔</label>
                            <input
                              title={`${title}個人負擔`}
                              type="number"
                              min="0"
                              value={plan.manualPersonalAmount ?? ''}
                              onChange={(e) => updateInsurancePlan(kind, { manualPersonalAmount: e.target.value === '' ? null : Number(e.target.value) })}
                              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-text-muted mb-1">雇主負擔</label>
                            <input
                              title={`${title}雇主負擔`}
                              type="number"
                              min="0"
                              value={plan.manualEmployerAmount ?? ''}
                              onChange={(e) => updateInsurancePlan(kind, { manualEmployerAmount: e.target.value === '' ? null : Number(e.target.value) })}
                              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                <div className="rounded-xl border border-border p-3 space-y-3 bg-background">
                  <div>
                    <p className="text-sm font-medium text-text">兼職 / 二代健保判斷</p>
                    <p className="text-xs text-text-muted leading-5">
                      兼職按堂薪不是一定扣二代健保。要看是否已在本單位投保、每週工時是否達應投保門檻，以及單次給付是否達基本工資。
                    </p>
                    <div className="mt-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
                      <p className="text-xs font-medium text-primary">目前設定提示</p>
                      <div className="mt-2 space-y-1 text-xs leading-5 text-text-muted">
                        {supplementalHealthGuidance.map((item) => (
                          <p key={item}>• {item}</p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-text-muted mb-1">聘僱型態</label>
                      <select
                        title="聘僱型態"
                        value={form.insurance_config.supplementalHealth.employmentType}
                        onChange={(e) => updateSupplementalHealth({ employmentType: e.target.value as TeacherSupplementalHealth['employmentType'] })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text"
                      >
                        <option value="full_time">正職</option>
                        <option value="part_time">兼職</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-text-muted mb-1">平均每週工時</label>
                      <input
                        title="平均每週工時"
                        type="number"
                        min="0"
                        max="168"
                        value={form.insurance_config.supplementalHealth.averageWeeklyHours ?? ''}
                        onChange={(e) => updateSupplementalHealth({ averageWeeklyHours: e.target.value === '' ? null : Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text"
                        placeholder="例如 12"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-text">
                    <input
                      title="本單位投保狀態"
                      type="checkbox"
                      checked={form.insurance_config.supplementalHealth.insuredThroughUnit}
                      onChange={(e) => updateSupplementalHealth({ insuredThroughUnit: e.target.checked })}
                      className="rounded border-border text-primary"
                    />
                    已由本單位辦理健保投保
                  </label>

                  <div>
                    <label className="block text-sm text-text-muted mb-1">判斷備註</label>
                    <textarea
                      title="二代健保判斷備註"
                      value={form.insurance_config.supplementalHealth.notes ?? ''}
                      onChange={(e) => updateSupplementalHealth({ notes: e.target.value || null })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text min-h-[84px]"
                      placeholder={`例如：兼職按堂薪，單次給付達基本工資才評估補充保費；目前補充保費率 ${(SECOND_GEN_HEALTH_PREMIUM_RATE * 100).toFixed(2)}%`}
                    />
                    <p className="mt-2 text-xs leading-5 text-text-muted">
                      建議寫明投保依附單位、固定週工時、是否長期固定排班，以及需要人工覆核的例外情況。
                    </p>
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-primary mb-2">個人資料</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-text-muted mb-1">身分證字號</label>
                    <input
                      title="身分證字號"
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
                      title="生日"
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
                    title="地址"
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
                      title="緊急聯絡人"
                      type="text"
                      value={form.emergency_contact}
                      onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-1">緊急聯絡電話</label>
                    <input
                      title="緊急聯絡電話"
                      type="tel"
                      value={form.emergency_phone}
                      onChange={(e) => setForm({ ...form, emergency_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-primary mb-2">匯款資訊</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-text-muted mb-1">銀行名稱</label>
                    <input
                      title="銀行名稱"
                      type="text"
                      value={form.bank_name}
                      onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-1">分行名稱</label>
                    <input
                      title="分行名稱"
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
                      title="銀行帳號"
                      type="text"
                      value={form.bank_account}
                      onChange={(e) => setForm({ ...form, bank_account: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-1">戶名</label>
                    <input
                      title="銀行戶名"
                      type="text"
                      value={form.bank_account_name}
                      onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-primary mb-2">教授科目</legend>
                <div className="grid grid-cols-4 gap-2">
                  {SUBJECT_OPTIONS.map((subject) => (
                    <label key={subject} className="flex items-center gap-1.5 text-sm text-text cursor-pointer">
                      <input
                        title={`教授科目 ${subject}`}
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

              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-primary mb-2">教授年級</legend>
                <div className="flex gap-6">
                  {GRADE_LEVEL_OPTIONS.map((level) => (
                    <label key={level} className="flex items-center gap-1.5 text-sm text-text cursor-pointer">
                      <input
                        title={`教授年級 ${level}`}
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
