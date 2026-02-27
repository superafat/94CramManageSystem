'use client'

import { Schedule } from './types'

interface WeeklyScheduleGridProps {
  weekDates: Date[]
  schedules: Schedule[]
  loading: boolean
  weekOffset: number
  onSelectSchedule: (schedule: Schedule) => void
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const formatDate = (date: Date) => date.toISOString().split('T')[0]
const formatTime = (time: string) => time.slice(0, 5)

const getStatusColor = (status: string) => {
  switch (status) {
    case 'scheduled': return 'bg-blue-100 text-blue-700'
    case 'completed': return 'bg-green-100 text-green-700'
    case 'cancelled': return 'bg-red-100 text-red-700'
    case 'rescheduled': return 'bg-yellow-100 text-yellow-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

const getSubjectColor = (subject: string) => {
  switch (subject) {
    case '數學': return 'border-l-blue-500'
    case '英文': return 'border-l-green-500'
    case '體育': return 'border-l-orange-500'
    default: return 'border-l-gray-500'
  }
}

export default function WeeklyScheduleGrid({
  weekDates,
  schedules,
  loading,
  onSelectSchedule,
}: WeeklyScheduleGridProps) {
  const getSchedulesForDate = (date: Date) => {
    const dateStr = formatDate(date)
    return schedules.filter(s => s.scheduled_date === dateStr)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {weekDates.map((date, idx) => {
        const daySchedules = getSchedulesForDate(date)
        const isToday = formatDate(date) === formatDate(new Date())

        return (
          <div key={idx} className={`rounded-xl border ${isToday ? 'border-primary bg-primary/5' : 'border-border bg-surface'}`}>
            {/* Day Header */}
            <div className={`px-4 py-2 border-b ${isToday ? 'border-primary/20' : 'border-border'}`}>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-text'}`}>
                  週{WEEKDAYS[date.getDay()]}
                </span>
                <span className="text-sm text-text-muted">
                  {date.getMonth() + 1}/{date.getDate()}
                </span>
                {isToday && (
                  <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full">
                    今天
                  </span>
                )}
              </div>
            </div>

            {/* Day Content */}
            <div className="p-3">
              {daySchedules.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-2">無課程</p>
              ) : (
                <div className="space-y-2">
                  {daySchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      onClick={() => onSelectSchedule(schedule)}
                      className={`p-3 bg-background rounded-lg border-l-4 ${getSubjectColor(schedule.subject)} cursor-pointer hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-text">{schedule.course_name}</p>
                          <p className="text-sm text-text-muted">
                            {schedule.teacher_name} {schedule.teacher_title}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-text">
                            {formatTime(schedule.start_time)}-{formatTime(schedule.end_time)}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(schedule.status)}`}>
                            {schedule.status === 'scheduled' ? '已排' : schedule.status}
                          </span>
                        </div>
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
  )
}
