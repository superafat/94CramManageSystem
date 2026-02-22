// BeeClass Database Schema - Drizzle ORM
import { pgTable, serial, varchar, timestamp, boolean, integer, text, uuid, primaryKey, index, jsonb } from 'drizzle-orm/pg-core';

// 補習班
export const schools = pgTable('schools', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  lineBotToken: varchar('line_bot_token', { length: 255 }),
  lineChannelSecret: varchar('line_channel_secret', { length: 255 }),
  lineChannelAccessToken: varchar('line_channel_access_token', { length: 255 }),
  lateThresholdMinutes: integer('late_threshold_minutes').default(30),
  absentThresholdMinutes: integer('absent_threshold_minutes').default(60),
  createdAt: timestamp('created_at').defaultNow(),
});

// 班級
export const classes = pgTable('classes', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  grade: varchar('grade', { length: 20 }),
  room: varchar('room', { length: 50 }),
  capacity: integer('capacity').default(30),
  feeMonthly: integer('fee_monthly'),      // 月費
  feeQuarterly: integer('fee_quarterly'),  // 季費
  feeSemester: integer('fee_semester'),    // 學期費
  feeYearly: integer('fee_yearly'),        // 學年費
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_classes_school_id').on(table.schoolId),
]);

// 學生
export const students = pgTable('students', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id).notNull(),
  classId: uuid('class_id').references(() => classes.id),
  name: varchar('name', { length: 100 }).notNull(),
  nfcId: varchar('nfc_id', { length: 100 }).unique(),
  faceData: text('face_data'), // 臉部特徵向量（JSON）
  birthDate: varchar('birth_date', { length: 10 }),
  schoolName: varchar('school_name', { length: 100 }),
  grade: varchar('grade', { length: 20 }),
  notes: text('notes'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_students_school_id').on(table.schoolId),
  index('idx_students_class_id').on(table.classId),
  index('idx_students_grade').on(table.grade),
  index('idx_students_active').on(table.active),
]);

// 家長
export const parents = pgTable('parents', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => students.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  lineUserId: varchar('line_user_id', { length: 255 }),
  relation: varchar('relation', { length: 50 }), // 父親/母親/爺爺/奶奶
  notifyEnabled: boolean('notify_enabled').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 點名紀錄
export const attendances = pgTable('attendances', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => students.id).notNull(),
  classId: uuid('class_id').references(() => classes.id),
  checkInTime: timestamp('check_in_time').notNull(),
  status: varchar('status', { length: 20 }).notNull(), // arrived/late/absent
  date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD
  notifiedToParent: boolean('notified_to_parent').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_attendances_student_id').on(table.studentId),
  index('idx_attendances_class_id').on(table.classId),
  index('idx_attendances_status').on(table.status),
  index('idx_attendances_date').on(table.date),
]);

// 考試
export const exams = pgTable('exams', {
  id: uuid('id').defaultRandom().primaryKey(),
  classId: uuid('class_id').references(() => classes.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  subject: varchar('subject', { length: 50 }).notNull(),
  maxScore: integer('max_score').notNull(),
  examDate: varchar('exam_date', { length: 10 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 成績
export const examScores = pgTable('exam_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  examId: uuid('exam_id').references(() => exams.id).notNull(),
  studentId: uuid('student_id').references(() => students.id).notNull(),
  score: integer('score').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 老師
export const teachers = pgTable('teachers', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  specialties: varchar('specialties', { length: 255 }), // 專長科目
  hourlyRate: integer('hourly_rate'), // 時薪
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 課程表
export const schedules = pgTable('schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  classId: uuid('class_id').references(() => classes.id).notNull(),
  teacherId: uuid('teacher_id').references(() => teachers.id),
  dayOfWeek: integer('day_of_week').notNull(), // 0=週日, 1=週一...
  startTime: varchar('start_time', { length: 5 }).notNull(), // HH:MM
  endTime: varchar('end_time', { length: 5 }).notNull(),
  subject: varchar('subject', { length: 100 }),
  room: varchar('room', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// 繳費記錄
export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => students.id).notNull(),
  amount: integer('amount').notNull(),
  method: varchar('method', { length: 20 }), // cash/transfer/credit
  status: varchar('status', { length: 20 }).default('pending'), // pending/paid/failed
  paidAt: timestamp('paid_at'),
  invoiceNo: varchar('invoice_no', { length: 50 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 通知日誌
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => students.id).notNull(),
  parentId: uuid('parent_id').references(() => parents.id).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // arrival/late/absent/dismiss/score
  message: text('message').notNull(),
  status: varchar('status', { length: 20 }).default('pending'), // pending/sent/failed
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 繳費記錄（學費管理）
export const paymentRecords = pgTable('payment_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => students.id).notNull(),
  classId: uuid('class_id').references(() => classes.id).notNull(),
  paymentType: varchar('payment_type', { length: 20 }).notNull(), // monthly/quarterly/semester/yearly
  amount: integer('amount').notNull(),
  paymentDate: varchar('payment_date', { length: 10 }),  // YYYY-MM-DD
  periodMonth: varchar('period_month', { length: 7 }),    // 2026-03
  status: varchar('status', { length: 20 }).default('paid'),
  notes: text('notes'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_payment_records_student').on(table.studentId),
  index('idx_payment_records_class').on(table.classId),
  index('idx_payment_records_period').on(table.periodMonth),
]);

// 使用者（管理員）
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id).notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  role: varchar('role', { length: 20 }).default('teacher'), // admin/teacher/demo
  status: varchar('status', { length: 20 }).default('pending'), // pending/active/suspended
  approvedBy: uuid('approved_by'), // Self-reference, FK enforced at DB level
  approvedAt: timestamp('approved_at'),
  trialStartDate: timestamp('trial_start_date'),
  trialEndDate: timestamp('trial_end_date'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ================================================================
// AUDIT LOGS (異動日誌)
// ================================================================

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id).notNull(),
  userId: uuid('user_id').references(() => users.id),
  userName: varchar('user_name', { length: 100 }),
  userRole: varchar('user_role', { length: 20 }),
  
  action: varchar('action', { length: 20 }).notNull(), // create/update/delete
  tableName: varchar('table_name', { length: 50 }).notNull(), // students/payments/classes
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
  schoolIdx: index('idx_audit_logs_school').on(table.schoolId),
  userIdx: index('idx_audit_logs_user').on(table.userId),
  tableIdx: index('idx_audit_logs_table').on(table.tableName),
  alertIdx: index('idx_audit_logs_alert').on(table.needsAlert),
  createdIdx: index('idx_audit_logs_created').on(table.createdAt),
}))
