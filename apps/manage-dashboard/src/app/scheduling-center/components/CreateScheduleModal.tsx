'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import StudentPicker from './StudentPicker'

interface CreateScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

interface CourseOption {
  id: string
  name: string
  courseType: 'group' | 'individual' | 'daycare'
}

interface TeacherOption {
  id: string
  name: string
}

export default function CreateScheduleModal({ isOpen, onClose, onCreated }: CreateScheduleModalProps) {
  // Form state
  const [courseId, setCourseId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [room, setRoom] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())

  // Data state
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [teachers, setTeachers] = useState<TeacherOption[]>([])

  // Loading state
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [loadingTeachers, setLoadingTeachers] = useState(false)
  const [saving, setSaving] = useState(false)

  const selectedCourse = useMemo(() => courses.find(c => c.id === courseId), [courses, courseId])

  // Fetch courses
  const fetchCourses = useCallback(async () => {
    setLoadingCourses(true)
    try {
      const res = await fetch('/api/w8/courses', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      const list = data.data?.courses || data.courses || []
      setCourses(
        list.map((c: Record<string, unknown>) => ({
          id: c.id as string,
          name: (c.name as string) || '',
          courseType: (c.course_type as string) || 'group',
        }))
      )
    } catch (err) {
      console.error('Failed to fetch courses:', err)
    } finally {
      setLoadingCourses(false)
    }
  }, [])

  // Fetch teachers
  const fetchTeachers = useCallback(async () => {
    setLoadingTeachers(true)
    try {
      const res = await fetch('/api/w8/teachers', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      const list = data.data?.teachers || data.teachers || []
      setTeachers(
        list.map((t: Record<string, unknown>) => ({
          id: t.id as string,
          name: (t.name as string) || '',
        }))
      )
    } catch (err) {
      console.error('Failed to fetch teachers:', err)
    } finally {
      setLoadingTeachers(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchCourses()
      fetchTeachers()
      // Reset form
      setCourseId('')
      setScheduledDate('')
      setStartTime('')
      setEndTime('')
      setTeacherId('')
      setRoom('')
      setNotes('')
      setSelectedStudentIds(new Set())
    }
  }, [isOpen, fetchCourses, fetchTeachers])

  const handleSave = async () => {
    if (!courseId || !scheduledDate || !startTime || !endTime) return
    setSaving(true)
    try {
      // 1. Create schedule
      const res = await fetch('/api/w8/schedules', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          scheduledDate,
          startTime,
          endTime,
          teacherId: teacherId || undefined,
          room: room || undefined,
          notes: notes || undefined,
        }),
      })

      if (!res.ok) {
        console.error('Failed to create schedule:', res.status)
        return
      }

      // 2. Batch enroll students if any selected
      if (selectedStudentIds.size > 0 && courseId) {
        await fetch('/api/admin/enrollments/batch', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId,
            studentIds: Array.from(selectedStudentIds),
          }),
        })
      }

      onCreated()
    } catch (err) {
      console.error('Failed to create schedule:', err)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const isLoading = loadingCourses || loadingTeachers

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-lg w-full max-w-3xl max-h-[85vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-text">新增排課</h2>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text text-lg leading-none"
            >
              &times;
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Schedule fields */}
              <div className="grid grid-cols-2 gap-4">
                {/* Course */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-text-muted mb-1">課程</label>
                  <select
                    value={courseId}
                    onChange={e => {
                      setCourseId(e.target.value)
                      setSelectedStudentIds(new Set())
                    }}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40 bg-white"
                  >
                    <option value="">選擇課程</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Scheduled date */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">上課日期</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>

                {/* Room */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">教室</label>
                  <input
                    type="text"
                    value={room}
                    onChange={e => setRoom(e.target.value)}
                    placeholder="例：A101"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>

                {/* Start time */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">開始時間</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>

                {/* End time */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">結束時間</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>

                {/* Teacher */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">授課老師</label>
                  <select
                    value={teacherId}
                    onChange={e => setTeacherId(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40 bg-white"
                  >
                    <option value="">選擇老師</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">備註</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="選填"
                    rows={2}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
                  />
                </div>
              </div>

              {/* Student picker (show only when course is selected) */}
              {courseId && selectedCourse && (
                <div>
                  <h3 className="text-sm font-semibold text-text mb-3">
                    學生名單
                    <span className="ml-1 text-xs font-normal text-text-muted">
                      ({selectedStudentIds.size} 人)
                    </span>
                  </h3>
                  <StudentPicker
                    selectedIds={selectedStudentIds}
                    onSelectionChange={setSelectedStudentIds}
                    courseType={selectedCourse.courseType}
                  />
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end px-6 py-4 border-t border-border gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-text hover:bg-border/30 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !courseId || !scheduledDate || !startTime || !endTime}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '建立中...' : '建立排課'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
