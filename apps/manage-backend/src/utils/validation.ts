/**
 * 統一的 Validation Utilities
 * 提供常用的 Zod schema 和驗證函數
 */
import { z } from 'zod'

// ===== Common Schemas =====

/** UUID v4 格式驗證 */
export const uuidSchema = z.string().uuid('Invalid UUID format')

/** 非空字串 */
export const nonEmptyString = z.string().min(1, 'Cannot be empty')

/** 電話號碼（台灣格式） */
export const phoneSchema = z.string()
  .regex(/^(09\d{8}|0\d{1,2}-?\d{6,8})$/, 'Invalid phone format')
  .optional()

/** Email */
export const emailSchema = z.string().email('Invalid email format').optional()

/** 日期字串 (YYYY-MM-DD) */
export const dateStringSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')

/** 時間字串 (HH:MM or HH:MM:SS) */
export const timeStringSchema = z.string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM or HH:MM:SS)')

/** 分頁參數 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/** 時間區間參數 */
export const dateRangeSchema = z.object({
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
}).refine(
  (data) => {
    if (data.from && data.to) {
      return new Date(data.from) <= new Date(data.to)
    }
    return true
  },
  { message: 'from date must be before or equal to to date' }
)

// ===== Security Validators =====

/** 
 * 清理可能的 XSS 字串
 * 移除危險的 HTML/JS 內容
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // 移除 < >
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
}

/** 
 * 安全的字串 Schema (防 XSS)
 * 自動清理輸入
 */
export const safeStringSchema = z.string().transform(sanitizeString)

/**
 * 驗證 SQL LIKE 查詢的搜尋字串
 * 防止 SQL injection wildcards 攻擊
 */
export function sanitizeSearchTerm(term: string): string {
  return term
    .replace(/[%_\\]/g, '') // 移除 SQL wildcards
    .replace(/[<>'"`;]/g, '') // 移除潛在危險字元
    .trim()
    .slice(0, 100) // 限制長度
}

// ===== Student Schemas =====

export const studentStatusSchema = z.enum(['active', 'inactive', 'dropped', 'graduated', 'suspended'])

export const createStudentSchema = z.object({
  branchId: uuidSchema.optional(),
  studentCode: z.string().max(20).optional(),
  fullName: nonEmptyString.max(50),
  nickname: z.string().max(20).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  dateOfBirth: dateStringSchema.optional(),
  schoolName: z.string().max(50).optional(),
  gradeLevel: z.string().max(10).optional(),
  phone: phoneSchema,
  email: emailSchema,
  address: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
})

export const updateStudentSchema = createStudentSchema.partial().extend({
  status: studentStatusSchema.optional(),
})

// ===== Teacher Schemas =====

export const teacherStatusSchema = z.enum(['active', 'inactive', 'resigned'])

export const createTeacherSchema = z.object({
  userId: uuidSchema.optional().nullable(),
  tenantId: uuidSchema,
  branchId: uuidSchema,
  name: nonEmptyString.max(50),
  title: z.string().max(20).default('教師'),
  phone: phoneSchema,
  ratePerClass: z.coerce.number().positive('Rate must be positive'),
})

export const updateTeacherSchema = z.object({
  name: z.string().max(50).optional(),
  title: z.string().max(20).optional(),
  phone: phoneSchema,
  ratePerClass: z.coerce.number().positive().optional(),
  status: teacherStatusSchema.optional(),
})

// ===== Course Schemas =====

export const createCourseSchema = z.object({
  tenantId: uuidSchema,
  branchId: uuidSchema,
  name: nonEmptyString.max(100),
  subject: z.string().max(30).optional(),
  durationMinutes: z.coerce.number().int().min(15).max(480).default(60),
  maxStudents: z.coerce.number().int().min(1).max(100).default(10),
})

// ===== Schedule Schemas =====

export const createScheduleSchema = z.object({
  courseId: uuidSchema,
  teacherId: uuidSchema.optional().nullable(),
  scheduledDate: dateStringSchema,
  startTime: timeStringSchema,
  endTime: timeStringSchema,
  notes: z.string().max(500).optional(),
}).refine(
  (data) => data.startTime < data.endTime,
  { message: 'Start time must be before end time' }
)

export const updateScheduleSchema = z.object({
  teacherId: uuidSchema.optional().nullable(),
  scheduledDate: dateStringSchema.optional(),
  startTime: timeStringSchema.optional(),
  endTime: timeStringSchema.optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']).optional(),
  notes: z.string().max(500).optional(),
})

export const scheduleChangeSchema = z.object({
  changeType: z.enum(['cancel', 'reschedule']),
  newDate: dateStringSchema.optional(),
  newTime: z.string().optional(),
  reason: z.string().max(200).optional(),
  changedBy: uuidSchema.optional(),
}).refine(
  (data) => {
    if (data.changeType === 'reschedule') {
      return data.newDate && data.newTime
    }
    return true
  },
  { message: 'newDate and newTime are required for reschedule' }
)

// ===== Salary Schemas =====

export const salaryCalculateSchema = z.object({
  teacherId: uuidSchema.optional(),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  { message: 'Start date must be before or equal to end date' }
)

export const createSalaryRecordSchema = z.object({
  teacherId: uuidSchema,
  periodStart: dateStringSchema,
  periodEnd: dateStringSchema,
}).refine(
  (data) => new Date(data.periodStart) <= new Date(data.periodEnd),
  { message: 'Period start must be before or equal to period end' }
)

// ===== Attendance Schemas =====

export const createAttendanceSchema = z.object({
  studentId: uuidSchema,
  lessonId: uuidSchema.optional().nullable(),
  date: dateStringSchema.optional(),
  present: z.boolean().default(true),
  notes: z.string().max(200).optional(),
})

export const bulkAttendanceSchema = z.object({
  records: z.array(createAttendanceSchema).min(1).max(100),
})

// ===== Grade Schemas =====

export const examTypeSchema = z.enum(['quiz', 'midterm', 'final', 'homework', 'test', 'other'])

export const createGradeSchema = z.object({
  studentId: uuidSchema,
  examType: examTypeSchema.default('quiz'),
  examName: z.string().max(50).default('考試'),
  subject: z.string().max(30).optional(),
  score: z.coerce.number().min(0).max(1000),
  maxScore: z.coerce.number().min(1).max(1000).default(100),
  date: dateStringSchema.optional(),
  notes: z.string().max(200).optional(),
})

export const bulkGradeSchema = z.object({
  records: z.array(createGradeSchema).min(1).max(100),
})

// ===== Auth Schemas =====

export const loginSchema = z.object({
  username: z.string().min(1).max(50).optional(),
  password: z.string().min(1).max(100).optional(),
  firebaseToken: z.string().optional(),
}).refine(
  (data) => {
    // 必須提供 username+password 或 firebaseToken
    return (data.username && data.password) || data.firebaseToken
  },
  { message: 'Provide username/password or firebaseToken' }
)

export const telegramLoginSchema = z.object({
  telegram_id: z.union([z.string(), z.number()]).transform(String),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  auth_date: z.number().int().optional(),
  hash: z.string().optional(),
})

// Trial signup schema - for new users applying for 30-day trial
export const trialSignupSchema = z.object({
  // Tenant info
  tenantName: z.string().min(2).max(100),
  tenantSlug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  // Admin user info
  adminName: z.string().min(2).max(50),
  adminEmail: z.string().email(),
  adminPhone: z.string().max(20).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  // Optional: how did they hear about us
  source: z.string().max(100).optional(),
})

// ===== User Schemas =====

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: nonEmptyString.max(50),
  role: z.enum(['admin', 'manager', 'staff', 'teacher', 'parent', 'student']),
})

export const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'manager', 'staff', 'teacher', 'parent', 'student']),
})

// ===== Notification Schemas =====

export const notificationTypeSchema = z.enum([
  'schedule_change', 
  'billing_reminder', 
  'attendance_alert', 
  'grade_notification'
])

export const notificationChannelSchema = z.enum(['telegram', 'line', 'email'])

export const sendNotificationSchema = z.object({
  type: notificationTypeSchema,
  recipientIds: z.array(uuidSchema).min(1).max(100),
  studentId: uuidSchema.optional(),
  title: nonEmptyString.max(255),
  body: nonEmptyString.max(2000),
  channel: notificationChannelSchema.default('telegram'),
  metadata: z.record(z.string(), z.any()).optional(),
})
