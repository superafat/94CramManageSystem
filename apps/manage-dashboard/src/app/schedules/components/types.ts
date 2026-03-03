export type CourseType = 'group' | 'individual' | 'daycare'

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
  course_type?: CourseType
  room_id?: string
  room_name?: string
  student_ids?: string[]
  student_names?: string[]
  fee_per_class?: string
  instruction_mode?: 'teacher' | 'self_study'
  // 繳費狀態（可由後端填入，或用 Demo 假資料）
  unpaidCount?: number
  unpaidStudents?: string[]
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

export interface Student {
  id: string
  name: string
}

export interface AddForm {
  courseId: string
  teacherId: string
  scheduledDate: string
  startTime: string
  endTime: string
  courseType: CourseType
  roomId: string
  studentIds: string[]
  feePerClass: string
  instructionMode: 'teacher' | 'self_study'
  recurrenceMode: 'single' | 'weekly'
  weekDays: number[]
  recurrenceStart: string
  recurrenceEnd: string
}

export interface ConflictWarning {
  type: 'room' | 'teacher'
  message: string
}

export interface RenewalForm {
  courseName: string
  teacherId: string
  startTime: string
  endTime: string
  courseType: CourseType
  studentIds: string[]
  feePerClass: string
  startMonth: string   // YYYY-MM
  endMonth: string     // YYYY-MM
  roomId: string
}

export type PaymentStatus = 'paid' | 'pending' | 'unpaid'

export interface StudentBillingInfo {
  studentId: string
  studentName: string
  status: PaymentStatus
}

export interface CourseBillingData {
  courseId: string
  total: number
  paid: number
  students: StudentBillingInfo[]
}
