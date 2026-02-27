'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BackButton } from '@/components/ui/BackButton'
import { Schedule, Teacher, Course, AddForm } from './components/types'
import WeeklyScheduleGrid from './components/WeeklyScheduleGrid'
import ScheduleForm, { ScheduleDetailModal } from './components/ScheduleForm'
import TeacherCourseSelector from './components/TeacherCourseSelector'

const API_BASE = ''

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

export default function SchedulesPage() {
  const router = useRouter()
  const [weekOffset, setWeekOffset] = useState(0)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState<AddForm>({
    courseId: '',
    teacherId: '',
    scheduledDate: '',
    startTime: '',
    endTime: '',
  })

  const weekDates = getWeekDates(weekOffset)
  const startDate = formatDate(weekDates[0])
  const endDate = formatDate(weekDates[6])

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

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_BASE}/api/w8/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(addForm),
      })
      if (res.ok) {
        setShowAddModal(false)
        setAddForm({ courseId: '', teacherId: '', scheduledDate: '', startTime: '', endTime: '' })
        fetchSchedules()
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
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        <WeeklyScheduleGrid
          weekDates={weekDates}
          schedules={schedules}
          loading={loading}
          weekOffset={weekOffset}
          onSelectSchedule={setSelectedSchedule}
        />
      </div>

      {/* Add Schedule Modal */}
      {showAddModal && (
        <ScheduleForm
          addForm={addForm}
          onFormChange={setAddForm}
          onSubmit={handleAddSchedule}
          onClose={() => setShowAddModal(false)}
        >
          <TeacherCourseSelector
            teachers={teachers}
            courses={courses}
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
    </div>
  )
}
