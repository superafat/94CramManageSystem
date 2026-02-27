import { pgTable, text, timestamp, uuid, jsonb, integer, varchar, boolean, index, pgEnum } from 'drizzle-orm/pg-core'

// ===== Multi-tenant Core =====

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  plan: varchar('plan', { length: 20 }).notNull().default('free'), // free | basic | pro | enterprise
  // Trial system fields
  trialStatus: varchar('trial_status', { length: 20 }).default('none'), // none | pending | approved | rejected | expired
  trialStartAt: timestamp('trial_start_at'),
  trialEndAt: timestamp('trial_end_at'),
  trialApprovedBy: uuid('trial_approved_by'),  // references users.id after users is defined
  trialApprovedAt: timestamp('trial_approved_at'),
  trialNotes: text('trial_notes'),
  // End trial system
  settings: jsonb('settings').default({}),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ===== Business Tables (all with tenant_id) =====

export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  name: text('name').notNull(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  settings: jsonb('settings').default({}),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('idx_branches_tenant').on(table.tenantId),
}))

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  branchId: uuid('branch_id').references(() => branches.id),
  firebaseUid: text('firebase_uid').unique(),
  telegramId: text('telegram_id'),
  lineUserId: text('line_user_id'),
  role: varchar('role', { length: 20 }).notNull().default('parent'),
  name: text('name').notNull(),
  phone: varchar('phone', { length: 20 }),
  email: text('email'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('idx_users_tenant').on(table.tenantId),
  telegramIdx: index('idx_users_telegram').on(table.telegramId),
  lineIdx: index('idx_users_line').on(table.lineUserId),
  firebaseIdx: index('idx_users_firebase').on(table.firebaseUid),
}))

export const userPermissions = pgTable('user_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  userId: uuid('user_id').references(() => users.id),
  permission: varchar('permission', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('idx_user_permissions_tenant').on(table.tenantId),
  userIdx: index('idx_user_permissions_user').on(table.userId),
}))

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  branchId: uuid('branch_id').references(() => branches.id).notNull(),
  userId: uuid('user_id').references(() => users.id),
  channel: varchar('channel', { length: 20 }).notNull(),
  intent: varchar('intent', { length: 30 }),
  query: text('query').notNull(),
  answer: text('answer').notNull(),
  model: text('model'),
  latencyMs: integer('latency_ms'),
  tokensUsed: integer('tokens_used'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('idx_conversations_tenant').on(table.tenantId),
  branchIdx: index('idx_conversations_branch').on(table.branchId),
  createdIdx: index('idx_conversations_created').on(table.createdAt),
}))

export const knowledgeChunks = pgTable('knowledge_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  branchId: uuid('branch_id').references(() => branches.id).notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').default({}),
  // embedding vector(768) — handled via raw SQL
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('idx_chunks_tenant').on(table.tenantId),
  branchIdx: index('idx_chunks_branch').on(table.branchId),
}))

// ===== Notification System =====

// Enums
export const notificationTypeEnum = pgEnum('notification_type', [
  'schedule_change',
  'billing_reminder',
  'attendance_alert',
  'grade_notification'
])

export const notificationChannelEnum = pgEnum('notification_channel', [
  'telegram',
  'line',
  'email'
])

export const notificationStatusEnum = pgEnum('notification_status', [
  'pending',
  'sent',
  'failed',
  'skipped'
])

// Notifications table
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  type: notificationTypeEnum('type').notNull(),
  recipientId: uuid('recipient_id').notNull().references(() => users.id),
  studentId: uuid('student_id').references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  channel: notificationChannelEnum('channel').notNull(),
  status: notificationStatusEnum('status').notNull().default('pending'),
  metadata: jsonb('metadata').default({}),
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantCreatedIdx: index('idx_notifications_tenant_created').on(table.tenantId, table.createdAt),
  recipientIdx: index('idx_notifications_recipient').on(table.recipientId),
  studentIdx: index('idx_notifications_student').on(table.studentId),
  statusIdx: index('idx_notifications_status').on(table.status),
}))

// Notification preferences table
export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  type: notificationTypeEnum('type').notNull(),
  channel: notificationChannelEnum('channel').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_notification_preferences_user').on(table.userId),
  uniqueUserTypeChannel: index('idx_notification_preferences_unique').on(table.userId, table.type, table.channel),
}))

// ===== Enrollment Leads =====
export const manageLeads = pgTable('manage_leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  name: text('name').notNull(),
  phone: varchar('phone', { length: 20 }),
  studentName: text('student_name').notNull(),
  studentGrade: varchar('student_grade', { length: 50 }),
  interestSubjects: varchar('interest_subjects', { length: 200 }),
  status: varchar('status', { length: 20 }).notNull().default('new'),
  followUpDate: timestamp('follow_up_date'),
  trialDate: timestamp('trial_date'),
  trialTime: varchar('trial_time', { length: 100 }),
  assignedTo: uuid('assigned_to').references(() => users.id),
  notes: text('notes'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('manage_leads_tenant_id_idx').on(table.tenantId),
  tenantStatusIdx: index('manage_leads_tenant_status_idx').on(table.tenantId, table.status),
}))

// ===== Type Exports =====
export type NotificationType = typeof notificationTypeEnum.enumValues[number]
export type NotificationChannel = typeof notificationChannelEnum.enumValues[number]
export type NotificationStatus = typeof notificationStatusEnum.enumValues[number]

export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
export type NotificationPreference = typeof notificationPreferences.$inferSelect
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert
