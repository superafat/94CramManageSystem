// 共用 Schema - tenants, users, branches, permissions
import { pgTable, serial, varchar, uuid, timestamp, boolean, text, jsonb, index, integer } from '../connection';

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  status: varchar('status', { length: 20 }).default('active'),
  settings: jsonb('settings').default({}),
  // Trial system fields
  trialStatus: varchar('trial_status', { length: 20 }).default('none'),
  trialStartAt: timestamp('trial_start_at'),
  trialEndAt: timestamp('trial_end_at'),
  trialApprovedBy: uuid('trial_approved_by'),
  trialApprovedAt: timestamp('trial_approved_at'),
  trialNotes: text('trial_notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const branches = pgTable('branches', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('branches_tenant_id_idx').on(table.tenantId),
}));

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  branchId: uuid('branch_id').references(() => branches.id),
  username: varchar('username', { length: 100 }).unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('staff'), // admin, teacher, staff, parent, student
  permissions: text('permissions').array(),
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('users_tenant_id_idx').on(table.tenantId),
}));

export const userPermissions = pgTable('user_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  resource: varchar('resource', { length: 50 }).notNull(), // manage, inclass, stock
  action: varchar('action', { length: 20 }).notNull(), // read, write, admin
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdx: index('user_permissions_user_id_idx').on(table.userId),
}));

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 50 }),
  resourceId: uuid('resource_id'),
  details: text('details'), // JSON string
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('audit_logs_tenant_id_idx').on(table.tenantId),
}));

// ===== Analytics =====
export const managePageViews = pgTable('manage_page_views', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id'),
  path: varchar('path', { length: 500 }).notNull(),
  referrer: varchar('referrer', { length: 1000 }),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  sessionId: varchar('session_id', { length: 100 }),
  deviceType: varchar('device_type', { length: 20 }),
  isBot: boolean('is_bot').default(false),
  botName: varchar('bot_name', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_page_views_created').on(table.createdAt),
  index('idx_page_views_path').on(table.path, table.createdAt),
  index('idx_page_views_bot').on(table.isBot, table.createdAt),
])

export const manageBotVisits = pgTable('manage_bot_visits', {
  id: uuid('id').defaultRandom().primaryKey(),
  botName: varchar('bot_name', { length: 100 }).notNull(),
  botCategory: varchar('bot_category', { length: 50 }).notNull(),
  path: varchar('path', { length: 500 }).notNull(),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  statusCode: integer('status_code'),
  responseTimeMs: integer('response_time_ms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_bot_visits_name').on(table.botName, table.createdAt),
  index('idx_bot_visits_category').on(table.botCategory, table.createdAt),
])
