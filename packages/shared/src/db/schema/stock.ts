// 94Stock Schema - 庫存管理專屬表
import { pgTable, uuid, varchar, timestamp, boolean, integer, decimal, text } from '../connection';

// 庫存分類
export const stockCategories = pgTable('stock_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  parentId: uuid('parent_id'), // 階層分類
  createdAt: timestamp('created_at').defaultNow(),
});

// 庫存項目
export const stockItems = pgTable('stock_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  categoryId: uuid('category_id').references(() => stockCategories.id),
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 50 }).unique(),
  unit: varchar('unit', { length: 20 }).default('個'), // 個, 本, 盒
  minStock: integer('min_stock').default(10), // 最低庫存提醒
  price: decimal('price', { precision: 10, scale: 2 }),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 倉庫
export const stockWarehouses = pgTable('stock_warehouses', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  address: text('address'),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// 庫存（各倉庫各項目的數量）
export const stockInventory = pgTable('stock_inventory', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  itemId: uuid('item_id').references(() => stockItems.id).notNull(),
  warehouseId: uuid('warehouse_id').references(() => stockWarehouses.id).notNull(),
  quantity: integer('quantity').default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 供應商
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

// 採購單
export const stockPurchaseOrders = pgTable('stock_purchase_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  supplierId: uuid('supplier_id').references(() => stockSuppliers.id),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  status: varchar('status', { length: 20 }).default('pending'), // pending, ordered, received, cancelled
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }),
  orderDate: timestamp('order_date'),
  expectedDeliveryDate: timestamp('expected_delivery_date'),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 採購項目
export const stockPurchaseItems = pgTable('stock_purchase_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => stockPurchaseOrders.id).notNull(),
  itemId: uuid('item_id').references(() => stockItems.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }),
  receivedQuantity: integer('received_quantity').default(0),
});

// 庫存異動記錄
export const stockTransactions = pgTable('stock_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  itemId: uuid('item_id').references(() => stockItems.id).notNull(),
  warehouseId: uuid('warehouse_id').references(() => stockWarehouses.id).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // in, out, adjust
  quantity: integer('quantity').notNull(), // 正數=入庫, 負數=出庫
  referenceId: uuid('reference_id'), // 關聯到 purchase order 或其他
  note: text('note'),
  operatorId: uuid('operator_id'), // 操作人
  createdAt: timestamp('created_at').defaultNow(),
});
