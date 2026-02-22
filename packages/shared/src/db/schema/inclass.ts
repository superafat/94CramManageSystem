// 94inClass Schema - 點名系統專屬表
import { pgTable, uuid, varchar, timestamp, boolean, integer, text } from '../connection';

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
  createdAt: timestamp('created_at').defaultNow(),
});

// 考試
export const inclassExams = pgTable('inclass_exams', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  courseId: uuid('course_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  examDate: timestamp('exam_date').notNull(),
  totalScore: integer('total_score').default(100),
  createdAt: timestamp('created_at').defaultNow(),
});

// 考試成績
export const inclassExamScores = pgTable('inclass_exam_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  examId: uuid('exam_id').references(() => inclassExams.id).notNull(),
  studentId: uuid('student_id').notNull(),
  score: integer('score').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow(),
});

// NFC 卡
export const inclassNfcCards = pgTable('inclass_nfc_cards', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  cardUid: varchar('card_uid', { length: 100 }).notNull().unique(),
  studentId: uuid('student_id'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});
