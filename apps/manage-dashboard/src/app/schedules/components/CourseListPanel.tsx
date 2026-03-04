'use client'

import { useMemo, useState } from 'react'
import { Schedule, CourseType } from './types'

interface CourseListPanelProps {
  schedules: Schedule[]
  loading: boolean
  highlightedId: string | null
  onSelectSchedule: (schedule: Schedule) => void
}

type TabFilter = 'all' | CourseType

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'group', label: '團班' },
  { key: 'daycare', label: '安親' },
  { key: 'individual', label: '個指' },
]

const COURSE_TYPE_BORDER: Record<string, string> = {
  group: 'border-l-[#9DAEBB]',
  individual: 'border-l-[#C8A882]',
  daycare: 'border-l-[#A8B5A2]',
}

const COURSE_TYPE_BG: Record<string, string> = {
  group: 'bg-[#EDF1F5]',
  individual: 'bg-[#F7F0E8]',
  daycare: 'bg-[#EDF2EC]',
}

const COURSE_TYPE_BADGE: Record<string, string> = {
  group: 'bg-[#9DAEBB]/20 text-[#5A7A8F]',
  individual: 'bg-[#C8A882]/20 text-[#8F6A3A]',
  daycare: 'bg-[#A8B5A2]/20 text-[#4A6B44]',
}

const COURSE_TYPE_LABEL: Record<string, string> = {
  group: '團班',
  individual: '個指',
  daycare: '安親',
}

type ScheduleStatus = 'active' | 'upcoming' | 'finished' | 'cancelled'

function getScheduleStatus(schedule: Schedule): ScheduleStatus {
  if (schedule.status === 'cancelled') return 'cancelled'

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const schedDate = schedule.scheduled_date
  const startTime = schedule.start_time.slice(0, 5)
  const endTime = schedule.end_time.slice(0, 5)

  if (schedDate === todayStr) {
    if (nowTime >= startTime && nowTime < endTime) return 'active'
    if (nowTime < startTime) return 'upcoming'
    return 'finished'
  }
  if (schedDate > todayStr) return 'upcoming'
  return 'finished'
}

const STATUS_DOT: Record<ScheduleStatus, string> = {
  active: 'text-green-500',
  upcoming: 'text-blue-500',
  finished: 'text-gray-400',
  cancelled: 'text-red-400',
}

const STATUS_LABEL: Record<ScheduleStatus, string> = {
  active: '上課中',
  upcoming: '即將上課',
  finished: '已下課',
  cancelled: '已取消',
}

const STATUS_DOT_CHAR: Record<ScheduleStatus, string> = {
  active: '●',
  upcoming: '●',
  finished: '●',
  cancelled: '●',
}

function formatTime(time: string) {
  return time.slice(0, 5)
}

function sortByDateTime(a: Schedule, b: Schedule): number {
  if (a.scheduled_date !== b.scheduled_date) {
    return a.scheduled_date.localeCompare(b.scheduled_date)
  }
  return a.start_time.localeCompare(b.start_time)
}

export default function CourseListPanel({
  schedules,
  loading,
  highlightedId,
  onSelectSchedule,
}: CourseListPanelProps) {
  const [activeTab, setActiveTab] = useState<TabFilter>('all')

  const filtered = useMemo(() => {
    const base = activeTab === 'all'
      ? schedules
      : schedules.filter(s => s.course_type === activeTab)
    return [...base].sort(sortByDateTime)
  }, [schedules, activeTab])

  return (
    <div className="flex flex-col h-full bg-surface border-r border-border" style={{ width: 320, minWidth: 280 }}>
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-text">排課列表</h2>
        <p className="text-xs text-text-muted mt-0.5">{schedules.length} 堂課</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-2 pt-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 text-xs font-medium pb-2 pt-1 border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-10">無課程資料</p>
        ) : (
          <div className="p-2 space-y-1.5">
            {filtered.map(schedule => {
              const status = getScheduleStatus(schedule)
              const isHighlighted = highlightedId === schedule.id
              const borderColor = COURSE_TYPE_BORDER[schedule.course_type ?? 'group'] ?? 'border-l-gray-400'
              const bgColor = COURSE_TYPE_BG[schedule.course_type ?? 'group'] ?? 'bg-background'

              return (
                <button
                  key={schedule.id}
                  type="button"
                  onClick={() => onSelectSchedule(schedule)}
                  className={`w-full text-left p-2.5 rounded-lg border-l-4 ${borderColor} ${bgColor} transition-all cursor-pointer ${
                    isHighlighted
                      ? 'ring-2 ring-primary ring-offset-1 shadow-md'
                      : 'hover:shadow-sm'
                  }`}
                >
                  {/* Top row: course name + status */}
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-medium text-text text-sm leading-snug truncate flex-1 min-w-0">
                      {schedule.course_name}
                    </span>
                    <span className={`text-[10px] font-medium shrink-0 ml-1 ${STATUS_DOT[status]}`}>
                      {STATUS_DOT_CHAR[status]} {STATUS_LABEL[status]}
                    </span>
                  </div>

                  {/* Middle row: teacher + type badge */}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-text-muted truncate flex-1 min-w-0">
                      {schedule.teacher_name} {schedule.teacher_title}
                    </span>
                    {schedule.course_type && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${COURSE_TYPE_BADGE[schedule.course_type] ?? ''}`}>
                        {COURSE_TYPE_LABEL[schedule.course_type]}
                      </span>
                    )}
                  </div>

                  {/* Bottom row: date + time + room */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-text-muted">
                      {schedule.scheduled_date.slice(5).replace('-', '/')}
                    </span>
                    <span className="text-xs font-medium text-text">
                      {formatTime(schedule.start_time)}–{formatTime(schedule.end_time)}
                    </span>
                    {schedule.room_name && (
                      <span className="text-xs text-text-muted truncate">
                        {schedule.room_name}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
