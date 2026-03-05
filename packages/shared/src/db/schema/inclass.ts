// 94inClass Schema - 點名系統專屬表
import { pgTable, uuid, varchar, timestamp, boolean, integer, text, decimal, index, jsonb, uniqueIndex, date } from '../connection';
import { manageStudents, manageCourses, manageTeachers } from './manage';
import { tenants, users } from './common';

// 點名記錄
export const inclassAttendances = pgTable('inclass_attendances', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  studentId: uuid('student_id').notNull(), // 對應 manage_students
  courseId: uuid('course_id').notNull(),
  date: timestamp('date').notNull(),
  status: varchar('status', { length: 20 }).notNull(), // present, absent, late, leave
  checkInTime: timestamp('check_in_time'),
  checkInMethod: varchar('check_in_method', { length: 20 }), // nfc, face, manual
  checkOutTime: timestamp('check_out_time'),
  note: text('note'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('inclass_attendances_tenant_id_idx').on(table.tenantId),
  studentIdx: index('inclass_attendances_student_id_idx').on(table.studentId),
  dateIdx: index('inclass_attendances_date_idx').on(table.date),
  tenantCourseDateIdx: index('inclass_attendances_tenant_course_date_idx').on(table.tenantId, table.courseId, table.date),
}));

// 考試
export const inclassExams = pgTable('inclass_exams', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
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
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
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
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
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
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
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
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  cardUid: varchar('card_uid', { length: 100 }).notNull().unique(),
  studentId: uuid('student_id'),
  isActive: boolean('is_active').default(true),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('inclass_nfc_cards_tenant_id_idx').on(table.tenantId),
}));

// 人臉建檔（刷臉點名用）
export const inclassFaceEnrollments = pgTable('inclass_face_enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  studentId: uuid('student_id').references(() => manageStudents.id).notNull(),
  embedding: jsonb('embedding').notNull(), // number[] - 128 維向量
  enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('inclass_face_enrollments_tenant_id_idx').on(table.tenantId),
  studentIdx: index('inclass_face_enrollments_student_id_idx').on(table.studentId),
  tenantStudentIdx: index('inclass_face_enrollments_tenant_student_idx').on(table.tenantId, table.studentId),
  tenantStudentUnique: uniqueIndex('inclass_face_enrollments_tenant_student_unique_idx').on(table.tenantId, table.studentId),
}));

// 電子聯絡簿 v2 - 班級模板（每堂課每日一筆）
export const inclassContactBookTemplates = pgTable('inclass_contact_book_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  courseId: uuid('course_id').references(() => manageCourses.id).notNull(),
  entryDate: date('entry_date').notNull(),
  groupProgress: text('group_progress'),
  groupHomework: text('group_homework'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueTenantCourseDate: uniqueIndex('inclass_cb_templates_tenant_course_date_idx').on(table.tenantId, table.courseId, table.entryDate),
}));

// 電子聯絡簿 v2 - 主表（每日每生一筆）
export const inclassContactBookEntries = pgTable('inclass_contact_book_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  studentId: uuid('student_id').references(() => manageStudents.id).notNull(),
  teacherId: uuid('teacher_id').references(() => manageTeachers.id),
  courseId: uuid('course_id').references(() => manageCourses.id).notNull(),
  entryDate: date('entry_date').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('draft'), // draft/sent/read
  groupProgress: text('group_progress'),
  groupHomework: text('group_homework'),
  individualNote: text('individual_note'),
  individualHomework: text('individual_homework'),
  teacherTip: text('teacher_tip'),
  sentAt: timestamp('sent_at'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantCourseDate: index('inclass_cb_entries_tenant_course_date_idx').on(table.tenantId, table.courseId, table.entryDate),
  uniqueTenantStudentDate: uniqueIndex('inclass_cb_entries_tenant_student_date_idx').on(table.tenantId, table.studentId, table.entryDate),
}));

// 電子聯絡簿 v2 - 成績子表
export const inclassContactBookScores = pgTable('inclass_contact_book_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryId: uuid('entry_id').references(() => inclassContactBookEntries.id, { onDelete: 'cascade' }).notNull(),
  subject: varchar('subject', { length: 100 }).notNull(),
  score: decimal('score', { precision: 10, scale: 2 }).notNull(),
  classAvg: decimal('class_avg', { precision: 10, scale: 2 }),
  fullScore: decimal('full_score', { precision: 10, scale: 2 }).default('100'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 電子聯絡簿 v2 - 照片子表
export const inclassContactBookPhotos = pgTable('inclass_contact_book_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryId: uuid('entry_id').references(() => inclassContactBookEntries.id, { onDelete: 'cascade' }).notNull(),
  url: text('url').notNull(),
  caption: varchar('caption', { length: 200 }),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// 電子聯絡簿 v2 - 家長反饋子表
export const inclassContactBookFeedback = pgTable('inclass_contact_book_feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryId: uuid('entry_id').references(() => inclassContactBookEntries.id, { onDelete: 'cascade' }).notNull(),
  parentUserId: uuid('parent_user_id').references(() => users.id).notNull(),
  rating: integer('rating'), // 1-5
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 電子聯絡簿 v2 - AI 分析子表
export const inclassContactBookAiAnalysis = pgTable('inclass_contact_book_ai_analysis', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryId: uuid('entry_id').references(() => inclassContactBookEntries.id, { onDelete: 'cascade' }).notNull(),
  weaknessSummary: text('weakness_summary'),
  recommendedCourseName: varchar('recommended_course_name', { length: 200 }),
  recommendedCourseDesc: text('recommended_course_desc'),
  rawResponse: jsonb('raw_response'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 補課時段
export const inclassMakeupSlots = pgTable('inclass_makeup_slots', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  subject: varchar('subject', { length: 100 }).notNull(),
  makeupDate: date('makeup_date').notNull(),
  startTime: varchar('start_time', { length: 10 }).notNull(),
  endTime: varchar('end_time', { length: 10 }).notNull(),
  teacherId: uuid('teacher_id').references(() => manageTeachers.id),
  room: varchar('room', { length: 50 }),
  maxStudents: integer('max_students').default(10),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('idx_inclass_makeup_slots_tenant').on(table.tenantId),
  dateIdx: index('idx_inclass_makeup_slots_date').on(table.tenantId, table.makeupDate),
}));

// 補課管理
export const inclassMakeupClasses = pgTable('inclass_makeup_classes', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  studentId: uuid('student_id').references(() => manageStudents.id).notNull(),
  originalDate: date('original_date').notNull(),
  originalCourseId: uuid('original_course_id'),
  originalCourseName: varchar('original_course_name', { length: 100 }),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending/scheduled/completed/cancelled
  makeupDate: date('makeup_date'),
  makeupTime: varchar('makeup_time', { length: 10 }), // HH:MM
  makeupEndTime: varchar('makeup_end_time', { length: 10 }),
  makeupTeacherId: uuid('makeup_teacher_id').references(() => manageTeachers.id),
  makeupRoom: varchar('makeup_room', { length: 50 }),
  slotId: uuid('slot_id').references(() => inclassMakeupSlots.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('inclass_makeup_classes_tenant_idx').on(table.tenantId),
  studentIdx: index('inclass_makeup_classes_student_idx').on(table.studentId),
  statusIdx: index('inclass_makeup_classes_status_idx').on(table.tenantId, table.status),
}));
