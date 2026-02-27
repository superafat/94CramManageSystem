'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminHeader from './components/AdminHeader'
import PendingUsersSection from './components/PendingUsersSection'
import ClassManagementSection from './components/ClassManagementSection'

interface User {
  id: string
  email: string
  name: string
  role: string
  status: string
  createdAt: string
}

interface ClassInfo {
  id: string
  name: string
  grade?: string
  feeMonthly?: number
  feeQuarterly?: number
  feeSemester?: number
  feeYearly?: number
}

interface ClassForm {
  name: string
  grade: string
  feeMonthly: number
  feeQuarterly: number
  feeSemester: number
  feeYearly: number
}

function isUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.role === 'string' &&
    typeof candidate.status === 'string' &&
    typeof candidate.createdAt === 'string'
  )
}

const API_BASE = ''

function getAuthHeaders() {
  return { 'Content-Type': 'application/json' }
}

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [user, setUser] = useState<User | null>(null)

  // 班級管理
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [showClassForm, setShowClassForm] = useState(false)
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null)
  const [classForm, setClassForm] = useState<ClassForm>({ name: '', grade: '', feeMonthly: 0, feeQuarterly: 0, feeSemester: 0, feeYearly: 0 })

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) { router.push('/login'); return }

    let userObj: unknown
    try {
      userObj = JSON.parse(userData)
    } catch {
      router.push('/login')
      return
    }
    if (!isUser(userObj)) { router.push('/login'); return }
    setUser(userObj)

    if (userObj.role !== 'admin') {
      setError('只有管理員可以訪問此頁面')
      setLoading(false)
      return
    }

    fetchUsers()
  }, [router])

  const fetchClasses = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/classes`, { headers: getAuthHeaders(), credentials: 'include' })
      if (!res.ok) { console.error('Failed to fetch classes:', res.status); return }
      const data = await res.json()
      setClasses(data.classes || [])
    } catch (e) {
      console.error('Failed to fetch classes:', e)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') fetchClasses()
  }, [user])

  const saveClass = async () => {
    setError('')
    setSuccess('')
    try {
      const url = editingClass ? `${API_BASE}/api/classes/${editingClass.id}` : `${API_BASE}/api/classes`
      const method = editingClass ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: getAuthHeaders(), credentials: 'include', body: JSON.stringify(classForm) })
      if (!res.ok) throw new Error('儲存失敗')
      setSuccess(editingClass ? '✅ 班級已更新' : '✅ 班級已新增')
      setShowClassForm(false)
      setEditingClass(null)
      setClassForm({ name: '', grade: '', feeMonthly: 0, feeQuarterly: 0, feeSemester: 0, feeYearly: 0 })
      fetchClasses()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '儲存失敗')
    }
  }

  const editClass = (cls: ClassInfo) => {
    setEditingClass(cls)
    setClassForm({
      name: cls.name,
      grade: cls.grade || '',
      feeMonthly: cls.feeMonthly || 0,
      feeQuarterly: cls.feeQuarterly || 0,
      feeSemester: cls.feeSemester || 0,
      feeYearly: cls.feeYearly || 0
    })
    setShowClassForm(true)
  }

  const deleteClass = async (id: string) => {
    if (!confirm('確定要刪除這個班級嗎？')) return
    try {
      const res = await fetch(`${API_BASE}/api/classes/${id}`, { method: 'DELETE', headers: getAuthHeaders(), credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: '刪除失敗' }))
        throw new Error(data.error || '刪除失敗')
      }
      setSuccess('✅ 班級已刪除')
      fetchClasses()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '刪除失敗')
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/pending-users`, { headers: getAuthHeaders(), credentials: 'include' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '取得用戶列表失敗')
      }
      const data = await res.json()
      setUsers(data.users || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '取得用戶列表失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId: string) => {
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/approve`, { method: 'POST', headers: getAuthHeaders(), credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '核准失敗')
      setSuccess('用戶已核准！')
      fetchUsers()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '核准失敗')
    }
  }

  const handleReject = async (userId: string) => {
    setError('')
    setSuccess('')
    if (!confirm('確定要拒絕此用戶嗎？')) return
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/reject`, { method: 'POST', headers: getAuthHeaders(), credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '拒絕失敗')
      setSuccess('用戶已拒絕！')
      fetchUsers()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '拒絕失敗')
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: 'var(--text-secondary)' }}>載入中...</p>
        </div>
      </div>
    )
  }

  if (error && !users.length) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div style={{ textAlign: 'center', padding: '40px', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ color: 'var(--error)', marginBottom: '16px' }}>權限不足</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error}</p>
          <button
            onClick={() => router.push('/main')}
            style={{ padding: '12px 24px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
          >
            返回首頁
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', padding: '20px' }}>
      <AdminHeader userName={user?.name} />

      {/* Messages */}
      {error && (
        <div style={{ maxWidth: '800px', margin: '0 auto 16px', padding: '12px', background: '#FEE2E2', color: '#DC2626', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ maxWidth: '800px', margin: '0 auto 16px', padding: '12px', background: '#DCFCE7', color: '#16A34A', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
          {success}
        </div>
      )}

      <PendingUsersSection
        users={users}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {user?.role === 'admin' && (
        <ClassManagementSection
          classes={classes}
          showClassForm={showClassForm}
          editingClass={editingClass}
          classForm={classForm}
          onShowAddForm={() => {
            setEditingClass(null)
            setClassForm({ name: '', grade: '', feeMonthly: 0, feeQuarterly: 0, feeSemester: 0, feeYearly: 0 })
            setShowClassForm(true)
          }}
          onHideForm={() => setShowClassForm(false)}
          onEditClass={editClass}
          onDeleteClass={deleteClass}
          onSaveClass={saveClass}
          onClassFormChange={setClassForm}
        />
      )}
    </div>
  )
}
