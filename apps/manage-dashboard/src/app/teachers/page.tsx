'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BackButton } from '@/components/ui/BackButton'

interface Teacher {
  id: string
  name: string
  title: string
  phone: string
  rate_per_class: string
  status: string
  email?: string
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
  const [form, setForm] = useState({ name: '', title: '教師', phone: '', rate_per_class: '' })

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return {
      'Content-Type': 'application/json',
      'X-Tenant-Id': getTenantId(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  useEffect(() => {
    fetchTeachers()
  }, [])

  const fetchTeachers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/w8/teachers`, { headers: getHeaders() })
      const data = await res.json()
      setTeachers(data.teachers || data || [])
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
        body: JSON.stringify({
          ...form,
          tenant_id: getTenantId(),
          branch_id: getBranchId(),
        })
      })
      
      if (res.ok) {
        setShowModal(false)
        setEditingTeacher(null)
        setForm({ name: '', title: '教師', phone: '', rate_per_class: '' })
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
      rate_per_class: teacher.rate_per_class,
    })
    setShowModal(true)
  }

  const openAdd = () => {
    setEditingTeacher(null)
    setForm({ name: '', title: '教師', phone: '', rate_per_class: '' })
    setShowModal(true)
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
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text">{teacher.name}</span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                      {teacher.title}
                    </span>
                  </div>
                  {teacher.phone && (
                    <p className="text-sm text-text-muted mt-1">{teacher.phone}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-primary">
                    ${Number(teacher.rate_per_class).toLocaleString()}
                  </p>
                  <p className="text-xs text-text-muted">每堂</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-text mb-4">
              {editingTeacher ? '編輯講師' : '新增講師'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-text-muted mb-1">姓名</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                  required
                />
              </div>
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
                <label className="block text-sm text-text-muted mb-1">電話</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">堂薪</label>
                <input
                  type="number"
                  value={form.rate_per_class}
                  onChange={(e) => setForm({ ...form, rate_per_class: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                  required
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
