'use client'

import { Schedule, CourseType } from './types'

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

// 課程類型對應左邊框顏色：團班=藍、個指=橘、安親=綠
const getCourseTypeBorderColor = (courseType?: CourseType, subject?: string) => {
  if (courseType === 'group') return 'border-l-[#9DAEBB]'      // 莫蘭迪藍
  if (courseType === 'individual') return 'border-l-[#C8A882]' // 莫蘭迪橘
  if (courseType === 'daycare') return 'border-l-[#A8B5A2]'    // 莫蘭迪綠
  // 向後相容：以 subject 判斷
  switch (subject) {
    case '數學': return 'border-l-[#9DAEBB]'
    case '英文': return 'border-l-[#A8B5A2]'
    case '體育': return 'border-l-[#C8A882]'
    default: return 'border-l-gray-400'
  }
}

// 課程類型對應卡片背景色
const getCourseTypeBg = (courseType?: CourseType) => {
  if (courseType === 'group') return 'bg-[#EDF1F5]'      // 淡藍
  if (courseType === 'individual') return 'bg-[#F7F0E8]' // 淡橘
  if (courseType === 'daycare') return 'bg-[#EDF2EC]'    // 淡綠
  return 'bg-background'
}

const COURSE_TYPE_LABEL: Record<string, string> = {
  group: '團班',
  individual: '個指',
  daycare: '安親',
}

const COURSE_TYPE_BADGE: Record<string, string> = {
  group: 'bg-[#9DAEBB]/20 text-[#5A7A8F]',
  individual: 'bg-[#C8A882]/20 text-[#8F6A3A]',
  daycare: 'bg-[#A8B5A2]/20 text-[#4A6B44]',
}

export default function WeeklyScheduleGrid({
  weekDates,
  schedules,
  loading,
  onSelectSchedule,
}: WeeklyScheduleGridProps) {
  const getSchedulesForDate = (date: Date) => {
    const dateStr = formatDate(date)
    return schedules
      .filter(s => s.scheduled_date === dateStr)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
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
                {daySchedules.length > 0 && (
                  <span className="ml-auto text-xs text-text-muted">{daySchedules.length} 堂</span>
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
                      className={`p-3 rounded-lg border-l-4 ${getCourseTypeBorderColor(schedule.course_type, schedule.subject)} ${getCourseTypeBg(schedule.course_type)} cursor-pointer hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-medium text-text">{schedule.course_name}</p>
                            {schedule.course_type && (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${COURSE_TYPE_BADGE[schedule.course_type] ?? ''}`}>
                                {COURSE_TYPE_LABEL[schedule.course_type]}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-text-muted mt-0.5">
                            {schedule.teacher_name} {schedule.teacher_title}
                          </p>
                          {schedule.course_type === 'individual' && schedule.student_names && schedule.student_names.length > 0 && (
                            <p className="text-xs text-text-muted mt-0.5">
                              學生：{schedule.student_names.join('、')}
                            </p>
                          )}
                          {schedule.room_name && (
                            <p className="text-xs text-text-muted">教室：{schedule.room_name}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium text-text">
                            {formatTime(schedule.start_time)}-{formatTime(schedule.end_time)}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(schedule.status)}`}>
                            {schedule.status === 'scheduled' ? '已排' : schedule.status === 'completed' ? '已完成' : schedule.status === 'cancelled' ? '已取消' : schedule.status}
                          </span>
                          {schedule.course_type === 'individual' && schedule.fee_per_class && (
                            <p className="text-xs text-text-muted mt-0.5">${Number(schedule.fee_per_class).toLocaleString()}/堂</p>
                          )}
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
