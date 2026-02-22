// Drizzle ORM Schema 定義
// 此檔案定義 RBAC 相關的資料表結構

import {
  pgTable,
  serial,
  varchar,
  timestamp,
  integer,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// ==================== Users 表（擴充版） ====================
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    tenant_id: varchar('tenant_id', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    password: varchar('password', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    // 新增 role 欄位
    role: varchar('role', { length: 20 }).notNull().default('parent'),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // 複合唯一索引：tenant + email
    uniqueTenantEmail: uniqueIndex('unique_tenant_email').on(
      table.tenant_id,
      table.email
    ),
    // 索引：加速 role 查詢
    roleIdx: index('idx_users_role').on(table.role),
    // 索引：加速 tenant_id 查詢
    tenantIdx: index('idx_users_tenant_id').on(table.tenant_id),
  })
);

// ==================== User Permissions 表 ====================
export const userPermissions = pgTable(
  'user_permissions',
  {
    id: serial('id').primaryKey(),
    tenant_id: varchar('tenant_id', { length: 255 }).notNull(),
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    permission: varchar('permission', { length: 50 }).notNull(),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // 複合唯一索引：同一用戶不能重複擁有同一權限
    uniqueUserPermission: uniqueIndex('unique_user_permission').on(
      table.tenant_id,
      table.user_id,
      table.permission
    ),
    // 索引：加速按 user_id 查詢
    userIdx: index('idx_user_permissions_user_id').on(table.user_id),
    // 索引：加速按 tenant_id 查詢
    tenantIdx: index('idx_user_permissions_tenant_id').on(table.tenant_id),
    // 複合索引：加速 tenant + user 查詢
    tenantUserIdx: index('idx_user_permissions_tenant_user').on(
      table.tenant_id,
      table.user_id
    ),
  })
);

// ==================== TypeScript Types ====================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserPermission = typeof userPermissions.$inferSelect;
export type NewUserPermission = typeof userPermissions.$inferInsert;
