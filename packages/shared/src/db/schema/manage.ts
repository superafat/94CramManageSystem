// 94Manage Schema - 學員管理專屬表
import { pgTable, uuid, varchar, text, timestamp, boolean, integer, decimal, jsonb, uniqueIndex, index, date } from '../connection';
import { tenants, users, branches } from './common';

// 課程
export const manageCourses = pgTable('manage_courses', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 100 }),
  grade: varchar('grade', { length: 20 }), // 國一, 高一...
  courseType: varchar('course_type', { length: 20 }).default('group'), // group=團班, individual=個指, daycare=安親
  price: decimal('price', { precision: 10, scale: 2 }),
  feeMonthly: decimal('fee_monthly', { precision: 10, scale: 2 }),
  feeQuarterly: decimal('fee_quarterly', { precision: 10, scale: 2 }),
  feeSemester: decimal('fee_semester', { precision: 10, scale: 2 }),
  feeYearly: decimal('fee_yearly', { precision: 10, scale: 2 }),
  feePerSession: decimal('fee_per_session', { precision: 10, scale: 2 }), // 個指單堂費用
  hours: integer('hours'), // 總時數
  maxStudents: integer('max_students'), // 個指通常 1-3 人
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
  // --- 身分與薪資 ---
  teacherRole: varchar('teacher_role', { length: 20 }), // 主任/行政/助教/跑課老師
  salaryType: varchar('salary_type', { length: 20 }).default('per_class'), // monthly/hourly/per_class
  baseSalary: decimal('base_salary', { precision: 10, scale: 2 }), // 正職底薪（月薪制用）
  // --- 個人資料 ---
  idNumber: varchar('id_number', { length: 10 }),
  birthday: date('birthday'),
  address: text('address'),
  emergencyContact: varchar('emergency_contact', { length: 50 }),
  emergencyPhone: varchar('emergency_phone', { length: 20 }),
  // --- 匯款資訊 ---
  bankName: varchar('bank_name', { length: 50 }),
  bankBranch: varchar('bank_branch', { length: 50 }),
  bankAccount: varchar('bank_account', { length: 20 }),
  bankAccountName: varchar('bank_account_name', { length: 50 }),
  // --- 教授能力 ---
  subjects: text('subjects').array(),
  gradeLevels: text('grade_levels').array(),
  // ---
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

// 薪資調整（獎金/扣薪）
export const manageSalaryAdjustments = pgTable('manage_salary_adjustments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  teacherId: uuid('teacher_id').references(() => manageTeachers.id).notNull(),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  type: varchar('type', { length: 20 }).notNull(), // bonus / deduction
  name: varchar('name', { length: 100 }).notNull(), // 全勤獎金、遲到扣薪...
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  autoGenerated: boolean('auto_generated').default(false),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('manage_salary_adj_tenant_idx').on(table.tenantId),
  teacherIdx: index('manage_salary_adj_teacher_idx').on(table.teacherId),
}));

// 支出管理
export const manageExpenses = pgTable('manage_expenses', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  branchId: uuid('branch_id').references(() => branches.id),
  name: varchar('name', { length: 100 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(), // 內務、水電、教材、其他...
  expenseDate: date('expense_date').notNull(),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('manage_expenses_tenant_idx').on(table.tenantId),
  categoryIdx: index('manage_expenses_category_idx').on(table.tenantId, table.category),
}));

// 師資出缺勤
export const manageTeacherAttendance = pgTable('manage_teacher_attendance', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  teacherId: uuid('teacher_id').references(() => manageTeachers.id).notNull(),
  date: date('date').notNull(),
  status: varchar('status', { length: 20 }).default('present').notNull(), // present, absent, late, leave, substitute
  checkInTime: varchar('check_in_time', { length: 10 }), // HH:MM
  checkOutTime: varchar('check_out_time', { length: 10 }),
  leaveType: varchar('leave_type', { length: 20 }), // sick, personal, annual, other
  leaveReason: text('leave_reason'),
  substituteTeacherId: uuid('substitute_teacher_id').references(() => manageTeachers.id),
  approved: boolean('approved').default(false),
  approvedBy: uuid('approved_by').references(() => users.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('manage_teacher_att_tenant_idx').on(table.tenantId),
  teacherIdx: index('manage_teacher_att_teacher_idx').on(table.teacherId),
  dateIdx: index('manage_teacher_att_date_idx').on(table.tenantId, table.date),
}));

// 電子聯絡簿訊息（進度/作業/小叮嚀/照片/家長反饋）
export const manageContactMessages = pgTable('manage_contact_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  courseId: uuid('course_id').references(() => manageCourses.id),
  studentId: uuid('student_id').references(() => manageStudents.id),
  teacherId: uuid('teacher_id').references(() => manageTeachers.id),
  parentUserId: uuid('parent_user_id').references(() => users.id), // 家長回覆用
  type: varchar('type', { length: 20 }).notNull(), // progress, homework, tip, photo, feedback
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content').notNull(),
  attachments: jsonb('attachments').default([]), // [{url, name, type}]
  isFromParent: boolean('is_from_parent').default(false),
  readByParent: boolean('read_by_parent').default(false),
  readAt: timestamp('read_at'),
  // 家長反饋：五星評分
  rating: integer('rating'), // 1-5 星
  ratingComment: text('rating_comment'), // 評分說明
  // 小叮嚀帶入成績
  examScores: jsonb('exam_scores'), // [{subject, score, fullScore}]
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('manage_contact_msg_tenant_idx').on(table.tenantId),
  studentIdx: index('manage_contact_msg_student_idx').on(table.studentId),
  courseIdx: index('manage_contact_msg_course_idx').on(table.courseId),
  typeIdx: index('manage_contact_msg_type_idx').on(table.tenantId, table.type),
}));

// 學生請假紀錄
export const manageStudentLeaves = pgTable('manage_student_leaves', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  studentId: uuid('student_id').references(() => manageStudents.id).notNull(),
  courseId: uuid('course_id').references(() => manageCourses.id),
  leaveDate: date('leave_date').notNull(),
  leaveType: varchar('leave_type', { length: 20 }).notNull(), // sick, personal, family, other
  reason: text('reason'),
  parentNotified: boolean('parent_notified').default(false),
  notifiedAt: timestamp('notified_at'),
  approvedBy: uuid('approved_by').references(() => users.id),
  status: varchar('status', { length: 20 }).default('pending'), // pending, approved, rejected
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('manage_student_leave_tenant_idx').on(table.tenantId),
  studentIdx: index('manage_student_leave_student_idx').on(table.studentId),
  dateIdx: index('manage_student_leave_date_idx').on(table.tenantId, table.leaveDate),
}));

// 電子聯絡簿 v2 - 班級模板（每堂課每日一筆）
export const manageContactBookTemplates = pgTable('manage_contact_book_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  courseId: uuid('course_id').references(() => manageCourses.id).notNull(),
  entryDate: date('entry_date').notNull(),
  groupProgress: text('group_progress'),
  groupHomework: text('group_homework'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueTenantCourseDate: uniqueIndex('manage_cb_templates_tenant_course_date_idx').on(table.tenantId, table.courseId, table.entryDate),
}));

// 電子聯絡簿 v2 - 主表（每日每生一筆）
export const manageContactBookEntries = pgTable('manage_contact_book_entries', {
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
  tenantCourseDate: index('manage_cb_entries_tenant_course_date_idx').on(table.tenantId, table.courseId, table.entryDate),
  uniqueTenantStudentDate: uniqueIndex('manage_cb_entries_tenant_student_date_idx').on(table.tenantId, table.studentId, table.entryDate),
}));

// 電子聯絡簿 v2 - 成績子表
export const manageContactBookScores = pgTable('manage_contact_book_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryId: uuid('entry_id').references(() => manageContactBookEntries.id, { onDelete: 'cascade' }).notNull(),
  subject: varchar('subject', { length: 100 }).notNull(),
  score: decimal('score', { precision: 10, scale: 2 }).notNull(),
  classAvg: decimal('class_avg', { precision: 10, scale: 2 }),
  fullScore: decimal('full_score', { precision: 10, scale: 2 }).default('100'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 電子聯絡簿 v2 - 照片子表
export const manageContactBookPhotos = pgTable('manage_contact_book_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryId: uuid('entry_id').references(() => manageContactBookEntries.id, { onDelete: 'cascade' }).notNull(),
  url: text('url').notNull(),
  caption: varchar('caption', { length: 200 }),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// 電子聯絡簿 v2 - 家長反饋子表
export const manageContactBookFeedback = pgTable('manage_contact_book_feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryId: uuid('entry_id').references(() => manageContactBookEntries.id, { onDelete: 'cascade' }).notNull(),
  parentUserId: uuid('parent_user_id').references(() => users.id).notNull(),
  rating: integer('rating'), // 1-5
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 電子聯絡簿 v2 - AI 分析子表
export const manageContactBookAiAnalysis = pgTable('manage_contact_book_ai_analysis', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryId: uuid('entry_id').references(() => manageContactBookEntries.id, { onDelete: 'cascade' }).notNull(),
  weaknessSummary: text('weakness_summary'),
  recommendedCourseName: varchar('recommended_course_name', { length: 200 }),
  recommendedCourseDesc: text('recommended_course_desc'),
  rawResponse: jsonb('raw_response'),
  createdAt: timestamp('created_at').defaultNow(),
});

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
