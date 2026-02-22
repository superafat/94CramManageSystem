// ================================================================
// 補習班管理系統 v5 Drizzle Schema
// ================================================================
// Author: 妲己 (Backend Architect)
// Date: 2026-02-13
// ORM: Drizzle ORM + TypeScript
// Database: PostgreSQL 14+
// ================================================================

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  date,
  time,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// ================================================================
// ENUMS
// ================================================================

export const courseStatusEnum = pgEnum('course_status', [
  'active',
  'inactive',
  'archived',
]);

export const pricingTypeEnum = pgEnum('pricing_type', [
  'per_session',
  'monthly',
  'term',
  'hourly',
]);

export const enrollmentStatusEnum = pgEnum('enrollment_status', [
  'active',
  'paused',
  'completed',
  'withdrawn',
]);

export const attendanceStatusEnum = pgEnum('attendance_status', [
  'present',
  'absent',
  'late',
  'leave',
  'excused',
  'makeup',
]);

export const leaveTypeEnum = pgEnum('leave_type', ['sick', 'personal', 'family']);

export const approvalStatusEnum = pgEnum('approval_status', [
  'pending',
  'approved',
  'rejected',
]);

export const makeupStatusEnum = pgEnum('makeup_status', [
  'scheduled',
  'completed',
  'cancelled',
  'no_show',
]);

export const assessmentCategoryEnum = pgEnum('assessment_category', [
  'exam',
  'assignment',
  'participation',
]);

export const assessmentStatusEnum = pgEnum('assessment_status', [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
]);

export const lessonTypeEnum = pgEnum('lesson_type', [
  'regular',
  'makeup',
  'trial',
  'special',
]);

export const lessonStatusEnum = pgEnum('lesson_status', [
  'scheduled',
  'completed',
  'cancelled',
]);

// ================================================================
// EXISTING TABLES (假設已存在，這裡僅供 TypeScript 參考)
// ================================================================

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  // ... 其他欄位
});

export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  // ... 其他欄位
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  // ... 其他欄位
});

export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  // ... 其他欄位
});

export const teachers = pgTable('teachers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  // ... 其他欄位
});

export const classrooms = pgTable('classrooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  branchId: uuid('branch_id').references(() => branches.id, {
    onDelete: 'cascade',
  }),
  name: varchar('name', { length: 255 }).notNull(),
  // ... 其他欄位
});

// ================================================================
// 1. COURSE MANAGEMENT (課程管理體系)
// ================================================================

export const courses = pgTable(
  'courses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id').references(() => branches.id, {
      onDelete: 'set null',
    }),

    // 課程基本資訊
    code: varchar('code', { length: 50 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    subject: varchar('subject', { length: 100 }).notNull(),
    gradeLevel: varchar('grade_level', { length: 50 }),

    // 課程內容
    description: text('description'),
    syllabus: text('syllabus'),
    learningObjectives: text('learning_objectives').array(),

    // 課程設定
    durationMinutes: integer('duration_minutes').notNull().default(120),
    maxStudents: integer('max_students').default(24),
    minStudents: integer('min_students').default(1),

    // 學費設定
    feeMonthly: integer('fee_monthly'),
    feeQuarterly: integer('fee_quarterly'),
    feeSemester: integer('fee_semester'),
    feeYearly: integer('fee_yearly'),

    // 狀態管理
    status: varchar('status', { length: 20 }).notNull().default('active'),
    isActive: boolean('is_active').notNull().default(true),

    // 時間戳記
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantBranchIdx: index('idx_courses_tenant_branch').on(
      table.tenantId,
      table.branchId
    ),
    subjectIdx: index('idx_courses_subject').on(table.subject),
    gradeLevelIdx: index('idx_courses_grade_level').on(table.gradeLevel),
    statusIdx: index('idx_courses_status').on(table.status),
    uniqueTenantCode: uniqueIndex('courses_tenant_code_unique').on(
      table.tenantId,
      table.code
    ),
  })
);

export const coursePricing = pgTable(
  'course_pricing',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),

    // 定價策略
    pricingType: varchar('pricing_type', { length: 50 })
      .notNull()
      .default('per_session'),
    basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('TWD'),

    // 計費單位
    billingUnit: varchar('billing_unit', { length: 50 }),
    sessionsIncluded: integer('sessions_included'),

    // 價格範圍
    minSessions: integer('min_sessions'),
    maxSessions: integer('max_sessions'),

    // 折扣設定
    earlyBirdDiscount: decimal('early_bird_discount', { precision: 5, scale: 2 }),
    siblingDiscount: decimal('sibling_discount', { precision: 5, scale: 2 }),
    loyaltyDiscount: decimal('loyalty_discount', { precision: 5, scale: 2 }),

    // 生效期間
    effectiveFrom: date('effective_from').notNull(),
    effectiveTo: date('effective_to'),

    // 狀態
    isActive: boolean('is_active').notNull().default(true),

    // 時間戳記
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    courseIdx: index('idx_course_pricing_course').on(table.courseId),
    effectiveIdx: index('idx_course_pricing_effective').on(
      table.effectiveFrom,
      table.effectiveTo
    ),
  })
);

export const courseSchedules = pgTable(
  'course_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    teacherId: uuid('teacher_id').references(() => teachers.id, {
      onDelete: 'set null',
    }),
    classroomId: uuid('classroom_id').references(() => classrooms.id, {
      onDelete: 'set null',
    }),

    // 週期設定
    dayOfWeek: integer('day_of_week').notNull(), // 0=Sunday, 1=Monday, ..., 6=Saturday
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),

    // 生效期間
    effectiveFrom: date('effective_from').notNull(),
    effectiveTo: date('effective_to'),

    // 例外日期
    excludedDates: date('excluded_dates').array(),

    // 狀態
    isActive: boolean('is_active').notNull().default(true),

    // 備註
    notes: text('notes'),

    // 時間戳記
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    courseIdx: index('idx_course_schedules_course').on(table.courseId),
    teacherIdx: index('idx_course_schedules_teacher').on(table.teacherId),
    dayIdx: index('idx_course_schedules_day').on(table.dayOfWeek),
    effectiveIdx: index('idx_course_schedules_effective').on(
      table.effectiveFrom,
      table.effectiveTo
    ),
  })
);

// ================================================================
// 2. PARENT MANAGEMENT (家長管理)
// ================================================================

export const parents = pgTable(
  'parents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // 基本資料
    name: varchar('name', { length: 255 }).notNull(),
    relationship: varchar('relationship', { length: 50 }),

    // 聯絡資訊
    phone: varchar('phone', { length: 20 }),
    mobile: varchar('mobile', { length: 20 }),
    email: varchar('email', { length: 255 }),
    lineId: varchar('line_id', { length: 100 }),

    // 通訊地址
    address: text('address'),
    city: varchar('city', { length: 100 }),
    postalCode: varchar('postal_code', { length: 10 }),

    // 緊急聯絡人
    isEmergencyContact: boolean('is_emergency_contact').default(false),
    emergencyPriority: integer('emergency_priority'),

    // 溝通偏好
    preferredContactMethod: varchar('preferred_contact_method', { length: 50 }),
    preferredContactTime: varchar('preferred_contact_time', { length: 100 }),

    // 備註
    notes: text('notes'),

    // 時間戳記
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantIdx: index('idx_parents_tenant').on(table.tenantId),
    phoneIdx: index('idx_parents_phone').on(table.phone),
    emailIdx: index('idx_parents_email').on(table.email),
  })
);

export const studentParents = pgTable(
  'student_parents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id')
      .notNull()
      .references(() => parents.id, { onDelete: 'cascade' }),

    // 關係說明
    relationship: varchar('relationship', { length: 50 }).notNull(),
    isPrimary: boolean('is_primary').default(false),

    // 權限設定
    canPickup: boolean('can_pickup').default(true),
    canAuthorize: boolean('can_authorize').default(true),
    receiveReports: boolean('receive_reports').default(true),

    // 時間戳記
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    studentIdx: index('idx_student_parents_student').on(table.studentId),
    parentIdx: index('idx_student_parents_parent').on(table.parentId),
    uniqueStudentParent: uniqueIndex('student_parents_unique').on(
      table.studentId,
      table.parentId
    ),
  })
);

// ================================================================
// 3. ENROLLMENT ENHANCEMENT (報名強化)
// ================================================================

export const enrollments = pgTable(
  'enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id').references(() => courses.id, {
      onDelete: 'set null',
    }),
    courseScheduleId: uuid('course_schedule_id').references(
      () => courseSchedules.id,
      { onDelete: 'set null' }
    ),

    // 學費資訊
    tuitionAmount: decimal('tuition_amount', { precision: 10, scale: 2 }),
    discountRate: decimal('discount_rate', { precision: 5, scale: 2 }).default(
      '0'
    ),
    customPrice: decimal('custom_price', { precision: 10, scale: 2 }),
    billingCycle: varchar('billing_cycle', { length: 50 }).default('monthly'),

    // 報名資訊
    enrolledAt: timestamp('enrolled_at', { withTimezone: true }).defaultNow(),
    enrollmentStatus: varchar('enrollment_status', { length: 50 }).default(
      'active'
    ),

    // 備註
    enrollmentNotes: text('enrollment_notes'),

    // 時間戳記
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    courseIdx: index('idx_enrollments_course').on(table.courseId),
    scheduleIdx: index('idx_enrollments_schedule').on(table.courseScheduleId),
    statusIdx: index('idx_enrollments_status').on(table.enrollmentStatus),
    studentIdx: index('idx_enrollments_student').on(table.studentId),
  })
);

// ================================================================
// 4. ATTENDANCE ENHANCEMENT (出席追蹤強化)
// ================================================================

export const leaveRequests = pgTable(
  'leave_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id').references(() => lessons.id, {
      onDelete: 'cascade',
    }),

    // 請假資訊
    leaveDate: date('leave_date').notNull(),
    leaveType: varchar('leave_type', { length: 50 }).notNull(),
    reason: text('reason'),

    // 申請與審核
    requestedBy: uuid('requested_by').references(() => parents.id, {
      onDelete: 'set null',
    }),
    requestedAt: timestamp('requested_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    approvedBy: uuid('approved_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    approvalStatus: varchar('approval_status', { length: 50 })
      .notNull()
      .default('pending'),

    // 補課需求
    requiresMakeup: boolean('requires_makeup').default(true),
    makeupArranged: boolean('makeup_arranged').default(false),

    // 備註
    notes: text('notes'),

    // 時間戳記
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    studentIdx: index('idx_leave_requests_student').on(table.studentId),
    lessonIdx: index('idx_leave_requests_lesson').on(table.lessonId),
    statusIdx: index('idx_leave_requests_status').on(table.approvalStatus),
    dateIdx: index('idx_leave_requests_date').on(table.leaveDate),
  })
);

export const makeupSessions = pgTable(
  'makeup_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    originalLessonId: uuid('original_lesson_id').references(() => lessons.id, {
      onDelete: 'set null',
    }),
    makeupLessonId: uuid('makeup_lesson_id').references(() => lessons.id, {
      onDelete: 'set null',
    }),
    leaveRequestId: uuid('leave_request_id').references(() => leaveRequests.id, {
      onDelete: 'set null',
    }),

    // 補課資訊
    scheduledDate: date('scheduled_date'),
    scheduledTime: time('scheduled_time'),
    teacherId: uuid('teacher_id').references(() => teachers.id, {
      onDelete: 'set null',
    }),
    classroomId: uuid('classroom_id').references(() => classrooms.id, {
      onDelete: 'set null',
    }),

    // 狀態追蹤
    status: varchar('status', { length: 50 }).notNull().default('scheduled'),
    attended: boolean('attended'),

    // 備註
    notes: text('notes'),

    // 時間戳記
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    studentIdx: index('idx_makeup_sessions_student').on(table.studentId),
    originalIdx: index('idx_makeup_sessions_original').on(
      table.originalLessonId
    ),
    statusIdx: index('idx_makeup_sessions_status').on(table.status),
  })
);

export const attendance = pgTable(
  'attendance',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),

    // 出席狀態
    status: varchar('status', { length: 50 }).notNull().default('present'),

    checkInTime: timestamp('check_in_time', { withTimezone: true }),
    checkOutTime: timestamp('check_out_time', { withTimezone: true }),
    minutesLate: integer('minutes_late').default(0),

    // 請假/補課關聯
    leaveRequestId: uuid('leave_request_id').references(() => leaveRequests.id, {
      onDelete: 'set null',
    }),
    makeupSessionId: uuid('makeup_session_id').references(
      () => makeupSessions.id,
      { onDelete: 'set null' }
    ),

    // 備註
    attendanceNotes: text('attendance_notes'),

    // 時間戳記
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    statusIdx: index('idx_attendance_status').on(table.status),
    leaveRequestIdx: index('idx_attendance_leave_request').on(
      table.leaveRequestId
    ),
    studentLessonIdx: index('idx_attendance_student_lesson').on(
      table.studentId,
      table.lessonId
    ),
  })
);

// ================================================================
// 5. GRADING ENHANCEMENT (成績追蹤強化)
// ================================================================

export const assessmentTypes = pgTable(
  'assessment_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // 評量類型
    code: varchar('code', { length: 50 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    category: varchar('category', { length: 50 }).notNull(),

    // 計分設定
    weight: decimal('weight', { precision: 5, scale: 2 }),
    maxScore: decimal('max_score', { precision: 10, scale: 2 }),
    passingScore: decimal('passing_score', { precision: 10, scale: 2 }),

    // 說明
    description: text('description'),

    // 狀態
    isActive: boolean('is_active').notNull().default(true),

    // 時間戳記
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantIdx: index('idx_assessment_types_tenant').on(table.tenantId),
    categoryIdx: index('idx_assessment_types_category').on(table.category),
    uniqueTenantCode: uniqueIndex('assessment_types_tenant_code_unique').on(
      table.tenantId,
      table.code
    ),
  })
);

export const assessments = pgTable(
  'assessments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    assessmentTypeId: uuid('assessment_type_id')
      .notNull()
      .references(() => assessmentTypes.id, { onDelete: 'cascade' }),

    // 評量資訊
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),

    // 時間資訊
    assessmentDate: date('assessment_date'),
    dueDate: date('due_date'),

    // 計分設定
    maxScore: decimal('max_score', { precision: 10, scale: 2 }),
    passingScore: decimal('passing_score', { precision: 10, scale: 2 }),
    weight: decimal('weight', { precision: 5, scale: 2 }),

    // 範圍與內容
    chapters: text('chapters').array(),
    topics: text('topics').array(),

    // 狀態
    status: varchar('status', { length: 50 }).notNull().default('scheduled'),
    isPublished: boolean('is_published').default(false),

    // 備註
    notes: text('notes'),

    // 時間戳記
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    courseIdx: index('idx_assessments_course').on(table.courseId),
    typeIdx: index('idx_assessments_type').on(table.assessmentTypeId),
    dateIdx: index('idx_assessments_date').on(table.assessmentDate),
    statusIdx: index('idx_assessments_status').on(table.status),
  })
);

export const grades = pgTable(
  'grades',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    assessmentId: uuid('assessment_id').references(() => assessments.id, {
      onDelete: 'cascade',
    }),

    // 成績資訊
    score: decimal('score', { precision: 10, scale: 2 }),
    maxScore: decimal('max_score', { precision: 10, scale: 2 }),
    percentage: decimal('percentage', { precision: 5, scale: 2 }),
    letterGrade: varchar('letter_grade', { length: 5 }),
    passed: boolean('passed'),
    rank: integer('rank'),

    // 評語
    feedback: text('feedback'),

    // 評分資訊
    gradedBy: uuid('graded_by').references(() => teachers.id, {
      onDelete: 'set null',
    }),
    gradedAt: timestamp('graded_at', { withTimezone: true }),

    // 時間戳記
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    assessmentIdx: index('idx_grades_assessment').on(table.assessmentId),
    studentAssessmentIdx: index('idx_grades_student_assessment').on(
      table.studentId,
      table.assessmentId
    ),
  })
);

// ================================================================
// 6. LESSON ENHANCEMENT (課程記錄強化)
// ================================================================

export const lessons = pgTable(
  'lessons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id').references(() => courses.id, {
      onDelete: 'set null',
    }),
    courseScheduleId: uuid('course_schedule_id').references(
      () => courseSchedules.id,
      { onDelete: 'set null' }
    ),
    teacherId: uuid('teacher_id').references(() => teachers.id, {
      onDelete: 'set null',
    }),
    classroomId: uuid('classroom_id').references(() => classrooms.id, {
      onDelete: 'set null',
    }),

    // 課程類型
    lessonType: varchar('lesson_type', { length: 50 }).default('regular'),

    // 時間
    lessonDate: date('lesson_date').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),

    // 課程內容
    topic: varchar('topic', { length: 255 }),
    content: text('content'),
    homework: text('homework'),
    materials: text('materials').array(),

    // 教學紀錄
    teachingNotes: text('teaching_notes'),
    studentPerformance: text('student_performance'),

    // 狀態
    lessonStatus: varchar('lesson_status', { length: 50 }).default('scheduled'),

    // 時間戳記
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    courseIdx: index('idx_lessons_course').on(table.courseId),
    scheduleIdx: index('idx_lessons_schedule').on(table.courseScheduleId),
    typeIdx: index('idx_lessons_type').on(table.lessonType),
    dateIdx: index('idx_lessons_date').on(table.lessonDate),
    teacherIdx: index('idx_lessons_teacher').on(table.teacherId),
  })
);

// ================================================================
// 7. INVOICE ENHANCEMENT (帳單強化)
// ================================================================

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id').references(() => students.id, {
      onDelete: 'cascade',
    }),
    enrollmentId: uuid('enrollment_id').references(() => enrollments.id, {
      onDelete: 'set null',
    }),

    // 帳單資訊
    invoiceNumber: varchar('invoice_number', { length: 100 }),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('TWD'),

    // 計費期間
    billingPeriodStart: date('billing_period_start'),
    billingPeriodEnd: date('billing_period_end'),
    sessionsBilled: integer('sessions_billed'),

    // 折扣
    discountApplied: decimal('discount_applied', { precision: 10, scale: 2 }),
    discountReason: text('discount_reason'),

    // 付款
    paymentMethod: varchar('payment_method', { length: 50 }),
    paymentReference: varchar('payment_reference', { length: 255 }),
    paidAt: timestamp('paid_at', { withTimezone: true }),

    // 狀態
    status: varchar('status', { length: 50 }).default('pending'),

    // 時間戳記
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    enrollmentIdx: index('idx_invoices_enrollment').on(table.enrollmentId),
    studentIdx: index('idx_invoices_student').on(table.studentId),
    statusIdx: index('idx_invoices_status').on(table.status),
  })
);

// ================================================================
// RELATIONS (Drizzle ORM 關聯定義)
// ================================================================

export const coursesRelations = relations(courses, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [courses.tenantId],
    references: [tenants.id],
  }),
  branch: one(branches, {
    fields: [courses.branchId],
    references: [branches.id],
  }),
  pricing: many(coursePricing),
  schedules: many(courseSchedules),
  enrollments: many(enrollments),
  assessments: many(assessments),
  lessons: many(lessons),
}));

export const coursePricingRelations = relations(coursePricing, ({ one }) => ({
  course: one(courses, {
    fields: [coursePricing.courseId],
    references: [courses.id],
  }),
}));

export const courseSchedulesRelations = relations(
  courseSchedules,
  ({ one, many }) => ({
    course: one(courses, {
      fields: [courseSchedules.courseId],
      references: [courses.id],
    }),
    teacher: one(teachers, {
      fields: [courseSchedules.teacherId],
      references: [teachers.id],
    }),
    classroom: one(classrooms, {
      fields: [courseSchedules.classroomId],
      references: [classrooms.id],
    }),
    lessons: many(lessons),
  })
);

export const parentsRelations = relations(parents, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [parents.tenantId],
    references: [tenants.id],
  }),
  studentParents: many(studentParents),
  leaveRequests: many(leaveRequests),
}));

export const studentParentsRelations = relations(studentParents, ({ one }) => ({
  student: one(students, {
    fields: [studentParents.studentId],
    references: [students.id],
  }),
  parent: one(parents, {
    fields: [studentParents.parentId],
    references: [parents.id],
  }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [enrollments.tenantId],
    references: [tenants.id],
  }),
  student: one(students, {
    fields: [enrollments.studentId],
    references: [students.id],
  }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
  schedule: one(courseSchedules, {
    fields: [enrollments.courseScheduleId],
    references: [courseSchedules.id],
  }),
  invoices: many(invoices),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one, many }) => ({
  student: one(students, {
    fields: [leaveRequests.studentId],
    references: [students.id],
  }),
  lesson: one(lessons, {
    fields: [leaveRequests.lessonId],
    references: [lessons.id],
  }),
  requestedByParent: one(parents, {
    fields: [leaveRequests.requestedBy],
    references: [parents.id],
  }),
  approvedByUser: one(users, {
    fields: [leaveRequests.approvedBy],
    references: [users.id],
  }),
  makeupSessions: many(makeupSessions),
}));

export const makeupSessionsRelations = relations(makeupSessions, ({ one }) => ({
  student: one(students, {
    fields: [makeupSessions.studentId],
    references: [students.id],
  }),
  originalLesson: one(lessons, {
    fields: [makeupSessions.originalLessonId],
    references: [lessons.id],
  }),
  makeupLesson: one(lessons, {
    fields: [makeupSessions.makeupLessonId],
    references: [lessons.id],
  }),
  leaveRequest: one(leaveRequests, {
    fields: [makeupSessions.leaveRequestId],
    references: [leaveRequests.id],
  }),
  teacher: one(teachers, {
    fields: [makeupSessions.teacherId],
    references: [teachers.id],
  }),
  classroom: one(classrooms, {
    fields: [makeupSessions.classroomId],
    references: [classrooms.id],
  }),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  student: one(students, {
    fields: [attendance.studentId],
    references: [students.id],
  }),
  lesson: one(lessons, {
    fields: [attendance.lessonId],
    references: [lessons.id],
  }),
  leaveRequest: one(leaveRequests, {
    fields: [attendance.leaveRequestId],
    references: [leaveRequests.id],
  }),
  makeupSession: one(makeupSessions, {
    fields: [attendance.makeupSessionId],
    references: [makeupSessions.id],
  }),
}));

export const assessmentTypesRelations = relations(
  assessmentTypes,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [assessmentTypes.tenantId],
      references: [tenants.id],
    }),
    assessments: many(assessments),
  })
);

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  course: one(courses, {
    fields: [assessments.courseId],
    references: [courses.id],
  }),
  assessmentType: one(assessmentTypes, {
    fields: [assessments.assessmentTypeId],
    references: [assessmentTypes.id],
  }),
  grades: many(grades),
}));

export const gradesRelations = relations(grades, ({ one }) => ({
  student: one(students, {
    fields: [grades.studentId],
    references: [students.id],
  }),
  assessment: one(assessments, {
    fields: [grades.assessmentId],
    references: [assessments.id],
  }),
  gradedByTeacher: one(teachers, {
    fields: [grades.gradedBy],
    references: [teachers.id],
  }),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [lessons.tenantId],
    references: [tenants.id],
  }),
  course: one(courses, {
    fields: [lessons.courseId],
    references: [courses.id],
  }),
  schedule: one(courseSchedules, {
    fields: [lessons.courseScheduleId],
    references: [courseSchedules.id],
  }),
  teacher: one(teachers, {
    fields: [lessons.teacherId],
    references: [teachers.id],
  }),
  classroom: one(classrooms, {
    fields: [lessons.classroomId],
    references: [classrooms.id],
  }),
  attendance: many(attendance),
  leaveRequests: many(leaveRequests),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  tenant: one(tenants, {
    fields: [invoices.tenantId],
    references: [tenants.id],
  }),
  student: one(students, {
    fields: [invoices.studentId],
    references: [students.id],
  }),
  enrollment: one(enrollments, {
    fields: [invoices.enrollmentId],
    references: [enrollments.id],
  }),
}));

// ================================================================
// PAYMENT RECORDS (繳費記錄)
// ================================================================

export const paymentRecords = pgTable('payment_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  studentId: uuid('student_id').notNull().references(() => students.id),
  courseId: uuid('course_id').references(() => courses.id),
  paymentType: varchar('payment_type', { length: 20 }).notNull(),
  amount: integer('amount').notNull(),
  paymentDate: varchar('payment_date', { length: 10 }),
  periodMonth: varchar('period_month', { length: 7 }),
  status: varchar('status', { length: 20 }).default('paid'),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('idx_payment_records_tenant').on(table.tenantId),
  studentIdx: index('idx_payment_records_student').on(table.studentId),
  courseIdx: index('idx_payment_records_course').on(table.courseId),
  periodIdx: index('idx_payment_records_period').on(table.periodMonth),
}));

// ================================================================
// TYPE EXPORTS (TypeScript 型別匯出)
// ================================================================

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;

export type CoursePricing = typeof coursePricing.$inferSelect;
export type NewCoursePricing = typeof coursePricing.$inferInsert;

export type CourseSchedule = typeof courseSchedules.$inferSelect;
export type NewCourseSchedule = typeof courseSchedules.$inferInsert;

export type Parent = typeof parents.$inferSelect;
export type NewParent = typeof parents.$inferInsert;

export type StudentParent = typeof studentParents.$inferSelect;
export type NewStudentParent = typeof studentParents.$inferInsert;

export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;

export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type NewLeaveRequest = typeof leaveRequests.$inferInsert;

export type MakeupSession = typeof makeupSessions.$inferSelect;
export type NewMakeupSession = typeof makeupSessions.$inferInsert;

export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;

export type AssessmentType = typeof assessmentTypes.$inferSelect;
export type NewAssessmentType = typeof assessmentTypes.$inferInsert;

export type Assessment = typeof assessments.$inferSelect;
export type NewAssessment = typeof assessments.$inferInsert;

export type Grade = typeof grades.$inferSelect;
export type NewGrade = typeof grades.$inferInsert;

export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

// ================================================================
// AUDIT LOGS (異動日誌)
// ================================================================

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  userId: uuid('user_id').references(() => users.id),
  userName: varchar('user_name', { length: 100 }),
  userRole: varchar('user_role', { length: 20 }),
  
  action: varchar('action', { length: 20 }).notNull(), // create/update/delete
  tableName: varchar('table_name', { length: 50 }).notNull(), // students/payments/courses
  recordId: uuid('record_id'),
  
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  changeSummary: varchar('change_summary', { length: 500 }),
  
  needsAlert: boolean('needs_alert').default(false),
  alertSent: boolean('alert_sent').default(false),
  parentNotified: boolean('parent_notified').default(false),
  alertConfirmedAt: timestamp('alert_confirmed_at'),
  
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('idx_audit_logs_tenant').on(table.tenantId),
  userIdx: index('idx_audit_logs_user').on(table.userId),
  tableIdx: index('idx_audit_logs_table').on(table.tableName),
  recordIdx: index('idx_audit_logs_record').on(table.recordId),
  alertIdx: index('idx_audit_logs_alert').on(table.needsAlert),
  createdIdx: index('idx_audit_logs_created').on(table.createdAt),
}));
