'use client'

import { useEffect, useState, useCallback } from 'react'
import { BackButton } from '@/components/ui/BackButton'

// ============================================================
// Types
// ============================================================

type AttendanceType =
  | 'checkin'
  | 'sick_leave'
  | 'personal_leave'
  | 'annual_leave'
  | 'other_leave'

type AttendanceStatus = 'pending' | 'approved' | 'rejected'

interface AttendanceRecord {
  id: string
  teacher_id: string
  teacher_name: string
  date: string
  type: AttendanceType
  status: AttendanceStatus
  check_in_time: string | null
  reason: string | null
  approved_by: string | null
  approved_at: string | null
  approve_note: string | null
  substitute_teacher_id: string | null
  substitute_teacher_name: string | null
  substitute_note: string | null
}

interface Teacher {
  id: string
  full_name: string
  status: string
}

interface Stats {
  teacher_id: string
  teacher_name: string
  attendance_days: number
  late_count: number
  leave_days: number
  substitute_count: number
  attendance_rate: number | null
}

type Tab = 'calendar' | 'checkin' | 'leave' | 'stats' | 'review'

const TYPE_LABEL: Record<AttendanceType, string> = {
  checkin: '簽到',
  sick_leave: '病假',
  personal_leave: '事假',
  annual_leave: '年假',
  other_leave: '其他假',
}

const STATUS_ICON: Record<AttendanceType, string> = {
  checkin: '✅',
  sick_leave: '🏖️',
  personal_leave: '🏖️',
  annual_leave: '🏖️',
  other_leave: '🏖️',
}

function getStatusIcon(record: AttendanceRecord): string {
  if (record.substitute_teacher_id) return '🔄'
  if (record.type === 'checkin') {
    if (record.check_in_time) {
      // 09:15 以後算遲到
      const time = record.check_in_time.slice(11, 16)
      return time > '09:15' ? '⏰' : '✅'
    }
    return '✅'
  }
  if (record.status === 'pending') return '⏳'
  return STATUS_ICON[record.type] ?? '❓'
}

function getStatusBadge(status: AttendanceStatus): string {
  if (status === 'approved') return 'bg-[#7B9E89]/10 text-[#7B9E89]'
  if (status === 'rejected') return 'bg-[#B5706E]/10 text-[#B5706E]'
  return 'bg-[#C4956A]/10 text-[#C4956A]'
}

function getStatusLabel(status: AttendanceStatus): string {
  if (status === 'approved') return '已核准'
  if (status === 'rejected') return '已駁回'
  return '待審核'
}

// ============================================================
// Calendar helpers
// ============================================================

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const date = new Date(year, month - 1, 1)
  while (date.getMonth() === month - 1) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}

// ============================================================
// Main Component
// ============================================================

export default function TeacherAttendancePage() {
  const now = new Date()
  const [activeTab, setActiveTab] = useState<Tab>('calendar')
  const [currentMonth, setCurrentMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [stats, setStats] = useState<Stats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Quick checkin form
  const [checkinTeacherId, setCheckinTeacherId] = useState('')
  const [checkinSaving, setCheckinSaving] = useState(false)
  const [checkinMsg, setCheckinMsg] = useState<string | null>(null)

  // Leave form
  const [leaveTeacherId, setLeaveTeacherId] = useState('')
  const [leaveDate, setLeaveDate] = useState(now.toISOString().split('T')[0])
  const [leaveType, setLeaveType] = useState<AttendanceType>('sick_leave')
  const [leaveReason, setLeaveReason] = useState('')
  const [leaveSubstitute, setLeaveSubstitute] = useState('')
  const [leaveSaving, setLeaveSaving] = useState(false)
  const [leaveMsg, setLeaveMsg] = useState<string | null>(null)

  // Approve modal
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [approveNote, setApproveNote] = useState('')
  const [approveSaving, setApproveSaving] = useState(false)

  // Substitute modal
  const [substituteRecordId, setSubstituteRecordId] = useState<string | null>(null)
  const [substituteTeacherId, setSubstituteTeacherId] = useState('')
  const [substituteNote, setSubstituteNote] = useState('')
  const [substituteSaving, setSubstituteSaving] = useState(false)

  // ============================================================
  // Data loading
  // ============================================================

  const loadTeachers = useCallback(async () => {
    try {
      const res = await fetch('/api/w8/teachers?status=active&limit=100', {
        credentials: 'include',
      })
      if (res.ok) {
        const json = await res.json()
        const payload = json.data ?? json
        setTeachers(payload.teachers ?? payload ?? [])
      }
    } catch {
      // non-fatal
    }
  }, [])

  const loadRecords = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/teacher-attendance?month=${currentMonth}&limit=200`,
        { credentials: 'include' }
      )
      if (res.ok) {
        const json = await res.json()
        const payload = json.data ?? json
        setRecords(payload.records ?? [])
      }
    } catch {
      // non-fatal
    }
  }, [currentMonth])

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/teacher-attendance/stats?month=${currentMonth}`,
        { credentials: 'include' }
      )
      if (res.ok) {
        const json = await res.json()
        const payload = json.data ?? json
        setStats(payload.stats ?? [])
      }
    } catch {
      // non-fatal
    }
  }, [currentMonth])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([loadTeachers(), loadRecords(), loadStats()])
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [loadTeachers, loadRecords, loadStats])

  useEffect(() => { loadAll() }, [loadAll])

  // ============================================================
  // Actions
  // ============================================================

  const handleCheckin = async () => {
    if (!checkinTeacherId) { setCheckinMsg('請選擇老師'); return }
    setCheckinSaving(true)
    setCheckinMsg(null)
    try {
      const now = new Date()
      const date = now.toISOString().split('T')[0]
      const checkInTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const res = await fetch('/api/teacher-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ teacherId: checkinTeacherId, date, type: 'checkin', checkInTime }),
      })
      const json = await res.json()
      if (res.ok) {
        setCheckinMsg(`✅ 簽到成功（${checkInTime}）`)
        setCheckinTeacherId('')
        await loadRecords()
        await loadStats()
      } else {
        setCheckinMsg(`❌ ${json.error ?? '簽到失敗'}`)
      }
    } catch {
      setCheckinMsg('❌ 網路錯誤')
    } finally {
      setCheckinSaving(false)
    }
  }

  const handleLeaveSubmit = async () => {
    if (!leaveTeacherId) { setLeaveMsg('請選擇老師'); return }
    if (!leaveReason.trim()) { setLeaveMsg('請填寫請假原因'); return }
    setLeaveSaving(true)
    setLeaveMsg(null)
    try {
      const body: Record<string, string> = {
        teacherId: leaveTeacherId,
        date: leaveDate,
        type: leaveType,
        reason: leaveReason,
      }
      const res = await fetch('/api/teacher-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (res.ok) {
        setLeaveMsg('✅ 請假申請已提交，等待審核')
        setLeaveTeacherId('')
        setLeaveReason('')
        setLeaveSubstitute('')
        // if substitute set, also set it
        if (leaveSubstitute && json.data?.record?.id) {
          await fetch(`/api/teacher-attendance/${json.data.record.id}/substitute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ substituteTeacherId: leaveSubstitute }),
          })
        }
        await loadRecords()
        await loadStats()
      } else {
        setLeaveMsg(`❌ ${json.error ?? '提交失敗'}`)
      }
    } catch {
      setLeaveMsg('❌ 網路錯誤')
    } finally {
      setLeaveSaving(false)
    }
  }

  const handleApprove = async (approved: boolean) => {
    if (!approvingId) return
    setApproveSaving(true)
    try {
      const res = await fetch(`/api/teacher-attendance/${approvingId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ approved, note: approveNote }),
      })
      if (res.ok) {
        setApprovingId(null)
        setApproveNote('')
        await loadRecords()
        await loadStats()
      }
    } catch {
      // ignore
    } finally {
      setApproveSaving(false)
    }
  }

  const handleSubstituteSubmit = async () => {
    if (!substituteRecordId || !substituteTeacherId) return
    setSubstituteSaving(true)
    try {
      const res = await fetch(`/api/teacher-attendance/${substituteRecordId}/substitute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ substituteTeacherId, note: substituteNote }),
      })
      if (res.ok) {
        setSubstituteRecordId(null)
        setSubstituteTeacherId('')
        setSubstituteNote('')
        await loadRecords()
      }
    } catch {
      // ignore
    } finally {
      setSubstituteSaving(false)
    }
  }

  // ============================================================
  // Calendar data
  // ============================================================

  const [year, month] = currentMonth.split('-').map(Number)
  const days = getDaysInMonth(year, month)

  // Map: dateStr -> records[]
  const recordsByDate = records.reduce<Record<string, AttendanceRecord[]>>((acc, r) => {
    const d = r.date.slice(0, 10)
    if (!acc[d]) acc[d] = []
    acc[d].push(r)
    return acc
  }, {})

  const pendingRecords = records.filter(
    (r) => r.type !== 'checkin' && r.status === 'pending'
  )

  // ============================================================
  // Month navigation
  // ============================================================

  const changeMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1)
    setCurrentMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    )
  }

  // ============================================================
  // Render
  // ============================================================

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 bg-surface-hover animate-pulse rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-hover animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-surface-hover animate-pulse rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <BackButton />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-text">師資出缺勤管理</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeMonth(-1)}
            className="px-3 py-2 border border-border rounded-xl hover:bg-surface text-text"
          >
            ‹
          </button>
          <span className="px-4 py-2 font-medium text-text">
            {year} 年 {month} 月
          </span>
          <button
            onClick={() => changeMonth(1)}
            className="px-3 py-2 border border-border rounded-xl hover:bg-surface text-text"
          >
            ›
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex justify-between items-center">
          <span>{error}</span>
          <button onClick={loadAll} className="text-sm underline">重試</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface rounded-xl p-1 w-fit">
        {(
          [
            { key: 'calendar', label: '月曆' },
            { key: 'checkin', label: '快速簽到' },
            { key: 'leave', label: '請假申請' },
            { key: 'stats', label: '統計' },
            { key: 'review', label: `審核${pendingRecords.length > 0 ? ` (${pendingRecords.length})` : ''}` },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.key
                ? 'bg-white shadow-sm text-primary'
                : 'text-text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Calendar Tab ── */}
      {activeTab === 'calendar' && (
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6 space-y-4">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-text-muted mb-2">
            {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>
          {/* Offset for first day */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: days[0].getDay() }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map((day) => {
              const dateStr = day.toISOString().split('T')[0]
              const dayRecords = recordsByDate[dateStr] ?? []
              const isToday = dateStr === now.toISOString().split('T')[0]
              return (
                <div
                  key={dateStr}
                  className={`min-h-[80px] rounded-xl border p-2 text-xs ${
                    isToday
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-surface/30'
                  }`}
                >
                  <div className={`font-medium mb-1 ${isToday ? 'text-primary' : 'text-text-muted'}`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayRecords.slice(0, 3).map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-1 truncate"
                        title={`${r.teacher_name} — ${TYPE_LABEL[r.type]}`}
                      >
                        <span>{getStatusIcon(r)}</span>
                        <span className="truncate text-text text-[10px]">{r.teacher_name}</span>
                      </div>
                    ))}
                    {dayRecords.length > 3 && (
                      <div className="text-text-muted text-[10px]">+{dayRecords.length - 3} 筆</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 pt-2 border-t border-border text-xs text-text-muted">
            {[
              { icon: '✅', label: '出勤' },
              { icon: '⏰', label: '遲到' },
              { icon: '🏖️', label: '請假' },
              { icon: '🔄', label: '代課' },
              { icon: '⏳', label: '待審核' },
            ].map((item) => (
              <span key={item.label} className="flex items-center gap-1">
                {item.icon} {item.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Checkin Tab ── */}
      {activeTab === 'checkin' && (
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6 max-w-md space-y-4">
          <h2 className="text-lg font-semibold text-text">快速簽到</h2>
          <p className="text-sm text-text-muted">
            選擇老師後點「簽到」，自動記錄當下時間。
          </p>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-text">選擇老師</label>
            <select
              value={checkinTeacherId}
              onChange={(e) => setCheckinTeacherId(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-border bg-white text-text"
            >
              <option value="">— 請選擇 —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </div>

          {checkinMsg && (
            <div className={`p-3 rounded-xl text-sm ${
              checkinMsg.startsWith('✅') ? 'bg-[#7B9E89]/10 text-[#7B9E89]' : 'bg-red-50 text-red-600'
            }`}>
              {checkinMsg}
            </div>
          )}

          <button
            onClick={handleCheckin}
            disabled={checkinSaving || !checkinTeacherId}
            className="w-full px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            {checkinSaving ? '簽到中...' : '✅ 立即簽到'}
          </button>
        </div>
      )}

      {/* ── Leave Tab ── */}
      {activeTab === 'leave' && (
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6 max-w-lg space-y-4">
          <h2 className="text-lg font-semibold text-text">請假申請</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-text">選擇老師</label>
              <select
                value={leaveTeacherId}
                onChange={(e) => setLeaveTeacherId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-white text-text"
              >
                <option value="">— 請選擇 —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-text">請假日期</label>
              <input
                type="date"
                value={leaveDate}
                onChange={(e) => setLeaveDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-white text-text"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-text">請假類型</label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['sick_leave', '病假'],
                  ['personal_leave', '事假'],
                  ['annual_leave', '年假'],
                  ['other_leave', '其他'],
                ] as [AttendanceType, string][]
              ).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setLeaveType(val)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    leaveType === val
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-text-muted hover:border-primary/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-text">請假原因</label>
            <textarea
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              rows={3}
              placeholder="請填寫請假原因..."
              className="w-full px-3 py-2 rounded-xl border border-border bg-white text-text resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-text">代課老師（選填）</label>
            <select
              value={leaveSubstitute}
              onChange={(e) => setLeaveSubstitute(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-white text-text"
            >
              <option value="">— 不指定 —</option>
              {teachers
                .filter((t) => t.id !== leaveTeacherId)
                .map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
            </select>
          </div>

          {leaveMsg && (
            <div className={`p-3 rounded-xl text-sm ${
              leaveMsg.startsWith('✅') ? 'bg-[#7B9E89]/10 text-[#7B9E89]' : 'bg-red-50 text-red-600'
            }`}>
              {leaveMsg}
            </div>
          )}

          <button
            onClick={handleLeaveSubmit}
            disabled={leaveSaving || !leaveTeacherId || !leaveReason.trim()}
            className="w-full px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            {leaveSaving ? '提交中...' : '🏖️ 提交請假申請'}
          </button>
        </div>
      )}

      {/* ── Stats Tab ── */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          {/* Summary cards */}
          {stats.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
                <div className="text-3xl font-bold text-[#7B9E89]">
                  {Math.round(
                    stats.reduce((s, r) => s + (r.attendance_rate ?? 0), 0) / stats.length
                  )}%
                </div>
                <div className="text-sm text-text-muted">平均出勤率</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
                <div className="text-3xl font-bold text-[#C4956A]">
                  {stats.reduce((s, r) => s + Number(r.late_count), 0)}
                </div>
                <div className="text-sm text-text-muted">總遲到次數</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
                <div className="text-3xl font-bold text-[#B5706E]">
                  {stats.reduce((s, r) => s + Number(r.leave_days), 0)}
                </div>
                <div className="text-sm text-text-muted">總請假天數</div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-border p-4">
                <div className="text-3xl font-bold text-primary">
                  {stats.reduce((s, r) => s + Number(r.substitute_count), 0)}
                </div>
                <div className="text-sm text-text-muted">代課次數</div>
              </div>
            </div>
          )}

          {/* Per-teacher stats table */}
          <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">老師</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-text-muted">出勤天數</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-text-muted">出勤率</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-text-muted">遲到次數</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-text-muted">請假天數</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-text-muted">代課次數</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.map((s) => (
                  <tr key={s.teacher_id} className="hover:bg-surface/50">
                    <td className="px-6 py-4 font-medium text-text">{s.teacher_name}</td>
                    <td className="px-6 py-4 text-center text-text">{s.attendance_days}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-medium ${
                        (s.attendance_rate ?? 0) >= 90
                          ? 'text-[#7B9E89]'
                          : (s.attendance_rate ?? 0) >= 70
                          ? 'text-[#C4956A]'
                          : 'text-[#B5706E]'
                      }`}>
                        {s.attendance_rate !== null ? `${s.attendance_rate}%` : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-text">{s.late_count}</td>
                    <td className="px-6 py-4 text-center text-text">{s.leave_days}</td>
                    <td className="px-6 py-4 text-center text-text">{s.substitute_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stats.length === 0 && (
              <div className="text-center py-12 text-text-muted">本月尚無統計資料</div>
            )}
          </div>
        </div>
      )}

      {/* ── Review Tab ── */}
      {activeTab === 'review' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text">待審核請假申請</h2>

          {pendingRecords.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-border p-12 text-center text-text-muted">
              目前沒有待審核的請假申請
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRecords.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl shadow-sm border border-border p-5 flex items-center justify-between flex-wrap gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text">{r.teacher_name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(r.status)}`}>
                        {getStatusLabel(r.status)}
                      </span>
                    </div>
                    <div className="text-sm text-text-muted">
                      {r.date.slice(0, 10)} · {TYPE_LABEL[r.type]}
                    </div>
                    {r.reason && (
                      <div className="text-sm text-text">{r.reason}</div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSubstituteRecordId(r.id); setSubstituteTeacherId(''); setSubstituteNote('') }}
                      className="px-3 py-2 text-sm border border-border rounded-xl hover:bg-surface text-text"
                    >
                      🔄 代課
                    </button>
                    <button
                      onClick={() => { setApprovingId(r.id); setApproveNote('') }}
                      className="px-3 py-2 text-sm bg-primary text-white rounded-xl hover:bg-primary/90"
                    >
                      審核
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* All records list */}
          <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-medium text-text">本月所有請假紀錄</h3>
            </div>
            <table className="w-full">
              <thead className="bg-surface">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted">老師</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted">日期</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted">類型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted">狀態</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted">代課老師</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records
                  .filter((r) => r.type !== 'checkin')
                  .map((r) => (
                    <tr key={r.id} className="hover:bg-surface/50">
                      <td className="px-6 py-3 text-sm text-text">{r.teacher_name}</td>
                      <td className="px-6 py-3 text-sm text-text-muted">{r.date.slice(0, 10)}</td>
                      <td className="px-6 py-3 text-sm text-text">{TYPE_LABEL[r.type]}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(r.status)}`}>
                          {getStatusLabel(r.status)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-text-muted">
                        {r.substitute_teacher_name ?? '—'}
                      </td>
                      <td className="px-6 py-3">
                        {r.status === 'pending' && (
                          <button
                            onClick={() => { setApprovingId(r.id); setApproveNote('') }}
                            className="text-xs text-primary underline"
                          >
                            審核
                          </button>
                        )}
                        {!r.substitute_teacher_id && r.status !== 'rejected' && (
                          <button
                            onClick={() => { setSubstituteRecordId(r.id); setSubstituteTeacherId(''); setSubstituteNote('') }}
                            className="ml-2 text-xs text-text-muted underline"
                          >
                            設代課
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {records.filter((r) => r.type !== 'checkin').length === 0 && (
              <div className="text-center py-8 text-text-muted text-sm">本月無請假記錄</div>
            )}
          </div>
        </div>
      )}

      {/* ── Approve Modal ── */}
      {approvingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-text">審核請假申請</h3>

            <div className="space-y-1">
              <label className="text-sm font-medium text-text">備註（選填）</label>
              <textarea
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                rows={3}
                placeholder="填寫審核備註..."
                className="w-full px-3 py-2 rounded-xl border border-border bg-white text-text resize-none"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setApprovingId(null)}
                className="px-4 py-2 border border-border rounded-xl text-text hover:bg-surface"
              >
                取消
              </button>
              <button
                onClick={() => handleApprove(false)}
                disabled={approveSaving}
                className="px-4 py-2 bg-[#B5706E] text-white rounded-xl hover:bg-[#B5706E]/90 disabled:opacity-50"
              >
                駁回
              </button>
              <button
                onClick={() => handleApprove(true)}
                disabled={approveSaving}
                className="px-4 py-2 bg-[#7B9E89] text-white rounded-xl hover:bg-[#7B9E89]/90 disabled:opacity-50"
              >
                {approveSaving ? '處理中...' : '批准'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Substitute Modal ── */}
      {substituteRecordId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-text">設定代課老師</h3>

            <div className="space-y-1">
              <label className="text-sm font-medium text-text">代課老師</label>
              <select
                value={substituteTeacherId}
                onChange={(e) => setSubstituteTeacherId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-white text-text"
              >
                <option value="">— 請選擇 —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-text">備註（選填）</label>
              <input
                type="text"
                value={substituteNote}
                onChange={(e) => setSubstituteNote(e.target.value)}
                placeholder="代課說明..."
                className="w-full px-3 py-2 rounded-xl border border-border bg-white text-text"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSubstituteRecordId(null)}
                className="px-4 py-2 border border-border rounded-xl text-text hover:bg-surface"
              >
                取消
              </button>
              <button
                onClick={handleSubstituteSubmit}
                disabled={substituteSaving || !substituteTeacherId}
                className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50"
              >
                {substituteSaving ? '設定中...' : '確認'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
