'use client'

import type { TeacherSalary, ScheduleItem } from '../types'
import { groupByWeek, formatDate, formatTime } from '../utils'

export interface ScheduleDetailPanelProps {
  teacher: TeacherSalary
  schedules: ScheduleItem[]
  loading: boolean
}

export function ScheduleDetailPanel({ teacher, schedules, loading }: ScheduleDetailPanelProps) {
  const weeks = groupByWeek(schedules)
  const weekKeys = Object.keys(weeks).map(Number).sort((a, b) => a - b)

  const weeklyFee = (items: ScheduleItem[]): number => {
    return items.reduce((acc, s) => {
      if (s.is_individual) return acc + (s.per_session_fee ?? 0)
      if (teacher.salary_type === 'per_class') return acc + Number(teacher.rate_per_class)
      if (teacher.salary_type === 'hourly') {
        const hours = s.duration_hours ?? 1
        return acc + Number(teacher.hourly_rate) * hours
      }
      return acc
    }, 0)
  }

  if (loading) {
    return (
      <div className="mt-3 flex justify-center py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (schedules.length === 0) {
    return (
      <div className="mt-3 text-center py-4 text-text-muted text-sm">本月無排課記錄</div>
    )
  }

  return (
    <div className="mt-3 space-y-3">
      {weekKeys.map(week => {
        const items = weeks[week]
        const subtotal = weeklyFee(items)
        return (
          <div key={week} className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
              <span className="text-xs font-medium text-text-muted">第 {week} 週</span>
              <span className="text-xs font-semibold text-primary">小計 ${subtotal.toLocaleString()}</span>
            </div>
            <div className="divide-y divide-border">
              {items.map((s, i) => {
                const sessionFee = (() => {
                  if (s.is_individual) return s.per_session_fee ?? 0
                  if (teacher.salary_type === 'per_class') return Number(teacher.rate_per_class)
                  if (teacher.salary_type === 'hourly') return Number(teacher.hourly_rate) * (s.duration_hours ?? 1)
                  return 0
                })()
                return (
                  <div key={i} className="px-3 py-2 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-text font-medium">{formatDate(s.start_time)}</span>
                        <span className="text-text-muted">
                          {formatTime(s.start_time)}–{formatTime(s.end_time)}
                        </span>
                        {s.is_individual && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">個指</span>
                        )}
                      </div>
                      <p className="text-text-muted mt-0.5">{s.course_name}</p>
                      {s.is_individual && s.per_session_fee && (
                        <p className="text-amber-600">1 堂 × ${s.per_session_fee.toLocaleString()}</p>
                      )}
                      {teacher.salary_type === 'hourly' && (
                        <p className="text-blue-600">{s.duration_hours ?? 1}h × ${Number(teacher.hourly_rate).toLocaleString()}</p>
                      )}
                    </div>
                    <span className="font-medium text-primary ml-3">
                      {teacher.salary_type === 'monthly' ? '—' : `$${sessionFee.toLocaleString()}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
