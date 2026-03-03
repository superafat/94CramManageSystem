'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BackButton } from '@/components/ui/BackButton'
import { Schedule, Teacher, Course, Student, AddForm, ConflictWarning } from './components/types'
import WeeklyScheduleGrid from './components/WeeklyScheduleGrid'
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

const getWeekDates = (offset: number = 0) => {
  const today = new Date()
  const currentDay = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - currentDay + 1 + (offset * 7))

  const dates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    dates.push(date)
  }
  return dates
}

const formatDate = (date: Date) => date.toISOString().split('T')[0]

// 判斷兩個時段是否重疊（HH:MM 格式字串）
const timesOverlap = (
  aStart: string, aEnd: string,
  bStart: string, bEnd: string,
): boolean => {
  return aStart < bEnd && bStart < aEnd
}

export default function SchedulesPage() {
  const router = useRouter()
  const [weekOffset, setWeekOffset] = useState(0)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState<AddForm>(DEFAULT_FORM)

  // Renewal state
  const [renewalSchedule, setRenewalSchedule] = useState<Schedule | null>(null)

  // Toast state
  const [toast, setToast] = useState<string | null>(null)

  const weekDates = getWeekDates(weekOffset)
  const startDate = formatDate(weekDates[0])
  const endDate = formatDate(weekDates[6])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  // 衝突偵測：每次表單欄位變動時重新計算
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

      // 教室衝突（有填教室才偵測）
      if (
        addForm.roomId.trim() &&
        s.room_name &&
        s.room_name.trim() === addForm.roomId.trim()
      ) {
        warnings.push({
          type: 'room',
          message: `教室「${addForm.roomId}」${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)} 已有「${s.course_name}」`,
        })
      }

      // 老師衝突
      if (addForm.teacherId && s.teacher_id === addForm.teacherId) {
        warnings.push({
          type: 'teacher',
          message: `${s.teacher_name} 老師 ${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)} 已有「${s.course_name}」`,
        })
      }
    }

    return warnings
  }, [addForm.scheduledDate, addForm.startTime, addForm.endTime, addForm.roomId, addForm.teacherId, schedules])

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `${API_BASE}/api/w8/schedules?start_date=${startDate}&end_date=${endDate}`,
        { credentials: 'include' }
      )
      if (!res.ok) {
        console.error('Fetch schedules failed:', res.status, res.statusText)
        if (res.status === 401) {
          router.push('/login')
          return
        }
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
    if (!userStr) {
      router.push('/login')
      return
    }
    fetchTeachers()
    fetchCourses()
    fetchStudents()
  }, [router])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  const fetchTeachers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/w8/teachers`, { credentials: 'include' })
      if (!res.ok) {
        console.error('Fetch teachers failed:', res.status)
        return
      }
      const data = await res.json()
      setTeachers(data.data?.teachers || data.teachers || [])
    } catch (err) {
      console.error('Failed to fetch teachers:', err)
    }
  }

  const fetchCourses = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/w8/courses`, { credentials: 'include' })
      if (!res.ok) {
        console.error('Fetch courses failed:', res.status)
        return
      }
      const data = await res.json()
      setCourses(data.data?.courses || data.courses || [])
    } catch (err) {
      console.error('Failed to fetch courses:', err)
    }
  }

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/w8/students`, { credentials: 'include' })
      if (!res.ok) {
        console.error('Fetch students failed:', res.status)
        return
      }
      const data = await res.json()
      setStudents(data.data?.students || data.students || [])
    } catch (err) {
      console.error('Failed to fetch students:', err)
    }
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
      ...(addForm.courseType === 'individual' && addForm.studentIds.length > 0
        ? { studentIds: addForm.studentIds }
        : {}),
      ...(addForm.courseType === 'individual' && addForm.feePerClass
        ? { feePerClass: addForm.feePerClass }
        : {}),
      ...(addForm.courseType === 'individual'
        ? { instructionMode: addForm.instructionMode }
        : {}),
    })

    try {
      if (addForm.recurrenceMode === 'single') {
        const payload = buildPayload(addForm.scheduledDate)
        const res = await fetch(`${API_BASE}/api/w8/schedules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          setShowAddModal(false)
          setAddForm(DEFAULT_FORM)
          fetchSchedules()
        } else {
          console.error('Add schedule failed:', res.status)
        }
      } else {
        // 計算 recurrenceStart ~ recurrenceEnd 之間符合 weekDays 的所有日期
        if (!addForm.recurrenceStart || !addForm.recurrenceEnd || addForm.weekDays.length === 0) return
        const dates: string[] = []
        const cursor = new Date(addForm.recurrenceStart + 'T00:00:00')
        const end = new Date(addForm.recurrenceEnd + 'T00:00:00')
        while (cursor <= end) {
          if (addForm.weekDays.includes(cursor.getDay())) {
            dates.push(cursor.toISOString().split('T')[0])
          }
          cursor.setDate(cursor.getDate() + 1)
        }
        if (dates.length === 0) return

        await Promise.all(
          dates.map(date =>
            fetch(`${API_BASE}/api/w8/schedules`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(buildPayload(date)),
            })
          )
        )
        setShowAddModal(false)
        setAddForm(DEFAULT_FORM)
        fetchSchedules()
        showToast(`已建立 ${dates.length} 堂週課`)
      }
    } catch (err) {
      console.error('Failed to add schedule:', err)
    }
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
    } catch {
      alert('取消失敗')
    }
  }

  const handleRenewalSuccess = () => {
    fetchSchedules()
    showToast('續班成功！已通知家長查看課表')
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton fallbackUrl="/dashboard" />
            <h1 className="text-lg font-semibold text-text">課表管理</h1>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium"
          >
            + 新增
          </button>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="p-2 text-text-muted hover:text-text"
          >
            ← 上週
          </button>
          <div className="text-center">
            <p className="font-medium text-text">
              {weekDates[0].getMonth() + 1}/{weekDates[0].getDate()} - {weekDates[6].getMonth() + 1}/{weekDates[6].getDate()}
            </p>
            <p className="text-xs text-text-muted">
              {weekOffset === 0 ? '本週' : weekOffset > 0 ? `${weekOffset}週後` : `${-weekOffset}週前`}
            </p>
          </div>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-2 text-text-muted hover:text-text"
          >
            下週 →
          </button>
        </div>

        {/* 課程類型圖例 */}
        <div className="flex items-center gap-3 mt-2 px-1">
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#9DAEBB] inline-block"></span>團班
          </span>
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#C8A882] inline-block"></span>個指
          </span>
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#A8B5A2] inline-block"></span>安親
          </span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        <WeeklyScheduleGrid
          weekDates={weekDates}
          schedules={schedules}
          loading={loading}
          weekOffset={weekOffset}
          onSelectSchedule={setSelectedSchedule}
          onRenewSchedule={setRenewalSchedule}
        />
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
          onClose={() => setSelectedSchedule(null)}
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-[#4A6B44] text-white text-sm rounded-2xl shadow-lg animate-fade-in whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
