'use client'

import { useMemo } from 'react'
import type { ScheduleEvent } from './types'
import ScheduleBlock from './ScheduleBlock'

interface WeekViewProps {
  events: ScheduleEvent[]
  weekStartDate: Date
  onEventClick: (event: ScheduleEvent) => void
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8) // 08:00-22:00
const HOUR_HEIGHT = 60 // px per hour
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

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

function getWeekDates(startDate: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    return d
  })
}

export default function WeekView({ events, weekStartDate, onEventClick }: WeekViewProps) {
  const weekDates = useMemo(() => getWeekDates(weekStartDate), [weekStartDate])

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, ScheduleEvent[]> = {}
    for (const e of events) {
      const dateKey = e.date ?? ''
      if (!dateKey) continue
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(e)
    }
    return map
  }, [events])

  // For individual courses at the same time, stack them vertically within the block
  function groupOverlapping(dayEvents: ScheduleEvent[]): { event: ScheduleEvent; column: number; totalColumns: number }[] {
    const sorted = [...dayEvents].sort((a, b) => a.startTime.localeCompare(b.startTime))
    const result: { event: ScheduleEvent; column: number; totalColumns: number }[] = []

    // Group overlapping events
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
        const thisStart = timeToMinutes(evt.startTime)
        if (thisStart < lastEnd) {
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
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 整個區域一起捲動，避免 scrollbar 造成 header/body 寬度不一致 */}
      <div className="flex-1 overflow-y-auto">
        {/* Sticky header — 在 overflow container 內，寬度與 day columns 一致 */}
        <div className="sticky top-0 z-10 flex border-b border-border bg-white">
          <div className="w-12 shrink-0" />
          {weekDates.map((date, idx) => {
            const today = isToday(date)
            return (
              <div
                key={idx}
                className={`flex-1 py-2 text-center border-l border-border ${today ? 'bg-primary/5' : ''}`}
              >
                <p className={`text-xs font-medium ${today ? 'text-primary' : 'text-text-muted'}`}>
                  週{WEEKDAYS[idx]}
                </p>
                <p className={`text-sm font-semibold ${today ? 'text-primary' : 'text-text'}`}>
                  {date.getMonth() + 1}/{date.getDate()}
                </p>
              </div>
            )
          })}
        </div>

        {/* Time grid */}
        <div className="relative" style={{ height: HOURS.length * HOUR_HEIGHT }}>
          {/* Horizontal hour grid lines */}
          {HOURS.map(h => (
            <div
              key={`line-${h}`}
              className="absolute left-0 right-0 border-t border-border/60"
              style={{ top: (h - 8) * HOUR_HEIGHT }}
            />
          ))}

          <div className="flex h-full relative">
            {/* Time labels */}
            <div className="w-12 shrink-0 relative z-10">
              {HOURS.map(h => (
                <div
                  key={h}
                  className="absolute left-0 right-0 text-right pr-2"
                  style={{ top: (h - 8) * HOUR_HEIGHT - 6 }}
                >
                  <span className="text-[10px] text-text-muted bg-white px-0.5">
                    {String(h).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns with events */}
            {weekDates.map((date, colIdx) => {
              const dateStr = formatDateStr(date)
              const dayEvents = eventsByDate[dateStr] ?? []
              const positioned = groupOverlapping(dayEvents)
              const today = isToday(date)

              return (
                <div
                  key={colIdx}
                  className={`flex-1 relative border-l border-border ${today ? 'bg-primary/5' : ''}`}
                >
                  {positioned.map(({ event, column, totalColumns }) => {
                    const startMin = timeToMinutes(event.startTime)
                    const endMin = timeToMinutes(event.endTime)
                    const top = (startMin - 8 * 60) * (HOUR_HEIGHT / 60)
                    const height = Math.max(20, (endMin - startMin) * (HOUR_HEIGHT / 60) - 2)
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
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
