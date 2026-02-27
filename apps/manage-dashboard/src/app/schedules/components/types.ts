export interface Schedule {
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

export interface Teacher {
  id: string
  name: string
  title: string
  rate_per_class: string
}

export interface Course {
  id: string
  name: string
  subject: string
  duration_minutes: number
}

export interface AddForm {
  courseId: string
  teacherId: string
  scheduledDate: string
  startTime: string
  endTime: string
}
