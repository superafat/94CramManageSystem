'use client'

import { BackButton } from '@/components/ui/BackButton'
import { useCallback, useEffect, useState } from 'react'

interface Schedule {
  id: string
  course_name: string
  subject: string
  teacher_name: string
  teacher_title: string
  scheduled_date: string
  start_time: string
  end_time: string
  status: string
}

const API_BASE = ''

const WEEKDAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']

const getWeekMonFri = () => {
  const today = new Date()
  const day = today.getDay() // 0=Sun
  const monday = new Date(today)
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1))

  const dates: Date[] = []
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(d)
  }
  return dates
}

const formatDate = (date: Date) => date.toISOString().split('T')[0]
const formatTime = (time: string) => time.slice(0, 5)

const getSubjectColor = (subject: string) => {
  switch (subject) {
    case '數學': return 'bg-primary/10 text-primary'
    case '英文': return 'bg-morandi-sage/10 text-morandi-sage'
    default: return 'bg-surface text-text-muted'
  }
}

export default function MySchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const weekDates = getWeekMonFri()
  const startDate = formatDate(weekDates[0])
  const endDate = formatDate(weekDates[4])

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(
        `${API_BASE}/api/w8/schedules?start_date=${startDate}&end_date=${endDate}`,
        { credentials: 'include' }
      )
      if (!res.ok) throw new Error('載入失敗')
      const data = await res.json()
      setSchedules(data.data?.schedules || data.schedules || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => { fetchSchedules() }, [fetchSchedules])

  const getSchedulesForDate = (date: Date) => {
    const dateStr = formatDate(date)
    return schedules.filter(s => s.scheduled_date === dateStr)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-24 bg-surface-hover animate-pulse rounded" />
        <div className="h-8 w-48 bg-surface-hover animate-pulse rounded" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-surface-hover animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <BackButton />

      <div>
        <h1 className="text-2xl font-bold text-text">我的課表</h1>
        <p className="text-text-muted mt-1">本週課程安排</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex justify-between items-center">
          <span>{error}</span>
          <button onClick={fetchSchedules} className="text-sm underline">重試</button>
        </div>
      )}

      <div className="space-y-3">
        {weekDates.map((date) => {
          const daySchedules = getSchedulesForDate(date)
          const isToday = formatDate(date) === formatDate(new Date())

          return (
            <div
              key={formatDate(date)}
              className={`rounded-xl border ${isToday ? 'border-primary bg-primary/5' : 'border-border bg-surface'}`}
            >
              <div className={`px-4 py-2 border-b ${isToday ? 'border-primary/20' : 'border-border'} flex items-center gap-2`}>
                <span className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-text'}`}>
                  {WEEKDAYS[date.getDay()]}
                </span>
                <span className="text-sm text-text-muted">
                  {date.getMonth() + 1}/{date.getDate()}
                </span>
                {isToday && (
                  <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full">今天</span>
                )}
              </div>

              <div className="p-3">
                {daySchedules.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-2">無課程</p>
                ) : (
                  <div className="space-y-2">
                    {daySchedules.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                        <div>
                          <p className="font-medium text-text text-sm">{s.course_name}</p>
                          <p className="text-xs text-text-muted mt-0.5">
                            {s.teacher_name}{s.teacher_title ? ` ${s.teacher_title}` : ''}
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <p className="text-sm font-medium text-text">
                            {formatTime(s.start_time)}-{formatTime(s.end_time)}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getSubjectColor(s.subject)}`}>
                            {s.subject || '課程'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
