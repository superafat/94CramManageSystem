/**
 * Drizzle Kit Schema — 所有表合併
 * 用於 drizzle-kit push/generate，直接從 drizzle-orm/pg-core import
 */
import { pgTable, uuid, varchar, timestamp, boolean, text, integer, decimal, serial } from 'drizzle-orm/pg-core';

// ============================================================
// 共用表 (Common)
// ============================================================

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
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  branchId: uuid('branch_id').references(() => branches.id),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('staff'),
  permissions: text('permissions').array(),
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const userPermissions = pgTable('user_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  resource: varchar('resource', { length: 50 }).notNull(),
  action: varchar('action', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 50 }),
  resourceId: uuid('resource_id'),
  detail: text('detail'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================================
// 94Manage — 學員管理
// ============================================================

export const manageCourses = pgTable('manage_courses', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 100 }),
  grade: varchar('grade', { length: 20 }),
  price: decimal('price', { precision: 10, scale: 2 }),
  hours: integer('hours'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const manageStudents = pgTable('manage_students', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  grade: varchar('grade', { length: 20 }),
  school: varchar('school', { length: 255 }),
  guardianName: varchar('guardian_name', { length: 100 }),
  guardianPhone: varchar('guardian_phone', { length: 20 }),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const manageEnrollments = pgTable('manage_enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  studentId: uuid('student_id').references(() => manageStudents.id).notNull(),
  courseId: uuid('course_id').references(() => manageCourses.id).notNull(),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const manageTeachers = pgTable('manage_teachers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id'),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  expertise: text('expertise'),
  hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const managePayments = pgTable('manage_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  enrollmentId: uuid('enrollment_id').references(() => manageEnrollments.id).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 20 }),
  paidAt: timestamp('paid_at'),
  status: varchar('status', { length: 20 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================================
// 94inClass — 點名系統
// ============================================================

export const inclassAttendances = pgTable('inclass_attendances', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  studentId: uuid('student_id').notNull(),
  courseId: uuid('course_id').notNull(),
  date: timestamp('date').notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  checkInTime: timestamp('check_in_time'),
  checkInMethod: varchar('check_in_method', { length: 20 }),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const inclassExams = pgTable('inclass_exams', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  courseId: uuid('course_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  examDate: timestamp('exam_date').notNull(),
  totalScore: integer('total_score').default(100),
  createdAt: timestamp('created_at').defaultNow(),
});

export const inclassExamScores = pgTable('inclass_exam_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  examId: uuid('exam_id').references(() => inclassExams.id).notNull(),
  studentId: uuid('student_id').notNull(),
  score: integer('score').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const inclassNfcCards = pgTable('inclass_nfc_cards', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  cardUid: varchar('card_uid', { length: 100 }).notNull().unique(),
  studentId: uuid('student_id'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================================
// 94Stock — 庫存管理
// ============================================================

export const stockCategories = pgTable('stock_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  parentId: uuid('parent_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const stockItems = pgTable('stock_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  categoryId: uuid('category_id').references(() => stockCategories.id),
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 50 }).unique(),
  unit: varchar('unit', { length: 20 }).default('個'),
  minStock: integer('min_stock').default(10),
  price: decimal('price', { precision: 10, scale: 2 }),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const stockWarehouses = pgTable('stock_warehouses', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  address: text('address'),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const stockInventory = pgTable('stock_inventory', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  itemId: uuid('item_id').references(() => stockItems.id).notNull(),
  warehouseId: uuid('warehouse_id').references(() => stockWarehouses.id).notNull(),
  quantity: integer('quantity').default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const stockSuppliers = pgTable('stock_suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  contact: varchar('contact', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const stockPurchaseOrders = pgTable('stock_purchase_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  supplierId: uuid('supplier_id').references(() => stockSuppliers.id),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  status: varchar('status', { length: 20 }).default('pending'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }),
  orderDate: timestamp('order_date'),
  expectedDeliveryDate: timestamp('expected_delivery_date'),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const stockPurchaseItems = pgTable('stock_purchase_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => stockPurchaseOrders.id).notNull(),
  itemId: uuid('item_id').references(() => stockItems.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }),
  receivedQuantity: integer('received_quantity').default(0),
});

export const stockTransactions = pgTable('stock_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  itemId: uuid('item_id').references(() => stockItems.id).notNull(),
  warehouseId: uuid('warehouse_id').references(() => stockWarehouses.id).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  quantity: integer('quantity').notNull(),
  referenceId: uuid('reference_id'),
  note: text('note'),
  operatorId: uuid('operator_id'),
  createdAt: timestamp('created_at').defaultNow(),
});
