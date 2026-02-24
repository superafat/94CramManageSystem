'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  }
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
  const [classForm, setClassForm] = useState({ name: '', grade: '', feeMonthly: 0, feeQuarterly: 0, feeSemester: 0, feeYearly: 0 })

  useEffect(() => {
    // Check auth
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (!token || !userData) {
      router.push('/login')
      return
    }
    
    let userObj: unknown
    try {
      userObj = JSON.parse(userData)
    } catch {
      router.push('/login')
      return
    }
    if (!isUser(userObj)) {
      router.push('/login')
      return
    }
    setUser(userObj)
    
    // Check admin role
    if (userObj.role !== 'admin') {
      setError('只有管理員可以訪問此頁面')
      setLoading(false)
      return
    }
    
    fetchUsers()
  }, [router])

  // 取得班級列表
  const fetchClasses = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/classes`, { headers: getAuthHeaders() })
      if (!res.ok) {
        console.error('Failed to fetch classes:', res.status)
        return
      }
      const data = await res.json()
      setClasses(data.classes || [])
    } catch (e) {
      console.error('Failed to fetch classes:', e)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchClasses()
    }
  }, [user])

  // 新增/更新班級
  const saveClass = async () => {
    setError('')
    setSuccess('')
    
    try {
      const url = editingClass ? `${API_BASE}/api/classes/${editingClass.id}` : `${API_BASE}/api/classes`
      const method = editingClass ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(classForm)
      })
      
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

  // 編輯班級
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

  // 刪除班級
  const deleteClass = async (id: string) => {
    if (!confirm('確定要刪除這個班級嗎？')) return
    
    try {
      const res = await fetch(`${API_BASE}/api/classes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
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
      const res = await fetch(`${API_BASE}/api/admin/pending-users`, {
        headers: getAuthHeaders()
      })
      
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
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders()
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || '核准失敗')
      }
      
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
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/reject`, {
        method: 'POST',
        headers: getAuthHeaders()
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || '拒絕失敗')
      }
      
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
      {/* Header */}
      <div style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '24px' }}>
        <button
          onClick={() => router.push('/main')}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          ← 返回首頁
        </button>
        
        <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <h1 style={{ fontSize: '28px', color: 'var(--primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            ⚙️ 管理員後台
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            歡迎，管理員 {user?.name}
          </p>
        </div>
      </div>

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

      {/* Pending Users */}
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '20px', color: 'var(--primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📋 待審核用戶 ({users.length})
          </h2>

          {users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <p>目前沒有待審核的用戶</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {users.map((user) => (
                <div
                  key={user.id}
                  style={{
                    padding: '16px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{user.name}</div>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{user.email}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      角色：{user.role} · 狀態：{user.status}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleApprove(user.id)}
                      style={{
                        padding: '8px 16px',
                        background: '#22C55E',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      ✅ 核准
                    </button>
                    <button
                      onClick={() => handleReject(user.id)}
                      style={{
                        padding: '8px 16px',
                        background: '#EF4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      ❌ 拒絕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 班級管理 Section */}
      {user?.role === 'admin' && (
        <div style={{ maxWidth: '800px', margin: '24px auto' }}>
          <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📚 班級管理
              </h2>
              <button
                onClick={() => {
                  setEditingClass(null)
                  setClassForm({ name: '', grade: '', feeMonthly: 0, feeQuarterly: 0, feeSemester: 0, feeYearly: 0 })
                  setShowClassForm(true)
                }}
                style={{
                  padding: '8px 16px',
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ➕ 新增班級
              </button>
            </div>

            {showClassForm && (
              <div style={{ background: 'var(--background)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>{editingClass ? '✏️ 編輯班級' : '➕ 新增班級'}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>班級名稱</label>
                    <input
                      type="text"
                      value={classForm.name}
                      onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                      placeholder="例：國一數學"
                      style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>年級</label>
                    <input
                      type="text"
                      value={classForm.grade}
                      onChange={(e) => setClassForm({ ...classForm, grade: e.target.value })}
                      placeholder="例：一年級"
                      style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>月費</label>
                    <input
                      type="number"
                      value={classForm.feeMonthly}
                      onChange={(e) => setClassForm({ ...classForm, feeMonthly: Number(e.target.value) })}
                      placeholder="3000"
                      style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>季費</label>
                    <input
                      type="number"
                      value={classForm.feeQuarterly}
                      onChange={(e) => setClassForm({ ...classForm, feeQuarterly: Number(e.target.value) })}
                      placeholder="9000"
                      style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>學期費</label>
                    <input
                      type="number"
                      value={classForm.feeSemester}
                      onChange={(e) => setClassForm({ ...classForm, feeSemester: Number(e.target.value) })}
                      placeholder="15000"
                      style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>學年費</label>
                    <input
                      type="number"
                      value={classForm.feeYearly}
                      onChange={(e) => setClassForm({ ...classForm, feeYearly: Number(e.target.value) })}
                      placeholder="30000"
                      style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    onClick={() => setShowClassForm(false)}
                    style={{ flex: 1, padding: '10px', background: 'var(--text-secondary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                  >
                    取消
                  </button>
                  <button
                    onClick={saveClass}
                    style={{ flex: 1, padding: '10px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    儲存
                  </button>
                </div>
              </div>
            )}

            {classes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
                <p>還沒有班級</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    style={{
                      padding: '16px',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{cls.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {cls.grade && `${cls.grade} · `}
                        月費 ${cls.feeMonthly || 0} · 季費 ${cls.feeQuarterly || 0} · 學期 ${cls.feeSemester || 0} · 學年 ${cls.feeYearly || 0}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => editClass(cls)}
                        style={{ padding: '6px 12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteClass(cls.id)}
                        style={{ padding: '6px 12px', background: '#EF4444', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '12px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
