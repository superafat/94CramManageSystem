// 共用 Schema - tenants, users, branches, permissions
import { pgTable, serial, varchar, uuid, timestamp, boolean, text, index } from '../connection';

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
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
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('staff'), // admin, teacher, staff, parent, student
  permissions: text('permissions').array(),
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
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
