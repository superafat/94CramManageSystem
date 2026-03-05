'use client'

import { useMemo } from 'react'
import type { ScheduleEvent } from './types'
import ScheduleBlock from './ScheduleBlock'

interface DayViewProps {
  events: ScheduleEvent[]
  date: Date
  onEventClick: (event: ScheduleEvent) => void
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8) // 08:00-22:00
const HOUR_HEIGHT = 60
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function formatDateStr(date: Date): string {
  return date.toISOString().split('T')[0]
}

function isToday(date: Date): boolean {
  return formatDateStr(date) === formatDateStr(new Date())
}

function timeToMinutes(time: string): number {
  const [h, m] = time.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

export default function DayView({ events, date, onEventClick }: DayViewProps) {
  const dateStr = formatDateStr(date)
  const today = isToday(date)

  const dayEvents = useMemo(
    () => events.filter(e => e.date === dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [events, dateStr]
  )

  // Group overlapping events horizontally
  const positioned = useMemo(() => {
    const sorted = [...dayEvents]
    const result: { event: ScheduleEvent; column: number; totalColumns: number }[] = []
    const groups: ScheduleEvent[][] = []
    let currentGroup: ScheduleEvent[] = []

    for (const evt of sorted) {
      if (currentGroup.length === 0) {
        currentGroup.push(evt)
      } else {
        const lastEnd = currentGroup.reduce((max, e) => {
          const end = timeToMinutes(e.endTime)
          return end > max ? end : max
        }, 0)
        if (timeToMinutes(evt.startTime) < lastEnd) {
          currentGroup.push(evt)
        } else {
          groups.push(currentGroup)
          currentGroup = [evt]
        }
      }
    }
    if (currentGroup.length > 0) groups.push(currentGroup)

    for (const group of groups) {
      const totalCols = group.length
      group.forEach((evt, idx) => {
        result.push({ event: evt, column: idx, totalColumns: totalCols })
      })
    }
    return result
  }, [dayEvents])

  return (
    <div className="flex flex-col h-full">
      {/* Day header */}
      <div className={`px-4 py-3 border-b shrink-0 ${today ? 'border-primary/20 bg-primary/5' : 'border-border bg-surface'}`}>
        <p className={`text-base font-semibold ${today ? 'text-primary' : 'text-text'}`}>
          {date.getFullYear()} 年 {date.getMonth() + 1} 月 {date.getDate()} 日 週{WEEKDAYS[date.getDay()]}
          {today && <span className="ml-2 text-xs px-2 py-0.5 bg-primary text-white rounded-full">今天</span>}
        </p>
        <p className="text-xs text-text-muted mt-0.5">{dayEvents.length} 堂課</p>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative" style={{ height: HOURS.length * HOUR_HEIGHT }}>
          {/* Hour grid lines */}
          {HOURS.map(h => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-border/60 flex"
              style={{ top: (h - 8) * HOUR_HEIGHT }}
            >
              <span className="text-[10px] text-text-muted w-12 text-right pr-2 leading-none -mt-2 shrink-0">
                {String(h).padStart(2, '0')}:00
              </span>
            </div>
          ))}

          {/* Events */}
          <div className="absolute left-12 right-2 top-0" style={{ height: '100%' }}>
            {positioned.map(({ event, column, totalColumns }) => {
              const startMin = timeToMinutes(event.startTime)
              const endMin = timeToMinutes(event.endTime)
              const top = (startMin - 8 * 60) * (HOUR_HEIGHT / 60)
              const height = Math.max(24, (endMin - startMin) * (HOUR_HEIGHT / 60) - 2)
              const width = `${100 / totalColumns}%`
              const left = `${(column / totalColumns) * 100}%`

              return (
                <div
                  key={event.id}
                  className="absolute px-0.5"
                  style={{ top, height, width, left }}
                >
                  <ScheduleBlock event={event} onClick={onEventClick} />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
