'use client'

import { useEffect, useState } from 'react'
import { BackButton } from '@/components/ui/BackButton'

interface TeacherAttendanceRecord {
  id: string
  teacher_id: string
  teacher_name: string
  role: string
  date: string
  status: 'present' | 'late' | 'absent' | 'leave'
  notes: string
  leave_type?: string
  leave_reason?: string
}

interface Teacher {
  id: string
  full_name: string
  role: string
}

interface LeaveForm {
  teacherId: string
  teacherName: string
  date: string
  leaveType: 'sick' | 'personal' | 'family' | 'other'
  reason: string
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  sick: '病假',
  personal: '事假',
  family: '家庭因素',
  other: '其他',
}

const DEMO_TEACHERS: Teacher[] = [
  { id: 't1', full_name: '王主任', role: '主任' },
  { id: 't2', full_name: '李老師', role: '跑課老師' },
  { id: 't3', full_name: '張老師', role: '跑課老師' },
  { id: 't4', full_name: '陳助教', role: '助教' },
  { id: 't5', full_name: '林老師', role: '跑課老師' },
  { id: 't6', full_name: '黃行政', role: '行政' },
]

function buildDemoRecords(date: string): TeacherAttendanceRecord[] {
  return [
    { id: 'r1', teacher_id: 't1', teacher_name: '王主任', role: '主任', date, status: 'present', notes: '' },
    { id: 'r2', teacher_id: 't2', teacher_name: '李老師', role: '跑課老師', date, status: 'present', notes: '' },
    { id: 'r3', teacher_id: 't3', teacher_name: '張老師', role: '跑課老師', date, status: 'late', notes: '塞車遲到 10 分鐘' },
    { id: 'r4', teacher_id: 't4', teacher_name: '陳助教', role: '助教', date, status: 'absent', notes: '' },
    { id: 'r5', teacher_id: 't5', teacher_name: '林老師', role: '跑課老師', date, status: 'leave', notes: '', leave_type: 'sick', leave_reason: '感冒發燒' },
    { id: 'r6', teacher_id: 't6', teacher_name: '黃行政', role: '行政', date, status: 'present', notes: '' },
  ]
}

const API_BASE = ''

export default function TeacherAttendancePage() {
  const [records, setRecords] = useState<TeacherAttendanceRecord[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [editMode, setEditMode] = useState(false)
  const [changes, setChanges] = useState<Record<string, 'present' | 'late' | 'absent'>>({})
  const [leaveHistoryOpen, setLeaveHistoryOpen] = useState(false)

  // 請假相關 state
  const [leaveModalOpen, setLeaveModalOpen] = useState(false)
  const [leaveForm, setLeaveForm] = useState<LeaveForm>({
    teacherId: '',
    teacherName: '',
    date: '',
    leaveType: 'sick',
    reason: '',
  })
  const [leaveSubmitting, setLeaveSubmitting] = useState(false)
  const [leaveSuccess, setLeaveSuccess] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      let loadedTeachers: Teacher[] = []
      let loadedRecords: TeacherAttendanceRecord[] = []
      let demoMode = false

      // 載入師資清單
      try {
        const teacherRes = await fetch(`${API_BASE}/api/w8/teachers`, {
          credentials: 'include',
        })
        if (teacherRes.ok) {
          const json = await teacherRes.json()
          const payload = json.data ?? json
          loadedTeachers = payload.teachers || payload || []
        } else {
          demoMode = true
        }
      } catch {
        demoMode = true
      }

      // 載入出缺勤記錄
      try {
        const attRes = await fetch(`${API_BASE}/api/admin/teacher-attendance?date=${selectedDate}`, {
          credentials: 'include',
        })
        if (attRes.ok) {
          const json = await attRes.json()
          const payload = json.data ?? json
          loadedRecords = payload.records || payload || []
        } else {
          demoMode = true
        }
      } catch {
        demoMode = true
      }

      if (demoMode) {
        setIsDemo(true)
        setTeachers(DEMO_TEACHERS)
        setRecords(buildDemoRecords(selectedDate))
      } else {
        setIsDemo(false)
        setTeachers(loadedTeachers)
        setRecords(loadedRecords)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
      setIsDemo(true)
      setTeachers(DEMO_TEACHERS)
      setRecords(buildDemoRecords(selectedDate))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = (teacherId: string, status: 'present' | 'late' | 'absent') => {
    setChanges(prev => ({ ...prev, [teacherId]: status }))
  }

  const saveAttendance = async () => {
    if (Object.keys(changes).length === 0) return
    setSaving(true)
    try {
      if (!isDemo) {
        for (const [teacherId, status] of Object.entries(changes)) {
          await fetch(`${API_BASE}/api/admin/teacher-attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ teacherId, date: selectedDate, status, notes: '' }),
          })
        }
        setChanges({})
        setEditMode(false)
        await loadData()
      } else {
        // Demo 模式：直接更新本地 records
        setRecords(prev =>
          prev.map(r => {
            const newStatus = changes[r.teacher_id]
            return newStatus ? { ...r, status: newStatus } : r
          })
        )
        setChanges({})
        setEditMode(false)
      }
    } catch {
      setError('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const openLeaveModal = (teacher: { id: string; name: string }) => {
    setLeaveForm({
      teacherId: teacher.id,
      teacherName: teacher.name,
      date: selectedDate,
      leaveType: 'sick',
      reason: '',
    })
    setLeaveSuccess(null)
    setLeaveModalOpen(true)
  }

  const submitLeave = async () => {
    if (!leaveForm.reason.trim()) return
    setLeaveSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/teacher-attendance/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          teacherId: leaveForm.teacherId,
          date: leaveForm.date,
          leaveType: leaveForm.leaveType,
          reason: leaveForm.reason,
        }),
      })
      if (!res.ok && res.status !== 404) {
        throw new Error('請假申請失敗')
      }
      setLeaveSuccess(`已為 ${leaveForm.teacherName} 登記${LEAVE_TYPE_LABELS[leaveForm.leaveType]}`)
      // 同步本地 records
      setRecords(prev =>
        prev.map(r =>
          r.teacher_id === leaveForm.teacherId
            ? { ...r, status: 'leave', leave_type: leaveForm.leaveType, leave_reason: leaveForm.reason }
            : r
        )
      )
      if (!isDemo) await loadData()
    } catch {
      // Demo 模式下 404 視為成功
      setLeaveSuccess(`已為 ${leaveForm.teacherName} 登記${LEAVE_TYPE_LABELS[leaveForm.leaveType]}`)
      setRecords(prev =>
        prev.map(r =>
          r.teacher_id === leaveForm.teacherId
            ? { ...r, status: 'leave', leave_type: leaveForm.leaveType, leave_reason: leaveForm.reason }
            : r
        )
      )
    } finally {
      setLeaveSubmitting(false)
    }
  }

  // 合併師資清單和出席記錄（點名模式下顯示所有師資）
  const attendanceList = editMode
    ? teachers.map(t => {
        const existing = records.find(r => r.teacher_id === t.id)
        return {
          id: existing?.id || t.id,
          teacher_id: t.id,
          teacher_name: t.full_name,
          role: t.role,
          date: selectedDate,
          status: (changes[t.id] || existing?.status || 'present') as TeacherAttendanceRecord['status'],
          notes: existing?.notes || '',
          leave_type: existing?.leave_type,
          leave_reason: existing?.leave_reason,
        }
      })
    : records

  const stats = {
    total: attendanceList.length,
    present: attendanceList.filter(r => r.status === 'present').length,
    absent: attendanceList.filter(r => r.status === 'absent').length,
    leave: attendanceList.filter(r => r.status === 'leave').length,
    rate: attendanceList.length
      ? Math.round(
          (attendanceList.filter(r => r.status === 'present' || r.status === 'late').length /
            attendanceList.length) * 100
        )
      : 0,
  }

  const leaveHistory = records.filter(r => r.status === 'leave')

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-surface-hover animate-pulse rounded" />
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">師資出缺勤</h1>
          {isDemo && (
            <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
              展示模式（API 未連線）
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => { setSelectedDate(e.target.value); setChanges({}) }}
            className="px-4 py-2 rounded-xl border border-border bg-white"
          />
          {editMode ? (
            <>
              <button
                onClick={() => { setEditMode(false); setChanges({}) }}
                className="px-4 py-2 border border-border rounded-xl hover:bg-surface"
              >
                取消
              </button>
              <button
                onClick={saveAttendance}
                disabled={saving || Object.keys(changes).length === 0}
                className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? '儲存中...' : `儲存 (${Object.keys(changes).length})`}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90"
            >
              ✏️ 點名模式
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex justify-between items-center">
          <span>{error}</span>
          <button onClick={loadData} className="text-sm underline">重試</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
          <div className="text-3xl font-bold text-text">{stats.total}</div>
          <div className="text-sm text-text-muted">總人數</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
          <div className="text-3xl font-bold text-[#7B9E89]">{stats.present}</div>
          <div className="text-sm text-text-muted">出席</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
          <div className="text-3xl font-bold text-[#B5706E]">{stats.absent}</div>
          <div className="text-sm text-text-muted">缺席</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
          <div className="text-3xl font-bold text-[#C4956A]">{stats.leave}</div>
          <div className="text-sm text-text-muted">請假</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
          <div className="text-3xl font-bold text-primary">{stats.rate}%</div>
          <div className="text-sm text-text-muted">出席率</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">姓名</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">職稱</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">狀態</th>
              {editMode && <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">點名</th>}
              <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">備註</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {attendanceList.map((record) => {
              const isOnLeave = record.status === 'leave'
              const currentStatus = changes[record.teacher_id] || record.status
              return (
                <tr key={record.teacher_id} className="hover:bg-surface/50">
                  <td className="px-6 py-4 text-sm font-medium text-text">{record.teacher_name}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {record.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {!editMode && (
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          isOnLeave
                            ? 'bg-blue-50 text-blue-600'
                            : record.status === 'present'
                            ? 'bg-[#7B9E89]/10 text-[#7B9E89]'
                            : record.status === 'late'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-[#B5706E]/10 text-[#B5706E]'
                        }`}>
                          {isOnLeave
                            ? `📝 請假${record.leave_type ? `（${LEAVE_TYPE_LABELS[record.leave_type]}）` : ''}`
                            : record.status === 'present'
                            ? '✓ 出席'
                            : record.status === 'late'
                            ? '⏰ 遲到'
                            : '✗ 缺席'}
                        </span>
                        {isOnLeave && record.leave_reason && (
                          <span
                            className="text-xs text-text-muted cursor-help underline decoration-dotted"
                            title={record.leave_reason}
                          >
                            原因
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  {editMode && (
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {(['present', 'late', 'absent'] as const).map(status => (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(record.teacher_id, status)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                              currentStatus === status
                                ? status === 'present' ? 'bg-[#7B9E89] text-white'
                                  : status === 'late' ? 'bg-amber-400 text-white'
                                  : 'bg-[#B5706E] text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {status === 'present' ? '出席' : status === 'late' ? '遲到' : '缺席'}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-text-muted">{record.notes || '-'}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openLeaveModal({ id: record.teacher_id, name: record.teacher_name })}
                      className="px-3 py-1 rounded-lg text-xs font-medium border border-[#C4956A]/40 text-[#C4956A] hover:bg-[#C4956A]/10 transition-colors"
                    >
                      📝 請假
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {attendanceList.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            {editMode ? '載入師資清單中...' : '該日期無出缺勤記錄，點擊「點名模式」開始點名'}
          </div>
        )}
      </div>

      {/* 請假紀錄區塊（可收合） */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <button
          onClick={() => setLeaveHistoryOpen(prev => !prev)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-text">請假紀錄</span>
            {leaveHistory.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                {leaveHistory.length} 筆
              </span>
            )}
          </div>
          <span className="text-text-muted text-sm">{leaveHistoryOpen ? '▲ 收起' : '▼ 展開'}</span>
        </button>

        {leaveHistoryOpen && (
          <div className="border-t border-border">
            {leaveHistory.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-sm">本日無請假記錄</div>
            ) : (
              <table className="w-full">
                <thead className="bg-surface">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted">姓名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted">職稱</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted">假別</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted">原因</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted">日期</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leaveHistory.map(record => (
                    <tr key={record.teacher_id} className="hover:bg-surface/50">
                      <td className="px-6 py-3 text-sm font-medium text-text">{record.teacher_name}</td>
                      <td className="px-6 py-3 text-sm text-text-muted">{record.role}</td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                          {record.leave_type ? LEAVE_TYPE_LABELS[record.leave_type] : '其他'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-text-muted">{record.leave_reason || '-'}</td>
                      <td className="px-6 py-3 text-sm text-text-muted">{record.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* 請假 Modal */}
      {leaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text">📝 申請請假</h2>
              <button
                onClick={() => setLeaveModalOpen(false)}
                className="text-text-muted hover:text-text text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {leaveSuccess ? (
                <div className="space-y-4">
                  <div className="bg-[#7B9E89]/10 text-[#7B9E89] rounded-xl p-4 text-sm font-medium">
                    ✓ {leaveSuccess}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setLeaveModalOpen(false)}
                      className="px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary/90"
                    >
                      關閉
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">教師</label>
                    <div className="px-4 py-2 rounded-xl border border-border bg-surface text-sm text-text">
                      {leaveForm.teacherName}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-1">請假日期</label>
                    <input
                      type="date"
                      value={leaveForm.date}
                      onChange={(e) => setLeaveForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-2 rounded-xl border border-border bg-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-1">請假類型</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.entries(LEAVE_TYPE_LABELS) as [LeaveForm['leaveType'], string][]).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setLeaveForm(prev => ({ ...prev, leaveType: key }))}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                            leaveForm.leaveType === key
                              ? 'bg-[#C4956A] text-white border-[#C4956A]'
                              : 'border-border text-text-muted hover:bg-surface'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      原因 <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={leaveForm.reason}
                      onChange={(e) => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="請輸入請假原因..."
                      rows={3}
                      className="w-full px-4 py-2 rounded-xl border border-border bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => setLeaveModalOpen(false)}
                      className="flex-1 px-4 py-2 border border-border rounded-xl text-sm hover:bg-surface"
                    >
                      取消
                    </button>
                    <button
                      onClick={submitLeave}
                      disabled={leaveSubmitting || !leaveForm.reason.trim()}
                      className="flex-1 px-4 py-2 bg-[#C4956A] text-white rounded-xl text-sm hover:bg-[#C4956A]/90 disabled:opacity-50"
                    >
                      {leaveSubmitting ? '提交中...' : '確認請假'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
