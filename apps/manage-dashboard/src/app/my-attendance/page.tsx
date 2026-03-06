'use client'

import { useEffect, useMemo, useState } from 'react'
import { BackButton } from '@/components/ui/BackButton'
import { resolveCurrentTeacher, type CurrentTeacher } from '@/lib/current-teacher'

interface AttendanceRecord {
  id: string
  date: string
  type: string
  status: string
  reason?: string
  check_in_time?: string | null
  approve_note?: string | null
}

const API_BASE = ''

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7)
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function formatType(record: AttendanceRecord) {
  if (record.type === 'checkin') return record.check_in_time && record.check_in_time.slice(11, 16) > '09:15' ? '遲到' : '出勤'
  if (record.type === 'absent') return '缺勤'
  if (record.type === 'sick_leave') return '病假'
  if (record.type === 'personal_leave') return '事假'
  if (record.type === 'family_leave') return '家庭假'
  if (record.type === 'annual_leave') return '特休'
  if (record.type === 'other_leave') return '其他假'
  return record.type
}

function statusLabel(status: string) {
  if (status === 'approved') return { text: '已核准', cls: 'bg-[#7B9E89]/10 text-[#7B9E89]' }
  if (status === 'rejected') return { text: '已駁回', cls: 'bg-[#B5706E]/10 text-[#B5706E]' }
  return { text: '待審核', cls: 'bg-[#C4956A]/10 text-[#C4956A]' }
}

export default function MyAttendancePage() {
  const [month, setMonth] = useState(getCurrentMonth())
  const [teacher, setTeacher] = useState<CurrentTeacher | null>(null)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const summary = useMemo(() => ({
    present: records.filter((record) => record.type === 'checkin' && record.status === 'approved').length,
    absent: records.filter((record) => record.type === 'absent' && record.status === 'approved').length,
    leave: records.filter((record) => record.type.includes('leave') && record.status === 'approved').length,
  }), [records])

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        const currentTeacher = await resolveCurrentTeacher()
        if (!currentTeacher) {
          throw new Error('找不到對應的教師身份資料')
        }
        if (cancelled) return

        setTeacher(currentTeacher)

        const res = await fetch(
          `${API_BASE}/api/teacher-attendance?teacherId=${currentTeacher.id}&month=${month}`,
          { credentials: 'include' }
        )
        if (!res.ok) {
          throw new Error('載入出缺勤紀錄失敗')
        }

        const result = await res.json()
        const payload = result.data ?? result
        const rawRecords = Array.isArray(payload.records) ? payload.records : Array.isArray(payload) ? payload : []
        if (cancelled) return

        setRecords(rawRecords as AttendanceRecord[])
      } catch (err) {
        if (!cancelled) {
          setRecords([])
          setError(err instanceof Error ? err.message : '載入失敗')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [month])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton fallbackUrl="/dashboard" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">我的出缺勤紀錄</h1>
          <p className="text-sm text-text-muted">{teacher ? `${teacher.name} 的每月出缺勤紀錄` : '查看個人出缺勤狀態'}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4">
        <div className="grid grid-cols-3 gap-3 text-center flex-1">
          <div>
            <p className="text-xs text-text-muted">出勤</p>
            <p className="text-lg font-semibold text-[#7B9E89]">{summary.present}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">缺勤</p>
            <p className="text-lg font-semibold text-[#B5706E]">{summary.absent}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">請假</p>
            <p className="text-lg font-semibold text-[#C4956A]">{summary.leave}</p>
          </div>
        </div>
        <input
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className="px-3 py-2 rounded-xl border border-border bg-background"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-[#B5706E]/20 bg-[#B5706E]/10 px-4 py-5 text-sm text-[#B5706E]">{error}</div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-text-muted bg-surface rounded-2xl border border-border">本月尚無出缺勤紀錄</div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const status = statusLabel(record.status)
            return (
              <div key={record.id} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-text">{formatDate(record.date)} {formatType(record)}</h2>
                    <p className="text-sm text-text-muted mt-1">
                      {record.check_in_time ? `簽到時間：${record.check_in_time.slice(11, 16)}` : (record.reason || record.approve_note || '—')}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.cls}`}>{status.text}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}