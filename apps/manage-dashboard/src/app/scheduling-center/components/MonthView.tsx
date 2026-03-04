'use client'

import { useMemo } from 'react'
import type { ScheduleEvent } from './types'

interface MonthViewProps {
  events: ScheduleEvent[]
  monthDate: Date  // any date in the target month
  onDateClick: (date: Date) => void
  onEventClick: (event: ScheduleEvent) => void
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const COURSE_TYPE_DOT: Record<string, string> = {
  group: 'bg-[#9DAEBB]',
  individual: 'bg-[#C8A882]',
  daycare: 'bg-[#A8B5A2]',
}

function formatDateStr(date: Date): string {
  return date.toISOString().split('T')[0]
}

function isToday(date: Date): boolean {
  return formatDateStr(date) === formatDateStr(new Date())
}

function getMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startPad = first.getDay()
  const endPad = 6 - last.getDay()
  const cells: Date[] = []

  for (let i = startPad; i > 0; i--) {
    const d = new Date(first)
    d.setDate(first.getDate() - i)
    cells.push(d)
  }
  for (let d = 1; d <= last.getDate(); d++) {
    cells.push(new Date(year, month, d))
  }
  for (let i = 1; i <= endPad; i++) {
    const d = new Date(last)
    d.setDate(last.getDate() + i)
    cells.push(d)
  }
  while (cells.length < 42) {
    const d = new Date(cells[cells.length - 1])
    d.setDate(d.getDate() + 1)
    cells.push(d)
  }
  return cells
}

export default function MonthView({ events, monthDate, onDateClick, onEventClick }: MonthViewProps) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const cells = useMemo(() => getMonthGrid(year, month), [year, month])

  const eventsByDate = useMemo(() => {
    const map: Record<string, ScheduleEvent[]> = {}
    for (const e of events) {
      const key = e.date ?? ''
      if (!key) continue
      if (!map[key]) map[key] = []
      map[key].push(e)
    }
    return map
  }, [events])

  const rows = Math.ceil(cells.length / 7)

  return (
    <div className="flex flex-col h-full">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border shrink-0">
        {WEEKDAYS.map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-text-muted">
            {d}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div
        className="flex-1 grid grid-cols-7 gap-px bg-border overflow-hidden"
        style={{ gridTemplateRows: `repeat(${rows}, 1fr)` }}
      >
        {cells.map((date, idx) => {
          const dateStr = formatDateStr(date)
          const dayEvents = eventsByDate[dateStr] ?? []
          const today = isToday(date)
          const inMonth = date.getMonth() === month

          return (
            <div
              key={idx}
              className={`p-1 flex flex-col min-h-0 overflow-hidden cursor-pointer hover:bg-primary/5 transition-colors ${
                today ? 'bg-primary/5' : inMonth ? 'bg-surface' : 'bg-background'
              }`}
              onClick={() => onDateClick(date)}
            >
              {/* Date number */}
              <div className="flex items-center justify-between mb-0.5">
                <span
                  className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                    today ? 'bg-primary text-white' : inMonth ? 'text-text' : 'text-text-muted/50'
                  }`}
                >
                  {date.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[9px] text-text-muted">{dayEvents.length}</span>
                )}
              </div>

              {/* Event dots / mini items */}
              <div className="flex flex-wrap gap-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map(e => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={ev => {
                      ev.stopPropagation()
                      onEventClick(e)
                    }}
                    className="w-full text-left text-[9px] px-1 py-0.5 rounded truncate leading-tight bg-border/30 hover:bg-border/50 transition-colors"
                    title={`${e.courseName} ${e.startTime.slice(0, 5)}`}
                  >
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-0.5 ${COURSE_TYPE_DOT[e.courseType] ?? 'bg-gray-400'}`} />
                    {e.courseName}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[9px] text-text-muted px-1">+{dayEvents.length - 3}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
