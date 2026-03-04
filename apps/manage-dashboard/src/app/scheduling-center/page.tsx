'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CalendarView, CourseTypeFilter, ScheduleEvent, CourseItem, DetailStudent } from './components/types'
import { getScheduleStatus, STATUS_LABEL, STATUS_DOT } from './components/ScheduleBlock'
import CoursePanel from './components/CoursePanel'
import WeekView from './components/WeekView'
import DayView from './components/DayView'
import MonthView from './components/MonthView'
import DetailDrawer from './components/DetailDrawer'
import RosterModal from './components/RosterModal'

const API_BASE = ''

// ---- Date helpers ----

const formatDate = (date: Date) => date.toISOString().split('T')[0]

/** Monday of the week offset from today */
function getWeekStartDate(offset: number): Date {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - today.getDay() + 1 + offset * 7)
  return monday
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// ---- Page ----

export default function SchedulingCenterPage() {
  const router = useRouter()

  // View state
  const [viewMode, setViewMode] = useState<CalendarView>('week')
  const [weekOffset, setWeekOffset] = useState(0)
  const [dayOffset, setDayOffset] = useState(0)
  const today = new Date()
  const [monthRef, setMonthRef] = useState({ year: today.getFullYear(), month: today.getMonth() })

  // Data state
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filter state
  const [courseFilter, setCourseFilter] = useState<CourseTypeFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

  // Detail state
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null)
  const [detailStudents, setDetailStudents] = useState<DetailStudent[]>([])

  // Roster modal state
  const [rosterCourseId, setRosterCourseId] = useState<string | null>(null)
  const [rosterCourseName, setRosterCourseName] = useState('')
  const [rosterMaxStudents, setRosterMaxStudents] = useState<number | undefined>(undefined)

  // Computed dates for API range
  const { startDate, endDate, weekStartDate, selectedDate, monthDate } = useMemo(() => {
    if (viewMode === 'week') {
      const ws = getWeekStartDate(weekOffset)
      const we = addDays(ws, 6)
      return {
        startDate: formatDate(ws),
        endDate: formatDate(we),
        weekStartDate: ws,
        selectedDate: new Date(),
        monthDate: new Date(monthRef.year, monthRef.month, 1),
      }
    }
    if (viewMode === 'day') {
      const d = new Date()
      d.setDate(d.getDate() + dayOffset)
      return {
        startDate: formatDate(d),
        endDate: formatDate(d),
        weekStartDate: getWeekStartDate(0),
        selectedDate: d,
        monthDate: new Date(monthRef.year, monthRef.month, 1),
      }
    }
    // month
    const first = new Date(monthRef.year, monthRef.month, 1)
    const last = new Date(monthRef.year, monthRef.month + 1, 0)
    return {
      startDate: formatDate(first),
      endDate: formatDate(last),
      weekStartDate: getWeekStartDate(0),
      selectedDate: new Date(),
      monthDate: first,
    }
  }, [viewMode, weekOffset, dayOffset, monthRef])

  // ---- Data fetching ----

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `${API_BASE}/api/w8/schedules?start_date=${startDate}&end_date=${endDate}`,
        { credentials: 'include' }
      )
      if (!res.ok) {
        if (res.status === 401) { router.push('/login'); return }
        console.error('Fetch schedules failed:', res.status)
        return
      }
      const data = await res.json()
      const schedules = data.data?.schedules || data.schedules || []

      // 展開 schedules 為具體日期的 ScheduleEvent
      const expanded: ScheduleEvent[] = []
      const start = new Date(startDate + 'T00:00:00')
      const end = new Date(endDate + 'T00:00:00')

      for (const s of schedules) {
        // If schedule has scheduled_date, use it directly
        if (s.scheduled_date) {
          expanded.push({
            id: s.id,
            courseId: s.course_id,
            courseName: s.course_name,
            courseType: s.course_type || 'group',
            teacherName: s.teacher_name,
            startTime: s.start_time,
            endTime: s.end_time,
            room: s.room_name,
            dayOfWeek: new Date(s.scheduled_date + 'T00:00:00').getDay(),
            studentName: s.student_names?.[0],
            studentCount: s.student_ids?.length,
            date: s.scheduled_date,
          })
        } else if (s.day_of_week !== undefined) {
          // Recurrence rule: expand to matching days in range
          const cursor = new Date(start)
          while (cursor <= end) {
            if (cursor.getDay() === s.day_of_week) {
              const dateStr = formatDate(cursor)
              expanded.push({
                id: `${s.id}-${dateStr}`,
                courseId: s.course_id,
                courseName: s.course_name,
                courseType: s.course_type || 'group',
                teacherName: s.teacher_name,
                startTime: s.start_time,
                endTime: s.end_time,
                room: s.room_name,
                dayOfWeek: s.day_of_week,
                studentName: s.student_names?.[0],
                studentCount: s.student_ids?.length,
                date: dateStr,
              })
            }
            cursor.setDate(cursor.getDate() + 1)
          }
        }
      }

      setEvents(expanded)
    } catch (err) {
      console.error('Failed to fetch schedules:', err)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, router])

  const fetchCourses = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/w8/courses`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      const rawCourses = data.data?.courses || data.courses || []
      setCourses(
        rawCourses.map((c: Record<string, unknown>) => ({
          id: c.id as string,
          name: (c.name as string) || '',
          courseType: (c.course_type as string) || 'group',
          subject: (c.subject as string) || undefined,
          studentCount: c.student_count as number | undefined,
          maxStudents: c.max_students as number | undefined,
        }))
      )
    } catch (err) {
      console.error('Failed to fetch courses:', err)
    }
  }, [])

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (!userStr) { router.push('/login'); return }
    fetchCourses()
  }, [router, fetchCourses])

  useEffect(() => { fetchSchedules() }, [fetchSchedules])

  // ---- Filtered events ----

  const filteredEvents = useMemo(() => {
    let filtered = events
    if (courseFilter !== 'all') {
      filtered = filtered.filter(e => e.courseType === courseFilter)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(e => e.courseName.toLowerCase().includes(q))
    }
    if (selectedCourseId) {
      filtered = filtered.filter(e => e.courseId === selectedCourseId)
    }
    return filtered
  }, [events, courseFilter, searchQuery, selectedCourseId])

  // ---- Stats ----

  const stats = useMemo(() => {
    const todayStr = formatDate(new Date())
    const todayEvents = events.filter(e => e.date === todayStr)
    let inSession = 0
    let ended = 0
    let upcoming = 0

    for (const e of todayEvents) {
      const status = getScheduleStatus(e)
      if (status === 'in_session') inSession++
      else if (status === 'ended' || status === 'dismissed') ended++
      else upcoming++
    }

    return { total: todayEvents.length, inSession, ended, upcoming }
  }, [events])

  // ---- Event click → detail ----

  const handleEventClick = useCallback(async (event: ScheduleEvent) => {
    setSelectedEvent(event)
    setDetailStudents([])

    // Try to fetch detail with students
    try {
      const baseId = event.id.includes('-') ? event.id.split('-').slice(0, -1).join('-') : event.id
      // Try the original id first, if it looks like a UUID
      const fetchId = /^[0-9a-f-]{36}$/i.test(event.id) ? event.id : baseId
      const res = await fetch(`${API_BASE}/api/w8/schedules/${fetchId}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        const detail = data.data || data
        if (detail.students) {
          setDetailStudents(
            detail.students.map((s: Record<string, unknown>) => ({
              id: s.id as string,
              name: s.name as string,
              grade: s.grade as string | undefined,
            }))
          )
        }
      }
    } catch {
      // ignore detail fetch error
    }
  }, [])

  // ---- Navigation ----

  const handlePrev = () => {
    if (viewMode === 'week') setWeekOffset(w => w - 1)
    else if (viewMode === 'day') setDayOffset(d => d - 1)
    else setMonthRef(m => {
      const mo = m.month - 1
      return mo < 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: mo }
    })
  }

  const handleNext = () => {
    if (viewMode === 'week') setWeekOffset(w => w + 1)
    else if (viewMode === 'day') setDayOffset(d => d + 1)
    else setMonthRef(m => {
      const mo = m.month + 1
      return mo > 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: mo }
    })
  }

  const handleToday = () => {
    const now = new Date()
    setWeekOffset(0)
    setDayOffset(0)
    setMonthRef({ year: now.getFullYear(), month: now.getMonth() })
  }

  const handleMonthDateClick = (date: Date) => {
    setDayOffset(Math.round((date.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000))
    setViewMode('day')
  }

  const handleCourseClick = (courseId: string) => {
    setSelectedCourseId(prev => prev === courseId ? null : courseId)
  }

  // ---- Range label ----

  const rangeLabel = useMemo(() => {
    if (viewMode === 'week') {
      const ws = weekStartDate
      const we = addDays(ws, 6)
      const label = weekOffset === 0 ? '本週' : weekOffset > 0 ? `${weekOffset}週後` : `${-weekOffset}週前`
      return `${ws.getMonth() + 1}/${ws.getDate()} - ${we.getMonth() + 1}/${we.getDate()}  ${label}`
    }
    if (viewMode === 'day') {
      const todayLabel = dayOffset === 0 ? ' 今天' : ''
      return `${selectedDate.getFullYear()}/${selectedDate.getMonth() + 1}/${selectedDate.getDate()}${todayLabel}`
    }
    return `${monthRef.year} 年 ${monthRef.month + 1} 月`
  }, [viewMode, weekStartDate, weekOffset, dayOffset, selectedDate, monthRef])

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white rounded-t-2xl">
        <h1 className="text-lg font-semibold text-text">排課中心</h1>

        <div className="flex items-center gap-3">
          {/* View switcher */}
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {(['week', 'day', 'month'] as CalendarView[]).map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  viewMode === m ? 'bg-primary text-white' : 'text-text-muted hover:text-text bg-white'
                }`}
              >
                {m === 'week' ? '週' : m === 'day' ? '日' : '月'}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 text-text-muted hover:text-text rounded-lg hover:bg-border/40 transition-colors text-sm"
            >
              &larr;
            </button>
            <span className="text-sm font-medium text-text min-w-[140px] text-center">{rangeLabel}</span>
            <button
              onClick={handleNext}
              className="p-1.5 text-text-muted hover:text-text rounded-lg hover:bg-border/40 transition-colors text-sm"
            >
              &rarr;
            </button>
            <button
              onClick={handleToday}
              className="text-xs px-2 py-1 rounded-md border border-border text-text-muted hover:text-text hover:bg-border/40 transition-colors ml-1"
            >
              今天
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <span className="w-2 h-2 rounded-sm bg-[#9DAEBB] inline-block" />團班
          </span>
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <span className="w-2 h-2 rounded-sm bg-[#C8A882] inline-block" />個指
          </span>
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <span className="w-2 h-2 rounded-sm bg-[#A8B5A2] inline-block" />安親
          </span>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden bg-white rounded-b-2xl shadow-sm border border-border border-t-0">
        {/* Left: CoursePanel */}
        <div className="w-60 border-r border-border overflow-y-auto">
          <CoursePanel
            courses={courses}
            filter={courseFilter}
            onFilterChange={setCourseFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onCourseClick={handleCourseClick}
            selectedCourseId={selectedCourseId}
          />
        </div>

        {/* Right: Calendar */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {viewMode === 'week' && (
                <WeekView
                  events={filteredEvents}
                  weekStartDate={weekStartDate}
                  onEventClick={handleEventClick}
                />
              )}
              {viewMode === 'day' && (
                <DayView
                  events={filteredEvents}
                  date={selectedDate}
                  onEventClick={handleEventClick}
                />
              )}
              {viewMode === 'month' && (
                <MonthView
                  events={filteredEvents}
                  monthDate={monthDate}
                  onDateClick={handleMonthDateClick}
                  onEventClick={handleEventClick}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer stats */}
      <div className="flex gap-6 px-6 py-3 border-t border-border bg-white rounded-b-2xl mt-1 shadow-sm">
        <span className="text-xs text-text-muted">
          今日 <span className="font-semibold text-text">{stats.total}</span> 堂
        </span>
        <span className="text-xs text-text-muted flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT.in_session}`} />
          上課中 <span className="font-semibold text-text">{stats.inSession}</span>
        </span>
        <span className="text-xs text-text-muted flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT.ended}`} />
          已結束 <span className="font-semibold text-text">{stats.ended}</span>
        </span>
        <span className="text-xs text-text-muted flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT.upcoming}`} />
          未開始 <span className="font-semibold text-text">{stats.upcoming}</span>
        </span>
      </div>

      {/* Detail Drawer */}
      {selectedEvent && (
        <DetailDrawer
          event={selectedEvent}
          students={detailStudents}
          onClose={() => { setSelectedEvent(null); setDetailStudents([]) }}
          onEditClick={() => {
            // TODO: navigate to edit page
            setSelectedEvent(null)
          }}
          onRosterClick={() => {
            if (selectedEvent) {
              setRosterCourseId(selectedEvent.courseId)
              setRosterCourseName(selectedEvent.courseName)
              setRosterMaxStudents(selectedEvent.maxStudents)
            }
            setSelectedEvent(null)
          }}
        />
      )}

      {/* Roster Modal */}
      <RosterModal
        isOpen={!!rosterCourseId}
        onClose={() => setRosterCourseId(null)}
        courseId={rosterCourseId ?? ''}
        courseName={rosterCourseName}
        maxStudents={rosterMaxStudents}
        onUpdated={() => {
          setRosterCourseId(null)
          fetchSchedules()
          fetchCourses()
        }}
      />
    </div>
  )
}
