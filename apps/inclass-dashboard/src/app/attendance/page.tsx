'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// --- Types ---
interface AttendanceStats {
  totalAttendances: number
  attendanceRate: number
  lateCount: number
  leaveCount: number
}

interface TodayAttendance {
  id: string
  studentId: string
  studentName: string
  status: 'arrived' | 'late' | 'absent' | 'leave'
  checkInTime: string | null
  checkOutTime?: string | null
}

interface HistoryRecord {
  id: string
  studentId: string
  studentName: string
  date: string
  status: 'arrived' | 'late' | 'absent' | 'leave'
  checkInTime: string | null
  checkOutTime: string | null
}

interface LeaveRecord {
  id: string
  studentId: string
  studentName: string
  leaveDate: string
  reason: string
  status: string
}

interface Student {
  id: string
  name: string
}

// --- Helpers ---
function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers: HeadersInit = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '—'
  try {
    return new Date(timeStr).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return timeStr
  }
}

// --- Status Badge ---
const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  arrived: { bg: '#8FA895', color: 'white', label: '出席' },
  late:    { bg: '#C4956A', color: 'white', label: '遲到' },
  absent:  { bg: '#B85C5C', color: 'white', label: '缺席' },
  leave:   { bg: '#A0A0A0', color: 'white', label: '請假' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] || { bg: '#A0A0A0', color: 'white', label: status }
  return (
    <span style={{ padding: '3px 10px', borderRadius: '10px', background: s.bg, color: s.color, fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

// --- StatCard ---
function StatCard({ label, value, unit, color }: { label: string; value: string | number; unit: string; color: string }) {
  return (
    <div style={{ background: color, borderRadius: '12px', padding: '14px 12px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
        {value}<span style={{ fontSize: '13px', fontWeight: 'normal' }}>{unit}</span>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{label}</div>
    </div>
  )
}

// --- Table styles ---
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
  fontSize: '13px',
}

// --- Main Page ---
export default function AttendancePage() {
  const { school } = useAuth()
  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'leaves'>('today')

  // Stats
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Today
  const [todayList, setTodayList] = useState<TodayAttendance[]>([])
  const [todayLoading, setTodayLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  // History
  const [historyList, setHistoryList] = useState<HistoryRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [filterStudentId, setFilterStudentId] = useState('')

  // Leaves
  const [leavesList, setLeavesList] = useState<LeaveRecord[]>([])
  const [leavesLoading, setLeavesLoading] = useState(false)

  // Toast
  const [message, setMessage] = useState('')

  const PAGE_SIZE = 10

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  // Fetch stats on mount
  useEffect(() => {
    fetchStats()
    fetchStudents()
  }, [])

  // Fetch tab data when tab changes
  useEffect(() => {
    if (activeTab === 'today') fetchToday()
    if (activeTab === 'history') fetchHistory(1)
    if (activeTab === 'leaves') fetchLeaves()
  }, [activeTab])

  const fetchStats = async () => {
    setStatsLoading(true)
    try {
      const res = await fetch('/api/attendance/stats', { credentials: 'include', headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (e) {
      console.error('Failed to fetch attendance stats:', e)
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/students', { credentials: 'include', headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setStudents(data.students || [])
      }
    } catch (e) {
      console.error('Failed to fetch students:', e)
    }
  }

  const fetchToday = async () => {
    setTodayLoading(true)
    try {
      const res = await fetch('/api/attendance/today', { credentials: 'include', headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setTodayList(data.attendances || [])
      }
    } catch (e) {
      console.error('Failed to fetch today attendance:', e)
    } finally {
      setTodayLoading(false)
    }
  }

  const fetchHistory = async (page: number) => {
    setHistoryLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(PAGE_SIZE))
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      if (filterStudentId) params.set('studentId', filterStudentId)

      const res = await fetch(`/api/attendance/history?${params.toString()}`, { credentials: 'include', headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setHistoryList(data.attendances || [])
        setHistoryTotal(data.total || 0)
        setHistoryPage(page)
      }
    } catch (e) {
      console.error('Failed to fetch attendance history:', e)
    } finally {
      setHistoryLoading(false)
    }
  }

  const fetchLeaves = async () => {
    setLeavesLoading(true)
    try {
      const res = await fetch('/api/attendance/leaves', { credentials: 'include', headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setLeavesList(data.leaves || [])
      }
    } catch (e) {
      console.error('Failed to fetch leaves:', e)
    } finally {
      setLeavesLoading(false)
    }
  }

  const handleCheckout = async (studentId: string) => {
    setCheckoutLoading(studentId)
    try {
      const res = await fetch('/api/attendance/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      })
      if (res.ok) {
        showMessage('簽退成功！')
        fetchToday()
        fetchStats()
      } else {
        const data = await res.json().catch(() => ({}))
        showMessage(`簽退失敗：${data.error || '未知錯誤'}`)
      }
    } catch (e) {
      console.error('Checkout failed:', e)
      showMessage('簽退失敗，請重試')
    } finally {
      setCheckoutLoading(null)
    }
  }

  const handleHistorySearch = () => {
    fetchHistory(1)
  }

  const totalPages = Math.ceil(historyTotal / PAGE_SIZE)

  return (
    <main style={{ padding: '16px', background: 'var(--background)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '26px', color: 'var(--primary)', margin: 0, fontWeight: 'bold' }}>
          出勤管理
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          {school?.name}
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ background: '#E8EDE8', borderRadius: '12px', height: '70px', animation: 'pulse 1.5s infinite' }} />
          ))
        ) : (
          <>
            <StatCard label="總到課數" value={stats?.totalAttendances ?? '—'} unit="次" color="#D4E8D4" />
            <StatCard label="出席率" value={stats?.attendanceRate ?? '—'} unit="%" color="#C8D4E8" />
            <StatCard label="遲到次數" value={stats?.lateCount ?? '—'} unit="次" color="#E8D8C0" />
            <StatCard label="請假次數" value={stats?.leaveCount ?? '—'} unit="次" color="#E0E0E0" />
          </>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '2px solid var(--border)', paddingBottom: '0' }}>
        {(['today', 'history', 'leaves'] as const).map((tab) => {
          const labels = { today: '今日出勤', history: '歷史記錄', leaves: '請假紀錄' }
          const active = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 16px',
                border: 'none',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: active ? 'bold' : 'normal',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                marginBottom: '-2px',
                transition: 'color 0.2s',
              }}
            >
              {labels[tab]}
            </button>
          )
        })}
      </div>

      {/* Tab 1: Today */}
      {activeTab === 'today' && (
        <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          {todayLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>載入中...</div>
          ) : todayList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              今日尚無出勤記錄
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--background)' }}>
                    <th style={thStyle}>學生姓名</th>
                    <th style={thStyle}>到課時間</th>
                    <th style={thStyle}>狀態</th>
                    <th style={thStyle}>離開時間</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {todayList.map((a) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ ...tdStyle, fontWeight: 'bold', color: 'var(--text-primary)' }}>{a.studentName}</td>
                      <td style={tdStyle}>{formatTime(a.checkInTime)}</td>
                      <td style={tdStyle}><StatusBadge status={a.status} /></td>
                      <td style={tdStyle}>{formatTime(a.checkOutTime)}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {a.status !== 'absent' && !a.checkOutTime ? (
                          <button
                            onClick={() => handleCheckout(a.studentId)}
                            disabled={checkoutLoading === a.studentId}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '8px',
                              background: checkoutLoading === a.studentId ? '#C0C0C0' : '#8FA9B8',
                              color: 'white',
                              border: 'none',
                              fontSize: '12px',
                              cursor: checkoutLoading === a.studentId ? 'not-allowed' : 'pointer',
                              fontWeight: 'bold',
                            }}
                          >
                            {checkoutLoading === a.studentId ? '處理中...' : '簽退'}
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {a.checkOutTime ? '已簽退' : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: History */}
      {activeTab === 'history' && (
        <div>
          {/* Filters */}
          <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>開始日期</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '2px solid var(--border)', fontSize: '13px', background: 'var(--background)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>結束日期</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '2px solid var(--border)', fontSize: '13px', background: 'var(--background)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>學生篩選</label>
              <select
                value={filterStudentId}
                onChange={(e) => setFilterStudentId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '2px solid var(--border)', fontSize: '13px', background: 'var(--background)', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                <option value="">-- 全部學生 --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleHistorySearch}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--accent)', color: 'white', border: 'none', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                搜尋
              </button>
              {(dateFrom || dateTo || filterStudentId) && (
                <button
                  onClick={() => { setDateFrom(''); setDateTo(''); setFilterStudentId(''); setTimeout(() => fetchHistory(1), 0) }}
                  style={{ padding: '10px 16px', borderRadius: '8px', background: 'var(--border)', color: 'var(--text-secondary)', border: 'none', fontSize: '13px', cursor: 'pointer' }}
                >
                  清除
                </button>
              )}
            </div>
          </div>

          {/* History Table */}
          <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>載入中...</div>
            ) : historyList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                無出勤記錄
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--background)' }}>
                        <th style={thStyle}>日期</th>
                        <th style={thStyle}>學生姓名</th>
                        <th style={thStyle}>狀態</th>
                        <th style={thStyle}>到課時間</th>
                        <th style={thStyle}>離開時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyList.map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={tdStyle}>{r.date}</td>
                          <td style={{ ...tdStyle, fontWeight: 'bold', color: 'var(--text-primary)' }}>{r.studentName}</td>
                          <td style={tdStyle}><StatusBadge status={r.status} /></td>
                          <td style={tdStyle}>{formatTime(r.checkInTime)}</td>
                          <td style={tdStyle}>{formatTime(r.checkOutTime)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                    <button
                      onClick={() => fetchHistory(historyPage - 1)}
                      disabled={historyPage <= 1}
                      style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: historyPage <= 1 ? 'var(--background)' : 'var(--surface)', color: historyPage <= 1 ? 'var(--text-secondary)' : 'var(--text-primary)', cursor: historyPage <= 1 ? 'not-allowed' : 'pointer', fontSize: '13px' }}
                    >
                      上一頁
                    </button>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {historyPage} / {totalPages}（共 {historyTotal} 筆）
                    </span>
                    <button
                      onClick={() => fetchHistory(historyPage + 1)}
                      disabled={historyPage >= totalPages}
                      style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: historyPage >= totalPages ? 'var(--background)' : 'var(--surface)', color: historyPage >= totalPages ? 'var(--text-secondary)' : 'var(--text-primary)', cursor: historyPage >= totalPages ? 'not-allowed' : 'pointer', fontSize: '13px' }}
                    >
                      下一頁
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Leaves */}
      {activeTab === 'leaves' && (
        <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          {leavesLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>載入中...</div>
          ) : leavesList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              無請假紀錄
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--background)' }}>
                    <th style={thStyle}>學生姓名</th>
                    <th style={thStyle}>請假日期</th>
                    <th style={thStyle}>原因</th>
                    <th style={thStyle}>狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {leavesList.map((l) => (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ ...tdStyle, fontWeight: 'bold', color: 'var(--text-primary)' }}>{l.studentName}</td>
                      <td style={tdStyle}>{l.leaveDate}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{l.reason || '—'}</td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold',
                          background: l.status === 'approved' ? '#D4E8D4' : l.status === 'rejected' ? '#F8D7DA' : '#FFF3CD',
                          color: l.status === 'approved' ? '#2D6A4F' : l.status === 'rejected' ? '#721C24' : '#856404',
                        }}>
                          {l.status === 'approved' ? '已核准' : l.status === 'rejected' ? '已拒絕' : '待審核'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {message && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(74, 74, 74, 0.9)', color: 'white', padding: '16px 32px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          {message}
        </div>
      )}
    </main>
  )
}
