// 94Manage Schema - 學員管理專屬表
import { pgTable, uuid, varchar, text, timestamp, boolean, integer, decimal, jsonb, uniqueIndex, index } from '../connection';
import { tenants, users, branches } from './common';

// 課程
export const manageCourses = pgTable('manage_courses', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 100 }),
  grade: varchar('grade', { length: 20 }), // 國一, 高一...
  price: decimal('price', { precision: 10, scale: 2 }),
  feeMonthly: decimal('fee_monthly', { precision: 10, scale: 2 }),
  feeQuarterly: decimal('fee_quarterly', { precision: 10, scale: 2 }),
  feeSemester: decimal('fee_semester', { precision: 10, scale: 2 }),
  feeYearly: decimal('fee_yearly', { precision: 10, scale: 2 }),
  hours: integer('hours'), // 總時數
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('manage_courses_tenant_id_idx').on(table.tenantId),
}));

// 學生
export const manageStudents = pgTable('manage_students', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  grade: varchar('grade', { length: 20 }),
  school: varchar('school', { length: 255 }),
  guardianName: varchar('guardian_name', { length: 100 }),
  guardianPhone: varchar('guardian_phone', { length: 20 }),
  status: varchar('status', { length: 20 }).default('active'), // active, inactive, graduated
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('manage_students_tenant_id_idx').on(table.tenantId),
}));

// 報名/選課
export const manageEnrollments = pgTable('manage_enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  studentId: uuid('student_id').references(() => manageStudents.id).notNull(),
  courseId: uuid('course_id').references(() => manageCourses.id).notNull(),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  status: varchar('status', { length: 20 }).default('active'), // active, completed, cancelled
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('manage_enrollments_tenant_id_idx').on(table.tenantId),
  studentIdx: index('manage_enrollments_student_id_idx').on(table.studentId),
  courseIdx: index('manage_enrollments_course_id_idx').on(table.courseId),
  tenantStatusIdx: index('manage_enrollments_tenant_status_idx').on(table.tenantId, table.status),
}));

// 老師
export const manageTeachers = pgTable('manage_teachers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  userId: uuid('user_id').references(() => users.id), // 關聯到 users 表
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  expertise: text('expertise'), // 專長科目
  hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('manage_teachers_tenant_id_idx').on(table.tenantId),
}));

// 繳費記錄
export const managePayments = pgTable('manage_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  enrollmentId: uuid('enrollment_id').references(() => manageEnrollments.id).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 20 }), // cash, transfer, credit
  paidAt: timestamp('paid_at'),
  status: varchar('status', { length: 20 }).default('pending'), // pending, paid, overdue
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('manage_payments_tenant_id_idx').on(table.tenantId),
  tenantStatusIdx: index('manage_payments_tenant_status_idx').on(table.tenantId, table.status),
}));

// 系統設定（每個 tenant 一筆）
export const manageSettings = pgTable('manage_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().unique(),
  settings: jsonb('settings').notNull().default({}),
  updatedAt: timestamp('updated_at').defaultNow(),
  updatedBy: uuid('updated_by'),
}, (table) => ({
  tenantIdx: uniqueIndex('manage_settings_tenant_id_idx').on(table.tenantId),
}));

// 招生線索（Leads）
export const manageLeads = pgTable('manage_leads', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  studentName: varchar('student_name', { length: 100 }).notNull(),
  studentGrade: varchar('student_grade', { length: 50 }),
  interestSubjects: varchar('interest_subjects', { length: 200 }),
  status: varchar('status', { length: 20 }).default('new').notNull(), // new, contacted, trial_scheduled, trial_completed, enrolled, lost
  followUpDate: timestamp('follow_up_date'),
  trialDate: timestamp('trial_date'),
  trialTime: varchar('trial_time', { length: 100 }),
  assignedTo: uuid('assigned_to'),
  notes: text('notes'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('manage_leads_tenant_id_idx').on(table.tenantId),
  tenantStatusIdx: index('manage_leads_tenant_status_idx').on(table.tenantId, table.status),
}));

// AI 對話記錄
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  branchId: uuid('branch_id').references(() => branches.id),
  userId: uuid('user_id').references(() => users.id),
  channel: varchar('channel', { length: 20 }).notNull().default('web'),
  intent: varchar('intent', { length: 30 }),
  query: text('query').notNull(),
  answer: text('answer').notNull(),
  model: text('model'),
  latencyMs: integer('latency_ms'),
  tokensUsed: integer('tokens_used'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index('conversations_tenant_id_idx').on(table.tenantId),
  branchIdx: index('conversations_branch_id_idx').on(table.branchId),
  createdAtIdx: index('conversations_created_at_idx').on(table.createdAt),
}));
