'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BackButton } from '@/components/ui/BackButton'

interface Schedule {
  id: string
  course_id: string
  course_name: string
  subject: string
  teacher_id: string
  teacher_name: string
  teacher_title: string
  scheduled_date: string
  start_time: string
  end_time: string
  status: string
  rate_per_class: string
}

interface Teacher {
  id: string
  name: string
  title: string
  rate_per_class: string
}

interface Course {
  id: string
  name: string
  subject: string
  duration_minutes: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3100'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

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
const formatTime = (time: string) => time.slice(0, 5)

export default function SchedulesPage() {
  const router = useRouter()
  const [weekOffset, setWeekOffset] = useState(0)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({
    course_id: '',
    teacher_id: '',
    scheduled_date: '',
    start_time: '',
    end_time: '',
  })

  const weekDates = getWeekDates(weekOffset)
  const startDate = formatDate(weekDates[0])
  const endDate = formatDate(weekDates[6])

  useEffect(() => {
    // 檢查登入狀態
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      router.push('/login')
      return
    }
    
    fetchSchedules()
    fetchTeachers()
    fetchCourses()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset])

  const fetchSchedules = async () => {
    setLoading(true)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      console.error('No token found')
      router.push('/login')
      return
    }
    try {
      const res = await fetch(
        `${API_BASE}/api/w8/schedules?start_date=${startDate}&end_date=${endDate}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
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
  }

  const fetchTeachers = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/w8/teachers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
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
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/w8/courses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
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
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    try {
      const res = await fetch(`${API_BASE}/api/w8/schedules`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(addForm),
      })
      if (res.ok) {
        setShowAddModal(false)
        setAddForm({ course_id: '', teacher_id: '', scheduled_date: '', start_time: '', end_time: '' })
        fetchSchedules()
      }
    } catch (err) {
      console.error('Failed to add schedule:', err)
    }
  }

  const getSchedulesForDate = (date: Date) => {
    const dateStr = formatDate(date)
    return schedules.filter(s => s.scheduled_date === dateStr)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700'
      case 'completed': return 'bg-green-100 text-green-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      case 'rescheduled': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getSubjectColor = (subject: string) => {
    switch (subject) {
      case '數學': return 'border-l-blue-500'
      case '英文': return 'border-l-green-500'
      case '體育': return 'border-l-orange-500'
      default: return 'border-l-gray-500'
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
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {weekDates.map((date, idx) => {
              const daySchedules = getSchedulesForDate(date)
              const isToday = formatDate(date) === formatDate(new Date())
              
              return (
                <div key={idx} className={`rounded-xl border ${isToday ? 'border-primary bg-primary/5' : 'border-border bg-surface'}`}>
                  {/* Day Header */}
                  <div className={`px-4 py-2 border-b ${isToday ? 'border-primary/20' : 'border-border'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-text'}`}>
                        週{WEEKDAYS[date.getDay()]}
                      </span>
                      <span className="text-sm text-text-muted">
                        {date.getMonth() + 1}/{date.getDate()}
                      </span>
                      {isToday && (
                        <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full">
                          今天
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Day Content */}
                  <div className="p-3">
                    {daySchedules.length === 0 ? (
                      <p className="text-sm text-text-muted text-center py-2">無課程</p>
                    ) : (
                      <div className="space-y-2">
                        {daySchedules.map((schedule) => (
                          <div
                            key={schedule.id}
                            onClick={() => setSelectedSchedule(schedule)}
                            className={`p-3 bg-background rounded-lg border-l-4 ${getSubjectColor(schedule.subject)} cursor-pointer hover:shadow-md transition-shadow`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-text">{schedule.course_name}</p>
                                <p className="text-sm text-text-muted">
                                  {schedule.teacher_name} {schedule.teacher_title}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-text">
                                  {formatTime(schedule.start_time)}-{formatTime(schedule.end_time)}
                                </p>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(schedule.status)}`}>
                                  {schedule.status === 'scheduled' ? '已排' : schedule.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Schedule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-text mb-4">新增排課</h2>
            <form onSubmit={handleAddSchedule} className="space-y-4">
              <div>
                <label className="block text-sm text-text-muted mb-1">課程 *</label>
                <select
                  value={addForm.course_id}
                  onChange={(e) => setAddForm({ ...addForm, course_id: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                  required
                >
                  <option value="">選擇課程</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.subject})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">講師 *</label>
                <select
                  value={addForm.teacher_id}
                  onChange={(e) => setAddForm({ ...addForm, teacher_id: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                  required
                >
                  <option value="">選擇講師</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.title}) - ${t.rate_per_class}/堂</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">日期 *</label>
                <input
                  type="date"
                  value={addForm.scheduled_date}
                  onChange={(e) => setAddForm({ ...addForm, scheduled_date: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-text-muted mb-1">開始時間 *</label>
                  <input
                    type="time"
                    value={addForm.start_time}
                    onChange={(e) => setAddForm({ ...addForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">結束時間 *</label>
                  <input
                    type="time"
                    value={addForm.end_time}
                    onChange={(e) => setAddForm({ ...addForm, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 border border-border rounded-lg text-text"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-white rounded-lg font-medium"
                >
                  新增排課
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-text mb-4">{selectedSchedule.course_name}</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-text-muted">講師</span>
                <span className="text-text">{selectedSchedule.teacher_name} {selectedSchedule.teacher_title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">日期</span>
                <span className="text-text">{selectedSchedule.scheduled_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">時間</span>
                <span className="text-text">
                  {formatTime(selectedSchedule.start_time)} - {formatTime(selectedSchedule.end_time)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">科目</span>
                <span className="text-text">{selectedSchedule.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">堂薪</span>
                <span className="text-primary font-medium">${Number(selectedSchedule.rate_per_class).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">狀態</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(selectedSchedule.status)}`}>
                  {selectedSchedule.status === 'scheduled' ? '已排' : selectedSchedule.status === 'completed' ? '已完成' : selectedSchedule.status === 'cancelled' ? '已取消' : selectedSchedule.status}
                </span>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              {selectedSchedule.status === 'scheduled' && (
                <button
                  onClick={async () => {
                    if (!confirm('確定取消此堂課？')) return
                    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
                    try {
                      await fetch(`${API_BASE}/api/w8/schedules/${selectedSchedule.id}/change`, {
                        method: 'POST',
                        headers: { 
                          'Content-Type': 'application/json',
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({ change_type: 'cancelled', reason: '手動取消' }),
                      })
                      setSelectedSchedule(null)
                      fetchSchedules()
                    } catch { alert('取消失敗') }
                  }}
                  className="flex-1 py-2 border border-[#B5706E] text-[#B5706E] rounded-lg text-sm"
                >
                  取消此課
                </button>
              )}
              <button
                onClick={() => setSelectedSchedule(null)}
                className="flex-1 py-2 bg-primary text-white rounded-lg font-medium"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
