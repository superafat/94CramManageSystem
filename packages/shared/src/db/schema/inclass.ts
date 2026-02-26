// 94inClass Schema - 點名系統專屬表
import { pgTable, uuid, varchar, timestamp, boolean, integer, text, decimal, index } from '../connection';
import { manageStudents, manageCourses, manageTeachers } from './manage';

// 點名記錄
export const inclassAttendances = pgTable('inclass_attendances', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  studentId: uuid('student_id').notNull(), // 對應 manage_students
  courseId: uuid('course_id').notNull(),
  date: timestamp('date').notNull(),
  status: varchar('status', { length: 20 }).notNull(), // present, absent, late, leave
  checkInTime: timestamp('check_in_time'),
  checkInMethod: varchar('check_in_method', { length: 20 }), // nfc, face, manual
  note: text('note'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('inclass_attendances_tenant_id_idx').on(table.tenantId),
  studentIdx: index('inclass_attendances_student_id_idx').on(table.studentId),
  dateIdx: index('inclass_attendances_date_idx').on(table.date),
}));

// 考試
export const inclassExams = pgTable('inclass_exams', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  courseId: uuid('course_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  examDate: timestamp('exam_date').notNull(),
  totalScore: integer('total_score').default(100),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('inclass_exams_tenant_id_idx').on(table.tenantId),
}));

// 考試成績
export const inclassExamScores = pgTable('inclass_exam_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  examId: uuid('exam_id').references(() => inclassExams.id).notNull(),
  studentId: uuid('student_id').notNull(),
  score: integer('score').notNull(),
  note: text('note'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  examIdx: index('inclass_exam_scores_exam_id_idx').on(table.examId),
}));

// 家長
export const inclassParents = pgTable('inclass_parents', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  studentId: uuid('student_id').references(() => manageStudents.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  lineUserId: varchar('line_user_id', { length: 255 }),
  relation: varchar('relation', { length: 50 }), // 父/母/祖父/監護人
  notifyEnabled: boolean('notify_enabled').default(true),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('inclass_parents_tenant_id_idx').on(table.tenantId),
}));

// 繳費記錄（inclass 專用，以學生+課程+期間為維度）
export const inclassPaymentRecords = pgTable('inclass_payment_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  studentId: uuid('student_id').references(() => manageStudents.id).notNull(),
  courseId: uuid('course_id').references(() => manageCourses.id).notNull(),
  paymentType: varchar('payment_type', { length: 20 }).notNull(), // monthly/quarterly/semester/yearly
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  periodMonth: varchar('period_month', { length: 7 }), // YYYY-MM
  paymentDate: timestamp('payment_date'),
  status: varchar('status', { length: 20 }).default('pending'), // pending/paid/overdue
  notes: text('notes'),
  createdBy: uuid('created_by'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('inclass_payment_records_tenant_id_idx').on(table.tenantId),
  studentIdx: index('inclass_payment_records_student_id_idx').on(table.studentId),
}));

// 課表
export const inclassSchedules = pgTable('inclass_schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  courseId: uuid('course_id').references(() => manageCourses.id).notNull(),
  teacherId: uuid('teacher_id').references(() => manageTeachers.id),
  dayOfWeek: integer('day_of_week').notNull(), // 0-6 (Sunday-Saturday)
  startTime: varchar('start_time', { length: 5 }).notNull(), // HH:MM
  endTime: varchar('end_time', { length: 5 }).notNull(), // HH:MM
  room: varchar('room', { length: 50 }),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('inclass_schedules_tenant_id_idx').on(table.tenantId),
}));

// NFC 卡
export const inclassNfcCards = pgTable('inclass_nfc_cards', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  cardUid: varchar('card_uid', { length: 100 }).notNull().unique(),
  studentId: uuid('student_id'),
  isActive: boolean('is_active').default(true),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('inclass_nfc_cards_tenant_id_idx').on(table.tenantId),
}));
