'use client'

import { useMemo } from 'react'
import { Schedule, CourseType } from './types'

export type CalendarViewMode = 'week' | 'day' | 'month'

interface CalendarViewProps {
  mode: CalendarViewMode
  viewDates: Date[]         // week: 7 days, day: 1 day, month: all days in month grid
  schedules: Schedule[]
  loading: boolean
  highlightedId: string | null
  onSelectSchedule: (schedule: Schedule) => void
  onRenewSchedule: (schedule: Schedule) => void
}

// ---- colour helpers (matches WeeklyScheduleGrid) ----

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

const COURSE_TYPE_DOT: Record<string, string> = {
  group: 'bg-[#9DAEBB]',
  individual: 'bg-[#C8A882]',
  daycare: 'bg-[#A8B5A2]',
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function formatDateStr(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatTime(time: string): string {
  return time.slice(0, 5)
}

function isToday(date: Date): boolean {
  return formatDateStr(date) === formatDateStr(new Date())
}

// ---- Schedule card used in week/day views ----

interface ScheduleCardProps {
  schedule: Schedule
  highlighted: boolean
  onSelect: () => void
  onRenew: (e: React.MouseEvent) => void
  compact?: boolean
}

function ScheduleCard({ schedule, highlighted, onSelect, onRenew, compact }: ScheduleCardProps) {
  const borderColor = COURSE_TYPE_BORDER[schedule.course_type ?? 'group'] ?? 'border-l-gray-400'
  const bgColor = COURSE_TYPE_BG[schedule.course_type ?? 'group'] ?? 'bg-background'
  const badge = schedule.course_type ? COURSE_TYPE_BADGE[schedule.course_type] : ''
  const label = schedule.course_type ? COURSE_TYPE_LABEL[schedule.course_type] : ''

  return (
    <div
      className={`p-2 rounded-lg border-l-4 ${borderColor} ${bgColor} cursor-pointer transition-all relative ${
        highlighted ? 'ring-2 ring-primary ring-offset-1 shadow-md' : 'hover:shadow-sm'
      } ${schedule.status === 'cancelled' ? 'opacity-50' : ''}`}
      onClick={onSelect}
    >
      {/* Renew button */}
      <button
        type="button"
        onClick={onRenew}
        className="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium z-10 leading-snug"
        title="續班"
      >
        續班
      </button>

      <div className="pr-10">
        <div className="flex items-center gap-1 flex-wrap">
          <p className={`font-medium text-text leading-snug ${compact ? 'text-xs' : 'text-sm'}`}>
            {schedule.course_name}
          </p>
          {!compact && label && (
            <span className={`text-[10px] px-1 py-0.5 rounded-full font-medium ${badge}`}>
              {label}
            </span>
          )}
        </div>
        <p className={`text-text-muted mt-0.5 ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {schedule.teacher_name}
          {!compact && schedule.teacher_title ? ` ${schedule.teacher_title}` : ''}
        </p>
        {!compact && (
          <p className="text-xs font-medium text-text mt-0.5">
            {formatTime(schedule.start_time)}–{formatTime(schedule.end_time)}
          </p>
        )}
        {!compact && schedule.room_name && (
          <p className="text-xs text-text-muted">{schedule.room_name}</p>
        )}
        {!compact && schedule.status === 'cancelled' && (
          <span className="text-[10px] text-red-500 font-medium">已取消</span>
        )}
      </div>
    </div>
  )
}

// ---- Week View ----

function WeekView({
  viewDates,
  schedules,
  highlightedId,
  onSelectSchedule,
  onRenewSchedule,
}: Omit<CalendarViewProps, 'mode' | 'loading'>) {
  const byDate = useMemo(() => {
    const map: Record<string, Schedule[]> = {}
    for (const s of schedules) {
      if (!map[s.scheduled_date]) map[s.scheduled_date] = []
      map[s.scheduled_date].push(s)
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.start_time.localeCompare(b.start_time))
    }
    return map
  }, [schedules])

  return (
    <div className="grid grid-cols-7 gap-px bg-border h-full">
      {viewDates.map((date, idx) => {
        const dateStr = formatDateStr(date)
        const daySchedules = byDate[dateStr] ?? []
        const today = isToday(date)

        return (
          <div key={idx} className={`flex flex-col min-h-0 ${today ? 'bg-primary/5' : 'bg-surface'}`}>
            {/* Column header */}
            <div className={`px-2 py-2 text-center border-b ${today ? 'border-primary/20' : 'border-border'}`}>
              <p className={`text-xs font-medium ${today ? 'text-primary' : 'text-text-muted'}`}>
                週{WEEKDAYS[date.getDay()]}
              </p>
              <p className={`text-sm font-semibold mt-0.5 ${today ? 'text-primary' : 'text-text'}`}>
                {date.getDate()}
              </p>
              {today && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-0.5"></span>
              )}
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
              {daySchedules.length === 0 ? (
                <p className="text-[10px] text-text-muted text-center py-4">—</p>
              ) : (
                daySchedules.map(s => (
                  <ScheduleCard
                    key={s.id}
                    schedule={s}
                    highlighted={highlightedId === s.id}
                    onSelect={() => onSelectSchedule(s)}
                    onRenew={e => { e.stopPropagation(); onRenewSchedule(s) }}
                    compact
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---- Day View ----

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8) // 8–22

function DayView({
  viewDates,
  schedules,
  highlightedId,
  onSelectSchedule,
  onRenewSchedule,
}: Omit<CalendarViewProps, 'mode' | 'loading'>) {
  const date = viewDates[0]
  const dateStr = formatDateStr(date)
  const daySchedules = useMemo(
    () => schedules.filter(s => s.scheduled_date === dateStr).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [schedules, dateStr]
  )

  // Place schedules into time slots
  // Each hour row is 60px tall
  const HOUR_HEIGHT = 64

  function timeToMinutes(time: string): number {
    const [h, m] = time.slice(0, 5).split(':').map(Number)
    return h * 60 + m
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day header */}
      <div className={`px-4 py-3 border-b ${isToday(date) ? 'border-primary/20 bg-primary/5' : 'border-border bg-surface'}`}>
        <p className={`text-base font-semibold ${isToday(date) ? 'text-primary' : 'text-text'}`}>
          {date.getMonth() + 1} 月 {date.getDate()} 日 週{WEEKDAYS[date.getDay()]}
          {isToday(date) && <span className="ml-2 text-xs px-2 py-0.5 bg-primary text-white rounded-full">今天</span>}
        </p>
        <p className="text-xs text-text-muted mt-0.5">{daySchedules.length} 堂課</p>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="relative" style={{ height: HOUR_HEIGHT * HOURS.length }}>
          {/* Hour grid lines */}
          {HOURS.map(h => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-border/50 flex"
              style={{ top: (h - 8) * HOUR_HEIGHT }}
            >
              <span className="text-[10px] text-text-muted w-10 text-right pr-2 leading-none -mt-2 shrink-0">
                {String(h).padStart(2, '0')}:00
              </span>
            </div>
          ))}

          {/* Schedule cards positioned absolutely */}
          <div className="absolute left-10 right-2 top-0">
            {daySchedules.map(s => {
              const startMin = timeToMinutes(s.start_time)
              const endMin = timeToMinutes(s.end_time)
              const top = Math.max(0, (startMin - 8 * 60)) * (HOUR_HEIGHT / 60)
              const height = Math.max(24, (endMin - startMin) * (HOUR_HEIGHT / 60) - 4)

              return (
                <div
                  key={s.id}
                  className="absolute left-0 right-0"
                  style={{ top, height }}
                >
                  <ScheduleCard
                    schedule={s}
                    highlighted={highlightedId === s.id}
                    onSelect={() => onSelectSchedule(s)}
                    onRenew={e => { e.stopPropagation(); onRenewSchedule(s) }}
                    compact={height < 48}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Month View ----

function MonthView({
  viewDates,
  schedules,
  highlightedId,
  onSelectSchedule,
}: Omit<CalendarViewProps, 'mode' | 'loading' | 'onRenewSchedule'> & { onRenewSchedule: (s: Schedule) => void }) {
  const byDate = useMemo(() => {
    const map: Record<string, Schedule[]> = {}
    for (const s of schedules) {
      if (!map[s.scheduled_date]) map[s.scheduled_date] = []
      map[s.scheduled_date].push(s)
    }
    return map
  }, [schedules])

  // viewDates is already 35 or 42 cells padded to full weeks
  return (
    <div className="flex flex-col h-full">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-text-muted">
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-px bg-border overflow-hidden">
        {viewDates.map((date, idx) => {
          const dateStr = formatDateStr(date)
          const daySchedules = byDate[dateStr] ?? []
          const today = isToday(date)
          // Cells outside current month rendered dimly
          const currentMonth = viewDates[10]?.getMonth() // day 10 is always in current month
          const inMonth = date.getMonth() === currentMonth

          return (
            <div
              key={idx}
              className={`p-1 flex flex-col min-h-0 overflow-hidden ${today ? 'bg-primary/5' : inMonth ? 'bg-surface' : 'bg-background'}`}
            >
              {/* Date number */}
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                  today ? 'bg-primary text-white' : inMonth ? 'text-text' : 'text-text-muted'
                }`}>
                  {date.getDate()}
                </span>
                {daySchedules.length > 0 && (
                  <span className="text-[9px] text-text-muted">{daySchedules.length}</span>
                )}
              </div>

              {/* Dots / mini cards */}
              <div className="flex flex-wrap gap-0.5 overflow-hidden">
                {daySchedules.slice(0, 3).map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSelectSchedule(s)}
                    className={`w-full text-left text-[9px] px-1 py-0.5 rounded truncate leading-tight transition-colors ${
                      COURSE_TYPE_BG[s.course_type ?? 'group'] ?? 'bg-background'
                    } ${highlightedId === s.id ? 'ring-1 ring-primary' : ''}`}
                    title={`${s.course_name} ${formatTime(s.start_time)}`}
                  >
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-0.5 ${COURSE_TYPE_DOT[s.course_type ?? 'group'] ?? 'bg-gray-400'}`}></span>
                    {s.course_name}
                  </button>
                ))}
                {daySchedules.length > 3 && (
                  <span className="text-[9px] text-text-muted px-1">+{daySchedules.length - 3}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---- Main CalendarView ----

export default function CalendarView({
  mode,
  viewDates,
  schedules,
  loading,
  highlightedId,
  onSelectSchedule,
  onRenewSchedule,
}: CalendarViewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (mode === 'week') {
    return (
      <WeekView
        viewDates={viewDates}
        schedules={schedules}
        highlightedId={highlightedId}
        onSelectSchedule={onSelectSchedule}
        onRenewSchedule={onRenewSchedule}
      />
    )
  }

  if (mode === 'day') {
    return (
      <DayView
        viewDates={viewDates}
        schedules={schedules}
        highlightedId={highlightedId}
        onSelectSchedule={onSelectSchedule}
        onRenewSchedule={onRenewSchedule}
      />
    )
  }

  return (
    <MonthView
      viewDates={viewDates}
      schedules={schedules}
      highlightedId={highlightedId}
      onSelectSchedule={onSelectSchedule}
      onRenewSchedule={onRenewSchedule}
    />
  )
}
