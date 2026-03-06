'use client'

import { useEffect, useMemo, useState } from 'react'
import { BackButton } from '@/components/ui/BackButton'
import { resolveCurrentTeacher, type CurrentTeacher } from '@/lib/current-teacher'
import { formatDate, formatTime, getMonthRange, getWeekday } from '@/lib/format'

interface ScheduleRecord {
  id: string
  course_name: string
  subject?: string
  room?: string
  scheduled_date: string
  start_time: string
  end_time: string
  status: string
  course_type?: string
  student_name?: string
}

function statusLabel(status: string) {
  if (status === 'completed') return { text: '已完成', cls: 'bg-[#7B9E89]/10 text-[#7B9E89]' }
  if (status === 'cancelled') return { text: '已取消', cls: 'bg-[#B5706E]/10 text-[#B5706E]' }
  if (status === 'rescheduled') return { text: '已改期', cls: 'bg-[#9B7FB6]/10 text-[#9B7FB6]' }
  return { text: '待上課', cls: 'bg-[#C4956A]/10 text-[#C4956A]' }
}

export default function TeacherSchedulesPage() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [teacher, setTeacher] = useState<CurrentTeacher | null>(null)
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const monthRange = useMemo(() => getMonthRange(monthOffset), [monthOffset])

  // Resolve teacher identity once on mount
  useEffect(() => {
    resolveCurrentTeacher().then(setTeacher)
  }, [])

  // Fetch schedules when teacher or month changes
  useEffect(() => {
    if (!teacher) return

    let cancelled = false

    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(
          `/api/w8/schedules?teacher_id=${teacher.id}&start_date=${monthRange.start}&end_date=${monthRange.end}`,
          { credentials: 'include' }
        )

        if (!res.ok) {
          throw new Error('載入課表失敗')
        }

        const result = await res.json()
        const payload = result.data ?? result
        const rawSchedules = Array.isArray(payload.schedules) ? payload.schedules : Array.isArray(payload) ? payload : []
        if (cancelled) return

        setSchedules(rawSchedules as ScheduleRecord[])
      } catch (err) {
        if (!cancelled) {
          setSchedules([])
          setError(err instanceof Error ? err.message : '載入失敗')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [teacher, monthRange.start, monthRange.end])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton fallbackUrl="/dashboard" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">我的課表</h1>
          <p className="text-sm text-text-muted">{teacher ? `${teacher.name} 的授課安排` : '查看本月授課安排'}</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button type="button" onClick={() => setMonthOffset((value) => value - 1)} className="p-2 text-text-muted hover:text-text rounded-lg hover:bg-surface">&larr; 上月</button>
        <span className="font-medium text-text">{monthRange.label}</span>
        <button type="button" onClick={() => setMonthOffset((value) => value + 1)} className="p-2 text-text-muted hover:text-text rounded-lg hover:bg-surface">下月 &rarr;</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-[#B5706E]/20 bg-[#B5706E]/10 px-4 py-5 text-sm text-[#B5706E]">{error}</div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-12 text-text-muted bg-surface rounded-2xl border border-border">本月尚無授課安排</div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => {
            const status = statusLabel(schedule.status)
            return (
              <div key={schedule.id} className="bg-white rounded-2xl shadow-sm border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-text">{schedule.course_name}</h2>
                    <p className="text-sm text-text-muted mt-1">
                      {formatDate(schedule.scheduled_date)}（週{getWeekday(schedule.scheduled_date)}） {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.cls}`}>{status.text}</span>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-text-muted">
                  <div>科目：{schedule.subject || '—'}</div>
                  <div>教室：{schedule.room || '—'}</div>
                  <div>課程型態：{schedule.course_type === 'individual' ? '個別指導' : schedule.course_type === 'daycare' ? '安親班' : '團班'}</div>
                </div>

                {schedule.student_name && (
                  <div className="mt-3 text-sm text-text-muted">學生：{schedule.student_name}</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
