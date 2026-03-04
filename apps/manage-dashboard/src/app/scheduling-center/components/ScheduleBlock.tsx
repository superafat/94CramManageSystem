'use client'

import { useMemo } from 'react'
import type { ScheduleEvent, ScheduleStatus } from './types'

interface ScheduleBlockProps {
  event: ScheduleEvent
  onClick: (event: ScheduleEvent) => void
}

const COURSE_TYPE_BORDER: Record<string, string> = {
  group: 'border-l-[#9DAEBB]',
  individual: 'border-l-[#C8A882]',
  daycare: 'border-l-[#A8B5A2]',
}

function getScheduleStatus(event: ScheduleEvent): ScheduleStatus {
  if (!event.date) return 'upcoming'

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const startParts = event.startTime.slice(0, 5).split(':').map(Number)
  const endParts = event.endTime.slice(0, 5).split(':').map(Number)
  const startMin = startParts[0] * 60 + startParts[1]
  const endMin = endParts[0] * 60 + endParts[1]

  if (event.date < todayStr) return 'ended'
  if (event.date > todayStr) return 'upcoming'

  // 今天
  if (nowMinutes >= startMin && nowMinutes < endMin) return 'in_session'
  if (nowMinutes >= endMin) return 'dismissed'
  return 'upcoming'
}

const STATUS_STYLES: Record<ScheduleStatus, string> = {
  in_session: 'bg-[#8FA895]/10 ring-2 ring-[#8FA895] animate-pulse',
  dismissed: 'bg-[#8FA895]/5 opacity-50',
  ended: 'bg-gray-50 opacity-60',
  upcoming: 'bg-[#6B9BD2]/5',
}

const STATUS_LABEL: Record<ScheduleStatus, string> = {
  in_session: '上課中',
  dismissed: '已下課',
  ended: '已結束',
  upcoming: '未開始',
}

const STATUS_DOT: Record<ScheduleStatus, string> = {
  in_session: 'bg-[#8FA895]',
  dismissed: 'bg-[#8FA895]/50',
  ended: 'bg-[#9CA3AF]',
  upcoming: 'bg-[#6B9BD2]',
}

function formatTime(time: string): string {
  return time.slice(0, 5)
}

export default function ScheduleBlock({ event, onClick }: ScheduleBlockProps) {
  const status = useMemo(() => getScheduleStatus(event), [event])
  const borderColor = COURSE_TYPE_BORDER[event.courseType] ?? 'border-l-gray-400'

  return (
    <div
      className={`p-1.5 rounded-lg border-l-4 ${borderColor} ${STATUS_STYLES[status]} cursor-pointer transition-all hover:shadow-sm`}
      onClick={() => onClick(event)}
      title={`${event.courseName} ${formatTime(event.startTime)}-${formatTime(event.endTime)} ${event.teacherName}`}
    >
      <div className="flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[status]}`} />
        <span className="text-xs font-medium text-text truncate">
          {event.courseName}
        </span>
      </div>
      <p className="text-[10px] text-text-muted mt-0.5 truncate">
        {formatTime(event.startTime)}-{formatTime(event.endTime)} {event.teacherName}
      </p>
      {event.courseType === 'individual' && event.studentName && (
        <p className="text-[10px] text-[#C8A882] truncate">
          {event.studentName}
        </p>
      )}
    </div>
  )
}

export { getScheduleStatus, STATUS_LABEL, STATUS_DOT }
