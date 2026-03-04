'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BackButton } from '@/components/ui/BackButton'
import { Schedule, Teacher, Course, Student, AddForm, ConflictWarning } from './components/types'
import CalendarView, { CalendarViewMode } from './components/CalendarView'
import CourseListPanel from './components/CourseListPanel'
import ScheduleForm, { ScheduleDetailModal } from './components/ScheduleForm'
import TeacherCourseSelector from './components/TeacherCourseSelector'
import RenewalModal from './components/RenewalModal'

const API_BASE = ''

const DEFAULT_FORM: AddForm = {
  courseId: '',
  teacherId: '',
  scheduledDate: '',
  startTime: '',
  endTime: '',
  courseType: 'group',
  roomId: '',
  studentIds: [],
  feePerClass: '',
  instructionMode: 'teacher',
  recurrenceMode: 'single',
  weekDays: [],
  recurrenceStart: '',
  recurrenceEnd: '',
}

// ---- Date helpers ----

const formatDate = (date: Date) => date.toISOString().split('T')[0]

/** Returns 7 days starting from Monday of the week offset-ed from today */
function getWeekDates(offset: number): Date[] {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - today.getDay() + 1 + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

/** Returns a single day */
function getDayDates(offset: number): Date[] {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return [d]
}

/** Returns padded month grid (Sun-start, 35 or 42 cells) */
function getMonthDates(yearMonth: { year: number; month: number }): Date[] {
  const { year, month } = yearMonth
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startPad = first.getDay() // 0=Sun
  const endPad = 6 - last.getDay()
  const cells: Date[] = []
  for (let i = startPad; i > 0; i--) {
    const d = new Date(first)
    d.setDate(first.getDate() - i)
    cells.push(d)
  }
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d))
  for (let i = 1; i <= endPad; i++) {
    const d = new Date(last)
    d.setDate(last.getDate() + i)
    cells.push(d)
  }
  // Ensure at least 35 rows (5 weeks); add a 6th week row if needed
  while (cells.length < 35) {
    const d = new Date(cells[cells.length - 1])
    d.setDate(d.getDate() + 1)
    cells.push(d)
  }
  return cells
}

const timesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  aStart < bEnd && bStart < aEnd

// ---- Label helpers ----

function viewRangeLabel(mode: CalendarViewMode, dates: Date[], weekOffset: number, dayOffset: number, monthRef: { year: number; month: number }) {
  if (mode === 'week') {
    const [s, e] = [dates[0], dates[6]]
    const label = weekOffset === 0 ? '本週' : weekOffset > 0 ? `${weekOffset}週後` : `${-weekOffset}週前`
    return `${s.getMonth() + 1}/${s.getDate()} – ${e.getMonth() + 1}/${e.getDate()}  ${label}`
  }
  if (mode === 'day') {
    const d = dates[0]
    const todayLabel = dayOffset === 0 ? ' 今天' : ''
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}${todayLabel}`
  }
  return `${monthRef.year} 年 ${monthRef.month + 1} 月`
}

// ---- Page ----

export default function SchedulesPage() {
  const router = useRouter()

  // Calendar state
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week')
  const [weekOffset, setWeekOffset] = useState(0)
  const [dayOffset, setDayOffset] = useState(0)
  const today = new Date()
  const [monthRef, setMonthRef] = useState({ year: today.getFullYear(), month: today.getMonth() })

  // Data state
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState<AddForm>(DEFAULT_FORM)
  const [renewalSchedule, setRenewalSchedule] = useState<Schedule | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Computed view dates
  const viewDates = useMemo(() => {
    if (viewMode === 'week') return getWeekDates(weekOffset)
    if (viewMode === 'day') return getDayDates(dayOffset)
    return getMonthDates(monthRef)
  }, [viewMode, weekOffset, dayOffset, monthRef])

  // API date range for fetching
  const { startDate, endDate } = useMemo(() => {
    const sorted = [...viewDates].sort((a, b) => a.getTime() - b.getTime())
    return { startDate: formatDate(sorted[0]), endDate: formatDate(sorted[sorted.length - 1]) }
  }, [viewDates])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  // Conflict detection
  const conflicts = useMemo<ConflictWarning[]>(() => {
    if (!addForm.scheduledDate || !addForm.startTime || !addForm.endTime) return []
    const warnings: ConflictWarning[] = []
    const sameDaySchedules = schedules.filter(
      s => s.scheduled_date === addForm.scheduledDate && s.status !== 'cancelled'
    )
    for (const s of sameDaySchedules) {
      const overlap = timesOverlap(
        addForm.startTime, addForm.endTime,
        s.start_time.slice(0, 5), s.end_time.slice(0, 5),
      )
      if (!overlap) continue
      if (addForm.roomId.trim() && s.room_name && s.room_name.trim() === addForm.roomId.trim()) {
        warnings.push({ type: 'room', message: `教室「${addForm.roomId}」${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)} 已有「${s.course_name}」` })
      }
      if (addForm.teacherId && s.teacher_id === addForm.teacherId) {
        warnings.push({ type: 'teacher', message: `${s.teacher_name} 老師 ${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)} 已有「${s.course_name}」` })
      }
    }
    return warnings
  }, [addForm.scheduledDate, addForm.startTime, addForm.endTime, addForm.roomId, addForm.teacherId, schedules])

  // Fetch schedules
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
      }
      const data = await res.json()
      setSchedules(data.data?.schedules || data.schedules || [])
    } catch (err) {
      console.error('Failed to fetch schedules:', err)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, router])

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (!userStr) { router.push('/login'); return }
    fetchTeachers()
    fetchCourses()
    fetchStudents()
  }, [router])

  useEffect(() => { fetchSchedules() }, [fetchSchedules])

  const fetchTeachers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/w8/teachers`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setTeachers(data.data?.teachers || data.teachers || [])
    } catch (err) { console.error('Failed to fetch teachers:', err) }
  }

  const fetchCourses = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/w8/courses`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setCourses(data.data?.courses || data.courses || [])
    } catch (err) { console.error('Failed to fetch courses:', err) }
  }

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/w8/students`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setStudents(data.data?.students || data.students || [])
    } catch (err) { console.error('Failed to fetch students:', err) }
  }

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    const buildPayload = (scheduledDate: string) => ({
      courseId: addForm.courseId,
      teacherId: addForm.teacherId || undefined,
      scheduledDate,
      startTime: addForm.startTime,
      endTime: addForm.endTime,
      courseType: addForm.courseType,
      ...(addForm.roomId.trim() ? { roomId: addForm.roomId.trim() } : {}),
      ...(addForm.courseType === 'individual' && addForm.studentIds.length > 0 ? { studentIds: addForm.studentIds } : {}),
      ...(addForm.courseType === 'individual' && addForm.feePerClass ? { feePerClass: addForm.feePerClass } : {}),
      ...(addForm.courseType === 'individual' ? { instructionMode: addForm.instructionMode } : {}),
    })

    try {
      if (addForm.recurrenceMode === 'single') {
        const res = await fetch(`${API_BASE}/api/w8/schedules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(buildPayload(addForm.scheduledDate)),
        })
        if (res.ok) { setShowAddModal(false); setAddForm(DEFAULT_FORM); fetchSchedules() }
        else console.error('Add schedule failed:', res.status)
      } else {
        if (!addForm.recurrenceStart || !addForm.recurrenceEnd || addForm.weekDays.length === 0) return
        const dates: string[] = []
        const cursor = new Date(addForm.recurrenceStart + 'T00:00:00')
        const end = new Date(addForm.recurrenceEnd + 'T00:00:00')
        while (cursor <= end) {
          if (addForm.weekDays.includes(cursor.getDay())) dates.push(cursor.toISOString().split('T')[0])
          cursor.setDate(cursor.getDate() + 1)
        }
        if (dates.length === 0) return
        const results = await Promise.all(
          dates.map(date => fetch(`${API_BASE}/api/w8/schedules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(buildPayload(date)),
          }))
        )
        const failedCount = results.filter(r => !r.ok).length
        setShowAddModal(false); setAddForm(DEFAULT_FORM); fetchSchedules()
        showToast(failedCount > 0
          ? `已建立 ${dates.length - failedCount} 堂週課（${failedCount} 堂失敗）`
          : `已建立 ${dates.length} 堂週課`)
      }
    } catch (err) { console.error('Failed to add schedule:', err) }
  }

  const handleCancelSchedule = async (scheduleId: string) => {
    if (!confirm('確定取消此堂課？')) return
    try {
      await fetch(`${API_BASE}/api/w8/schedules/${scheduleId}/change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ changeType: 'cancel', reason: '手動取消' }),
      })
      setSelectedSchedule(null)
      fetchSchedules()
    } catch { alert('取消失敗') }
  }

  const handleRenewalSuccess = () => {
    fetchSchedules()
    showToast('續班成功！已通知家長查看課表')
  }

  // Navigation handlers
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
    setWeekOffset(0); setDayOffset(0)
    setMonthRef({ year: now.getFullYear(), month: now.getMonth() })
  }

  const handleSelectFromList = (schedule: Schedule) => {
    setHighlightedId(schedule.id)
    setSelectedSchedule(schedule)
  }

  const rangeLabel = viewRangeLabel(viewMode, viewDates, weekOffset, dayOffset, monthRef)

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Top Header */}
      <div className="bg-surface border-b border-border px-4 py-3 shrink-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton fallbackUrl="/dashboard" />
            <h1 className="text-lg font-semibold text-text">課表管理</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode switcher */}
            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
              {(['week', 'day', 'month'] as CalendarViewMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    viewMode === m ? 'bg-primary text-white' : 'text-text-muted hover:text-text bg-surface'
                  }`}
                >
                  {m === 'week' ? '週' : m === 'day' ? '日' : '月'}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium"
            >
              + 新增
            </button>
          </div>
        </div>

        {/* Navigation row */}
        <div className="flex items-center justify-between mt-2">
          <button
            onClick={handlePrev}
            className="p-1.5 text-text-muted hover:text-text rounded-lg hover:bg-border/40 transition-colors text-sm"
          >
            ←
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text">{rangeLabel}</span>
            <button
              onClick={handleToday}
              className="text-xs px-2 py-1 rounded-md border border-border text-text-muted hover:text-text hover:bg-border/40 transition-colors"
            >
              今天
            </button>
          </div>
          <button
            onClick={handleNext}
            className="p-1.5 text-text-muted hover:text-text rounded-lg hover:bg-border/40 transition-colors text-sm"
          >
            →
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-1.5 px-1">
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <span className="w-2 h-2 rounded-sm bg-[#9DAEBB] inline-block"></span>團班
          </span>
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <span className="w-2 h-2 rounded-sm bg-[#C8A882] inline-block"></span>個指
          </span>
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <span className="w-2 h-2 rounded-sm bg-[#A8B5A2] inline-block"></span>安親
          </span>
        </div>
      </div>

      {/* Main split layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Course list panel */}
        <CourseListPanel
          schedules={schedules}
          loading={loading}
          highlightedId={highlightedId}
          onSelectSchedule={handleSelectFromList}
        />

        {/* Right: Calendar */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <CalendarView
            mode={viewMode}
            viewDates={viewDates}
            schedules={schedules}
            loading={loading}
            highlightedId={highlightedId}
            onSelectSchedule={(s) => { setHighlightedId(s.id); setSelectedSchedule(s) }}
            onRenewSchedule={setRenewalSchedule}
          />
        </div>
      </div>

      {/* Add Schedule Modal */}
      {showAddModal && (
        <ScheduleForm
          addForm={addForm}
          onFormChange={setAddForm}
          onSubmit={handleAddSchedule}
          onClose={() => { setShowAddModal(false); setAddForm(DEFAULT_FORM) }}
          conflicts={conflicts}
        >
          <TeacherCourseSelector
            teachers={teachers}
            courses={courses}
            students={students}
            addForm={addForm}
            onFormChange={setAddForm}
          />
        </ScheduleForm>
      )}

      {/* Detail Modal */}
      {selectedSchedule && (
        <ScheduleDetailModal
          schedule={selectedSchedule}
          onClose={() => { setSelectedSchedule(null); setHighlightedId(null) }}
          onCancel={handleCancelSchedule}
        />
      )}

      {/* Renewal Modal */}
      {renewalSchedule && (
        <RenewalModal
          schedule={renewalSchedule}
          teachers={teachers}
          students={students}
          onClose={() => setRenewalSchedule(null)}
          onSuccess={handleRenewalSuccess}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-[#4A6B44] text-white text-sm rounded-2xl shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
