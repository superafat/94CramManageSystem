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

// 師資身分與薪資類型
export const TEACHER_ROLE_OPTIONS = ['主任', '行政', '助教', '跑課老師'] as const
export const SALARY_TYPE_OPTIONS = ['monthly', 'hourly', 'per_class'] as const

export const teacherRoleSchema = z.enum(TEACHER_ROLE_OPTIONS)
export const salaryTypeSchema = z.enum(SALARY_TYPE_OPTIONS)

// 科目與年級固定選項
export const SUBJECT_OPTIONS = [
  '國文', '英文', '數學', '理化', '物理', '化學',
  '生物', '地科', '歷史', '地理', '公民', '自然',
  '社會', '作文', '閱讀', '程式設計',
] as const

export const GRADE_LEVEL_OPTIONS = ['國小', '國中', '高中'] as const

export const subjectSchema = z.enum(SUBJECT_OPTIONS)
export const gradeLevelSchema = z.enum(GRADE_LEVEL_OPTIONS)

export const createTeacherSchema = z.object({
  userId: uuidSchema.optional().nullable(),
  tenantId: uuidSchema,
  branchId: uuidSchema,
  name: nonEmptyString.max(50),
  title: z.string().max(20).default('教師'),
  phone: phoneSchema,
  email: emailSchema,
  ratePerClass: z.coerce.number().nonnegative('Rate must be non-negative').optional(),
  // 身分與薪資
  teacherRole: teacherRoleSchema.optional(),
  salaryType: salaryTypeSchema.default('per_class'),
  baseSalary: z.coerce.number().nonnegative().optional(),
  // 個人資料
  idNumber: z.string().max(10).optional(),
  birthday: dateStringSchema.optional(),
  address: z.string().max(200).optional(),
  emergencyContact: z.string().max(50).optional(),
  emergencyPhone: phoneSchema,
  // 匯款資訊
  bankName: z.string().max(50).optional(),
  bankBranch: z.string().max(50).optional(),
  bankAccount: z.string().max(20).optional(),
  bankAccountName: z.string().max(50).optional(),
  // 教授能力
  subjects: z.array(subjectSchema).optional(),
  gradeLevels: z.array(gradeLevelSchema).optional(),
})

export const updateTeacherSchema = z.object({
  name: z.string().max(50).optional(),
  title: z.string().max(20).optional(),
  phone: phoneSchema,
  email: emailSchema,
  ratePerClass: z.coerce.number().nonnegative().optional(),
  status: teacherStatusSchema.optional(),
  // 身分與薪資
  teacherRole: teacherRoleSchema.optional().nullable(),
  salaryType: salaryTypeSchema.optional(),
  baseSalary: z.coerce.number().nonnegative().optional().nullable(),
  // 個人資料
  idNumber: z.string().max(10).optional().nullable(),
  birthday: dateStringSchema.optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  emergencyContact: z.string().max(50).optional().nullable(),
  emergencyPhone: phoneSchema.nullable(),
  // 匯款資訊
  bankName: z.string().max(50).optional().nullable(),
  bankBranch: z.string().max(50).optional().nullable(),
  bankAccount: z.string().max(20).optional().nullable(),
  bankAccountName: z.string().max(50).optional().nullable(),
  // 教授能力
  subjects: z.array(subjectSchema).optional().nullable(),
  gradeLevels: z.array(gradeLevelSchema).optional().nullable(),
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

// ===== Salary Adjustment Schemas =====

export const salaryAdjustmentTypeSchema = z.enum(['bonus', 'deduction'])

export const createSalaryAdjustmentSchema = z.object({
  teacherId: uuidSchema,
  periodStart: dateStringSchema,
  periodEnd: dateStringSchema,
  type: salaryAdjustmentTypeSchema,
  name: nonEmptyString.max(100),
  amount: z.coerce.number().positive(),
  notes: z.string().max(500).optional(),
})

// ===== Expense Schemas =====

export const createExpenseSchema = z.object({
  branchId: uuidSchema.optional(),
  name: nonEmptyString.max(100),
  amount: z.coerce.number().positive(),
  category: nonEmptyString.max(50),
  expenseDate: dateStringSchema,
  notes: z.string().max(500).optional(),
})

export const updateExpenseSchema = z.object({
  name: z.string().max(100).optional(),
  amount: z.coerce.number().positive().optional(),
  category: z.string().max(50).optional(),
  expenseDate: dateStringSchema.optional(),
  notes: z.string().max(500).optional().nullable(),
})

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
