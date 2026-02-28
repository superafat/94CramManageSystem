'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import StatCard from './components/StatCard'
import ToolButton from './components/ToolButton'
import FormField from './components/FormField'
import CheckInModal from './components/CheckInModal'
import PaymentSection from './components/PaymentSection'

interface Student {
  id: string
  name: string
  grade?: string
  nfcId?: string
  classId?: string
}

interface Stats {
  total: number
  arrived: number
  late: number
  absent: number
}

interface Attendance {
  id: string
  studentId: string
  studentName: string
  status: 'arrived' | 'late' | 'absent'
  checkInTime: string
}

interface ClassInfo {
  id: string
  name: string
  feeMonthly?: number
  feeQuarterly?: number
  feeSemester?: number
  feeYearly?: number
}

type PaymentType = 'monthly' | 'quarterly' | 'semester' | 'yearly'

interface AlertNotification {
  id: string
  action?: string
  table_name?: string
  change_summary?: string
  user_name: string
  created_at: string
}

// Simple modal wrapper used for the Add Student dialog
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(74, 74, 74, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '24px', maxWidth: '400px', width: '100%', boxShadow: 'var(--shadow-lg)', border: '2px solid var(--border)', position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--error)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', color: 'white', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
        <h3 style={{ fontSize: '20px', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '16px' }}>{title}</h3>
        {children}
      </div>
    </div>
  )
}

export default function Home() {
  const { user, school, logout } = useAuth()
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, arrived: 0, late: 0, absent: 0 })
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [showFaceCheckin, setShowFaceCheckin] = useState(false)
  const [newStudent, setNewStudent] = useState({ name: '', grade: '', nfcId: '' })
  const [nfcInput, setNfcInput] = useState('')
  const [message, setMessage] = useState('')

  // 繳費相關
  const [showPayment, setShowPayment] = useState(false)
  const [paymentStudent, setPaymentStudent] = useState<Student | null>(null)
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentType, setPaymentType] = useState<PaymentType>('monthly')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentNotes, setPaymentNotes] = useState('')
  const [submittingPayment, setSubmittingPayment] = useState(false)

  // 警示通知
  const [alerts, setAlerts] = useState<AlertNotification[]>([])
  const [showAlerts, setShowAlerts] = useState(false)

  const API_BASE = ''

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers: HeadersInit = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API_BASE}/api/alerts`, { credentials: 'include', headers })
      const data: { alerts?: AlertNotification[] } = res.ok ? await res.json() : { alerts: [] }
      if (data.alerts) setAlerts(data.alerts)
    } catch (e) {
      console.error('Failed to fetch alerts:', e)
    }
  }

  useEffect(() => {
    fetchData()
    fetchAlerts()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchStudents(), fetchAttendance()])
    setLoading(false)
  }

  const fetchStudents = async () => {
    try {
      const data = await api.getStudents()
      setStudents(data.students || [])
    } catch (e) {
      console.error('Failed to fetch students:', e)
      showMessage('❌ 讀取學生失敗')
    }
  }

  const fetchAttendance = async () => {
    try {
      const data = await api.getTodayAttendance()
      setStats(data.stats || { total: 0, arrived: 0, late: 0, absent: 0 })
      setAttendances(data.attendances || [])
    } catch (e) {
      console.error('Failed to fetch attendance:', e)
      showMessage('❌ 讀取點名紀錄失敗')
    }
  }

  const openPaymentModal = async (student: Student) => {
    setPaymentStudent(student)
    const data = await api.getClasses().catch(() => ({ classes: [] }))
    const fetchedClasses = data.classes || []
    setClasses(fetchedClasses)

    if (student.classId) {
      setSelectedClass(student.classId)
      const cls = fetchedClasses.find((c: ClassInfo) => c.id === student.classId)
      if (cls) setPaymentAmount(cls.feeMonthly || 0)
    } else if (fetchedClasses.length > 0) {
      setSelectedClass(fetchedClasses[0].id)
      setPaymentAmount(fetchedClasses[0].feeMonthly || 0)
    }

    setShowPayment(true)
  }

  const handlePaymentTypeChange = (type: PaymentType) => {
    setPaymentType(type)
    const cls = classes.find((c: ClassInfo) => c.id === selectedClass)
    if (cls) {
      switch (type) {
        case 'monthly': setPaymentAmount(cls.feeMonthly || 0); break
        case 'quarterly': setPaymentAmount(cls.feeQuarterly || 0); break
        case 'semester': setPaymentAmount(cls.feeSemester || 0); break
        case 'yearly': setPaymentAmount(cls.feeYearly || 0); break
      }
    }
  }

  const handlePaymentClassChange = (classId: string) => {
    setSelectedClass(classId)
    const cls = classes.find((c: ClassInfo) => c.id === classId)
    if (cls) handlePaymentTypeChange(paymentType)
  }

  const submitPayment = async () => {
    if (!paymentStudent || !selectedClass || paymentAmount <= 0) {
      showMessage('❌ 請填寫完整繳費資料')
      return
    }

    setSubmittingPayment(true)
    try {
      const periodMonth = new Date().toISOString().substring(0, 7)
      await api.createPaymentRecordsBatch([{
        studentId: paymentStudent.id,
        classId: selectedClass,
        paymentType,
        amount: paymentAmount,
        periodMonth,
        paymentDate,
        notes: paymentNotes
      }])
      showMessage('✅ 繳費記錄成功！')
      setShowPayment(false)
      setPaymentStudent(null)
      setPaymentNotes('')
    } catch (e) {
      console.error('Payment failed:', e)
      showMessage('❌ 繳費記錄失敗')
    }
    setSubmittingPayment(false)
  }

  const addStudent = async () => {
    if (!newStudent.name) return showMessage('❌ 請輸入姓名')
    try {
      await api.createStudent(newStudent)
      showMessage('✅ 新增成功！')
      setNewStudent({ name: '', grade: '', nfcId: '' })
      setShowAddStudent(false)
      fetchData()
    } catch (e: unknown) {
      showMessage(`❌ ${e instanceof Error ? e.message : '新增失敗'}`)
    }
  }

  const deleteStudent = async (id: string) => {
    if (!confirm('確定要刪除嗎？')) return
    try {
      await api.deleteStudent(id)
      showMessage('✅ 刪除成功')
      fetchData()
    } catch (e: unknown) {
      showMessage(`❌ ${e instanceof Error ? e.message : '刪除失敗'}`)
    }
  }

  const checkinByNFC = async () => {
    if (!nfcInput) return showMessage('❌ 請輸入 NFC 卡號')
    try {
      await api.checkin({ nfcId: nfcInput, method: 'nfc', status: 'arrived' })
      showMessage('✅ 點名成功！')
      setNfcInput('')
      fetchAttendance()
    } catch (e: unknown) {
      showMessage(`❌ ${e instanceof Error ? e.message : '點名失敗'}`)
    }
  }

  const capturePhoto = () => {
    showMessage('📸 拍照成功！（辨識功能開發中）')
    // TODO: 整合 蜂神榜視覺辨識系統
  }

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  const attendanceRate = stats.total > 0 ? Math.round(((stats.arrived + stats.late) / stats.total) * 100) : 0

  return (
    <main style={{ padding: '16px', maxWidth: '100vw', minHeight: '100vh', background: 'var(--background)', paddingBottom: '80px' }}>
      {/* 整合提示橫幅 */}
      <div style={{ background: 'linear-gradient(135deg, #E8F4F8 0%, #D4E8F0 100%)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '12px', border: '1px solid #B8D4E0', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <span style={{ fontSize: '16px', marginTop: '2px' }}>💡</span>
          <div style={{ flex: 1, fontSize: '12px', color: '#4A7C98', lineHeight: 1.5 }}>
            <strong>提示：</strong>學生資料建議使用 <a href="https://cram94-manage-dashboard-1015149159553.asia-east1.run.app" target="_blank" rel="noopener" style={{ color: '#3A6C88', textDecoration: 'underline', fontWeight: '500' }}>蜂神榜 Ai 管理系統</a> 統一管理。<br/>
            蜂神榜 Ai 點名系統 專注於<strong>教學前線</strong>（點名、成績）。
          </div>
        </div>
      </div>

      {/* Header with School Info */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '48px' }} className="animate-bounce">🐝</div>
        <h1 style={{ fontSize: '24px', color: 'var(--primary)', fontWeight: 'bold', margin: 0 }}>
          🎒 {school?.name || '蜂神榜 Ai 點名系統'}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          {user?.name} · {user?.email}
        </p>
        <button
          onClick={logout}
          style={{ marginTop: '8px', padding: '6px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--error)', color: 'white', border: 'none', fontSize: '12px', cursor: 'pointer' }}
        >
          登出
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
        <StatCard emoji="👥" label="總人數" value={stats.total} color="var(--primary-light)" />
        <StatCard emoji="✅" label="已到" value={stats.arrived} color="var(--success)" />
        <StatCard emoji="⏰" label="遲到" value={stats.late} color="var(--warning)" />
        <StatCard emoji="❌" label="未到" value={stats.absent} color="var(--error)" />
      </div>

      {/* Attendance Rate */}
      <div style={{ background: 'var(--primary)', borderRadius: '16px', padding: '16px', textAlign: 'center', color: 'white', marginBottom: '16px', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ fontSize: '14px', opacity: 0.9 }}>今日出勤率</div>
        <div style={{ fontSize: '42px', fontWeight: 'bold' }}>{attendanceRate}%</div>
      </div>

      {/* Alerts Notification */}
      {alerts.length > 0 && (
        <div style={{ background: '#FEF3C7', borderRadius: '16px', padding: '16px', marginBottom: '16px', border: '2px solid #F59E0B', cursor: 'pointer' }} onClick={() => setShowAlerts(!showAlerts)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>⚠️</span>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#92400E' }}>收到 {alerts.length} 筆資料異動通知</div>
                <div style={{ fontSize: '12px', color: '#B45309' }}>點擊查看詳情</div>
              </div>
            </div>
            <span style={{ fontSize: '20px' }}>{showAlerts ? '▼' : '▶'}</span>
          </div>
          {showAlerts && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} style={{ background: 'white', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                  <div style={{ fontWeight: 'bold', color: '#374151' }}>{alert.change_summary || `${alert.action} ${alert.table_name}`}</div>
                  <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>{alert.user_name} · {new Date(alert.created_at).toLocaleString('zh-TW')}</div>
                </div>
              ))}
              {alerts.length > 5 && (
                <div style={{ fontSize: '12px', color: '#92400E', textAlign: 'center' }}>還有 {alerts.length - 5} 筆...</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* NFC Checkin */}
      <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '12px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '8px' }}>⚡ NFC 刷卡點名</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={nfcInput}
            onChange={(e) => setNfcInput(e.target.value)}
            placeholder="輸入 NFC 卡號"
            style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '14px', outline: 'none' }}
            onKeyDown={(e) => e.key === 'Enter' && checkinByNFC()}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          />
          <button onClick={checkinByNFC} style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>
            點名
          </button>
        </div>
      </div>

      {/* Student List & Attendance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        {/* Students */}
        <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '12px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📋 學生名單 ({students.length})</span>
            <button onClick={() => setShowAddStudent(true)} style={{ fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer' }}>➕</button>
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {students.map(s => (
              <div key={s.id} style={{ padding: '8px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{s.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{s.grade} {s.nfcId && `· ${s.nfcId}`}</div>
                </div>
                <button onClick={() => deleteStudent(s.id)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>🗑️</button>
              </div>
            ))}
            {students.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '14px' }}>🌸 還沒有學生</div>
            )}
          </div>
        </div>

        {/* Today Attendance */}
        <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '12px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '8px' }}>📍 今日到校</div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {attendances.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '14px' }}>🌸 還沒有人到校</div>
            ) : (
              attendances.map((a: Attendance) => (
                <div key={a.id} style={{ padding: '8px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{a.studentName}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', background: a.status === 'arrived' ? 'var(--success)' : a.status === 'late' ? 'var(--warning)' : 'var(--error)', color: 'white' }}>
                      {a.status === 'arrived' ? '✅' : a.status === 'late' ? '⏰' : '❌'}
                    </span>
                    {a.status !== 'absent' && (
                      <button
                        onClick={() => {
                          const student = students.find((s: Student) => s.name === a.studentName)
                          if (student) openPaymentModal(student)
                        }}
                        style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        💰
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Fixed Toolbar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderTop: '2px solid var(--border)', padding: '12px', display: 'flex', justifyContent: 'space-around', boxShadow: 'var(--shadow-lg)', zIndex: 100 }}>
        <ToolButton emoji="📸" label="刷臉" onClick={() => setShowFaceCheckin(true)} />
        <ToolButton emoji="📋" label="名單" onClick={() => setShowAddStudent(true)} />
        <ToolButton emoji="📊" label="儀表板" onClick={() => router.push('/dashboard')} />
        <ToolButton emoji="📝" label="成績" onClick={() => router.push('/grades')} />
        <ToolButton emoji="📈" label="報表" onClick={() => router.push('/reports')} />
        <ToolButton emoji="💰" label="繳費" onClick={() => router.push('/billing')} />
        <ToolButton emoji="📚" label="說明" onClick={() => router.push('/guide')} />
        {(user?.role === 'admin') && <ToolButton emoji="⚙️" label="管理" onClick={() => router.push('/admin')} />}
      </div>

      {/* Add Student Modal */}
      {showAddStudent && (
        <Modal title="➕ 新增學生" onClose={() => setShowAddStudent(false)}>
          <FormField label="姓名" value={newStudent.name} onChange={(v) => setNewStudent({...newStudent, name: v})} placeholder="王小明" />
          <FormField label="年級" value={newStudent.grade || ''} onChange={(v) => setNewStudent({...newStudent, grade: v})} placeholder="一年級" />
          <FormField label="NFC 卡號" value={newStudent.nfcId || ''} onChange={(v) => setNewStudent({...newStudent, nfcId: v})} placeholder="NFC001" />
          <button onClick={addStudent} style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--accent)', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '16px', marginTop: '12px', cursor: 'pointer' }}>
            ✅ 新增
          </button>
        </Modal>
      )}

      {/* Payment Modal */}
      {showPayment && paymentStudent && (
        <PaymentSection
          paymentStudent={paymentStudent}
          classes={classes}
          selectedClass={selectedClass}
          paymentType={paymentType}
          paymentAmount={paymentAmount}
          paymentDate={paymentDate}
          paymentNotes={paymentNotes}
          submittingPayment={submittingPayment}
          onClose={() => setShowPayment(false)}
          onClassChange={handlePaymentClassChange}
          onPaymentTypeChange={handlePaymentTypeChange}
          onAmountChange={setPaymentAmount}
          onDateChange={setPaymentDate}
          onNotesChange={setPaymentNotes}
          onSubmit={submitPayment}
        />
      )}

      {/* Face Checkin Modal */}
      {showFaceCheckin && (
        <CheckInModal
          onClose={() => setShowFaceCheckin(false)}
          onCapture={capturePhoto}
          onStreamReady={() => {}}
        />
      )}

      {/* Toast Message */}
      {message && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(74, 74, 74, 0.9)', color: 'white', padding: '16px 32px', borderRadius: 'var(--radius-md)', fontSize: '16px', fontWeight: 'bold', zIndex: 200, boxShadow: 'var(--shadow-lg)' }}>
          {message}
        </div>
      )}
    </main>
  )
}
