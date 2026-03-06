'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
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
}

interface AttendanceStatsRecord {
  attendance_days?: number | string
  late_count?: number | string
  absent_days?: number | string
  total_leave_days?: number | string
  attendance_rate?: number | string | null
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') return Number(value)
  return 0
}

function statusText(status: string) {
  if (status === 'completed') return '已完成'
  if (status === 'cancelled') return '已取消'
  if (status === 'rescheduled') return '已改期'
  return '待上課'
}

export default function TeacherHomePage() {
  const [teacher, setTeacher] = useState<CurrentTeacher | null>(null)
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([])
  const [stats, setStats] = useState<AttendanceStatsRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const monthRange = useMemo(() => getMonthRange(0), [])
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), [])
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

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

        const [scheduleRes, statsRes] = await Promise.all([
          fetch(`/api/w8/schedules?teacher_id=${currentTeacher.id}&start_date=${monthRange.start}&end_date=${monthRange.end}`, { credentials: 'include' }),
          fetch(`/api/teacher-attendance/stats?teacherId=${currentTeacher.id}&month=${currentMonth}`, { credentials: 'include' }),
        ])

        if (!scheduleRes.ok || !statsRes.ok) {
          throw new Error('載入教師首頁資料失敗')
        }

        const scheduleJson = await scheduleRes.json()
        const statsJson = await statsRes.json()
        if (cancelled) return

        const schedulePayload = scheduleJson.data ?? scheduleJson
        const statsPayload = statsJson.data ?? statsJson
        const rawSchedules = Array.isArray(schedulePayload.schedules) ? schedulePayload.schedules : Array.isArray(schedulePayload) ? schedulePayload : []
        const rawStats = Array.isArray(statsPayload.stats) ? statsPayload.stats : []

        setSchedules(rawSchedules as ScheduleRecord[])
        setStats((rawStats[0] ?? null) as AttendanceStatsRecord | null)
      } catch (err) {
        if (!cancelled) {
          setSchedules([])
          setStats(null)
          setError(err instanceof Error ? err.message : '載入失敗')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [currentMonth, monthRange.end, monthRange.start])

  const todayClasses = useMemo(
    () => schedules.filter((schedule) => schedule.scheduled_date === today && schedule.status !== 'cancelled'),
    [schedules, today]
  )

  const nextClass = useMemo(() => {
    const now = new Date()
    return schedules
      .filter((schedule) => schedule.status !== 'cancelled')
      .map((schedule) => ({
        ...schedule,
        startsAt: new Date(`${schedule.scheduled_date}T${schedule.start_time}`),
      }))
      .filter((schedule) => !Number.isNaN(schedule.startsAt.getTime()) && schedule.startsAt >= now)
      .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime())[0] ?? null
  }, [schedules])

  const cards = useMemo(() => {
    const attendanceDays = toNumber(stats?.attendance_days)
    const lateCount = toNumber(stats?.late_count)
    const absentDays = toNumber(stats?.absent_days)
    const leaveDays = toNumber(stats?.total_leave_days)
    const attendanceRate = stats?.attendance_rate == null ? '—' : `${toNumber(stats.attendance_rate)}%`

    return [
      { label: '今日課程', value: todayClasses.length, tone: 'text-[#7B9E89]' },
      { label: '本月出勤率', value: attendanceRate, tone: 'text-[#3F6C7A]' },
      { label: '本月遲到', value: lateCount, tone: 'text-[#C4956A]' },
      { label: '請假/缺勤', value: leaveDays + absentDays, tone: 'text-[#B5706E]', sub: `出勤 ${attendanceDays} 天` },
    ]
  }, [stats, todayClasses.length])

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-border bg-[linear-gradient(135deg,rgba(198,149,106,0.14),rgba(123,158,137,0.12),rgba(63,108,122,0.10))] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-text-muted">教師首頁</p>
            <h1 className="mt-1 text-2xl font-bold text-text">{teacher ? `${teacher.name}，今天的教學節奏` : '我的教學總覽'}</h1>
            <p className="mt-2 text-sm text-text-muted">
              {teacher ? '從這裡快速查看今日課程、接下來的授課安排與本月出缺勤摘要。' : '正在準備你的教學總覽資料。'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/schedules" className="rounded-2xl bg-text px-4 py-2 text-sm font-medium text-white hover:opacity-90">查看完整課表</Link>
            <Link href="/my-attendance" className="rounded-2xl border border-border bg-white px-4 py-2 text-sm font-medium text-text hover:bg-surface">查看出缺勤</Link>
            <Link href="/my-salary" className="rounded-2xl border border-border bg-white px-4 py-2 text-sm font-medium text-text hover:bg-surface">查看薪資條</Link>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-[#B5706E]/20 bg-[#B5706E]/10 px-4 py-5 text-sm text-[#B5706E]">{error}</div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                <p className="text-xs text-text-muted">{card.label}</p>
                <p className={`mt-2 text-2xl font-semibold ${card.tone}`}>{card.value}</p>
                {card.sub && <p className="mt-1 text-xs text-text-muted">{card.sub}</p>}
              </div>
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-text">今天的課程</h2>
                  <p className="text-sm text-text-muted">{formatDate(today)}（週{getWeekday(today)}）</p>
                </div>
                <Link href="/schedules" className="text-sm font-medium text-primary hover:underline">前往課表</Link>
              </div>

              <div className="mt-4 space-y-3">
                {todayClasses.length === 0 ? (
                  <div className="rounded-2xl bg-surface px-4 py-6 text-sm text-text-muted">今天沒有排定課程，可以安排備課或追蹤學生進度。</div>
                ) : (
                  todayClasses.map((schedule) => (
                    <div key={schedule.id} className="rounded-2xl border border-border bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-text">{schedule.course_name}</h3>
                          <p className="mt-1 text-sm text-text-muted">{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)} · {schedule.room || '未排教室'}</p>
                        </div>
                        <span className="rounded-full bg-[#7B9E89]/10 px-2 py-1 text-xs font-medium text-[#7B9E89]">{statusText(schedule.status)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-text">下一堂課</h2>
              <div className="mt-4 rounded-2xl bg-surface p-4">
                {nextClass ? (
                  <>
                    <p className="text-sm text-text-muted">{formatDate(nextClass.scheduled_date)}（週{getWeekday(nextClass.scheduled_date)}）</p>
                    <h3 className="mt-1 text-lg font-semibold text-text">{nextClass.course_name}</h3>
                    <p className="mt-2 text-sm text-text-muted">{formatTime(nextClass.start_time)} - {formatTime(nextClass.end_time)} · {nextClass.room || '未排教室'}</p>
                    <p className="mt-2 text-sm text-text-muted">狀態：{statusText(nextClass.status)}</p>
                  </>
                ) : (
                  <p className="text-sm text-text-muted">目前沒有未來課程安排。</p>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-border p-4">
                <h3 className="font-medium text-text">本月出缺勤摘要</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-text-muted">
                  <div>出勤天數：{toNumber(stats?.attendance_days)}</div>
                  <div>遲到次數：{toNumber(stats?.late_count)}</div>
                  <div>缺勤天數：{toNumber(stats?.absent_days)}</div>
                  <div>請假天數：{toNumber(stats?.total_leave_days)}</div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}