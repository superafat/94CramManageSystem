export type CalendarView = 'day' | 'week' | 'month'
export type ScheduleStatus = 'in_session' | 'dismissed' | 'ended' | 'upcoming'
export type CourseTypeFilter = 'all' | 'group' | 'daycare' | 'individual'

export interface ScheduleEvent {
  id: string
  courseId: string
  courseName: string
  courseType: 'group' | 'individual' | 'daycare'
  teacherName: string
  startTime: string
  endTime: string
  room?: string
  dayOfWeek: number
  studentName?: string    // 個指用
  studentCount?: number
  maxStudents?: number
  date?: string           // 展開後的實際日期 YYYY-MM-DD
}

export interface CourseItem {
  id: string
  name: string
  courseType: string
  subject?: string
  studentCount?: number
  maxStudents?: number
}

export interface DetailStudent {
  id: string
  name: string
  grade?: string
}
